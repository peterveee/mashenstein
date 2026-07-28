// The effect catalogue the desk can put on a channel or a send.
//
// Everything here is a Tone.js effect that has been VERIFIED to render in an
// OfflineAudioContext, because a WAV, stem or video is produced by rendering the
// engine offline (tools/lib/render-bank-browser.js). An effect that works in the
// browser but renders silent would sound right while you mix it and then vanish
// from everything you export — the worst kind of bug, because nothing errors.
//
// Measured silent offline, and therefore deliberately absent:
//   BitCrusher, JCReverb, Freeverb
// All three are built on AudioWorklet, which also needs a secure context — so they
// would fail the render pipeline and the LAN dev server on a phone as well.
// If Tone ever fixes them, re-run the sweep before adding them back.
import * as Tone from 'tone';

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
  pan: { min: -1, max: 1, step: 0.02 },
  tone: { min: 400, max: 12000, step: 100, unit: 'Hz', log: true },
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
  width: { min: 0, max: 1, step: 0.01 },
  pitch: { min: -24, max: 24, step: 1, unit: 'st' },
  windowSize: { min: 0.01, max: 0.2, step: 0.005, unit: 's' },
  decay: { min: 0.1, max: 10, step: 0.1, unit: 's' },
  preDelay: { min: 0, max: 0.2, step: 0.002, unit: 's' },
  Q: { min: 0.1, max: 20, step: 0.1 },
  // A list, not a range: the desk draws a dropdown for anything with options.
  type: { options: ['lowpass', 'highpass', 'bandpass', 'notch'] },
  threshold: { min: -60, max: 0, step: 0.5, unit: 'dB' },
  ratio: { min: 1, max: 20, step: 0.5 },
  attack: { min: 0.001, max: 1, step: 0.001, unit: 's' },
  release: { min: 0.01, max: 2, step: 0.01, unit: 's' },
  knee: { min: 0, max: 40, step: 1, unit: 'dB' },
  // The multiband's crossovers. Named in full because they are the effect's own
  // properties, unlike its bands, which are reached as `low.threshold` and friends.
  lowFrequency: { min: 40, max: 1000, step: 10, unit: 'Hz', log: true },
  highFrequency: { min: 500, max: 8000, step: 50, unit: 'Hz', log: true },
  spread: { min: 0, max: 360, step: 5 },
  sensitivity: { min: -40, max: 0, step: 1, unit: 'dB' },
  gain: { min: -24, max: 24, step: 0.5, unit: 'dB' },
  f1: { min: 20, max: 500, step: 5, unit: 'Hz', log: true },
  f2: { min: 80, max: 2000, step: 10, unit: 'Hz', log: true },
  f3: { min: 400, max: 8000, step: 20, unit: 'Hz', log: true },
  f4: { min: 2000, max: 16000, step: 100, unit: 'Hz', log: true },
  g1: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  g2: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  g3: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  g4: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  q2: { min: 0.2, max: 10, step: 0.1 },
  q3: { min: 0.2, max: 10, step: 0.1 },
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
 * song's bpm, and a pan on the WET leg alone, so the source can sit left and its
 * repeats right. A Tone delay mixes wet and dry internally, which makes that
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

/**
 * A four-band parametric EQ. Tone has no such component — Tone.Filter is one band
 * and Tone.EQ3 is a fixed crossover — and the channel strip's own EQ is pinned at
 * 250/1200/4000Hz, so this is the one to reach for when a specific frequency is the
 * problem. Native biquads, and exactly transparent with every band at 0dB.
 *
 * Band 1 is a low shelf, bands 2 and 3 are peaks, band 4 is a high shelf: the usual
 * console layout, and the one that covers the most ground with the fewest controls.
 */
function makeParametricEq(ctx, params) {
  const shape = [
    { type: 'lowshelf', f: 120 },
    { type: 'peaking', f: 500 },
    { type: 'peaking', f: 2000 },
    { type: 'highshelf', f: 6000 },
  ];
  const bands = shape.map((b) => {
    const n = ctx.createBiquadFilter();
    n.type = b.type; n.frequency.value = b.f; n.gain.value = 0; n.Q.value = 1;
    return n;
  });
  for (let i = 0; i < bands.length - 1; i++) bands[i].connect(bands[i + 1]);

  const state = {};
  shape.forEach((b, i) => {
    state[`f${i + 1}`] = b.f; state[`g${i + 1}`] = 0; state[`q${i + 1}`] = 1;
  });
  Object.assign(state, params);

  const node = { input: bands[0], output: bands[bands.length - 1], _custom: true };
  node.applyState = () => {
    const t = ctx.currentTime;
    bands.forEach((n, i) => {
      n.frequency.setTargetAtTime(Math.max(20, Math.min(18000, state[`f${i + 1}`])), t, 0.02);
      n.gain.setTargetAtTime(state[`g${i + 1}`], t, 0.02);
      // Shelves ignore Q in the peaking sense; leave theirs alone.
      if (n.type === 'peaking') n.Q.setTargetAtTime(Math.max(0.1, state[`q${i + 1}`]), t, 0.02);
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
 * Plain gain. Some lanes are authored very quiet — organ sits at 0.009 against the
 * bass at 0.1 — and the channel fader tops out at +6dB, which is not always enough
 * to bring one up to where it can be balanced at all. This has ±24dB of range and
 * can sit anywhere in the chain, so it doubles as a trim before a distortion or a
 * make-up gain after a compressor.
 */
function makeGain(ctx, params) {
  const node = ctx.createGain();
  const state = { gain: 0, ...params };
  const apply = () => { node.gain.setTargetAtTime(10 ** (state.gain / 20), ctx.currentTime, 0.02); };
  apply();
  return {
    input: node, output: node, _custom: true,
    applyState: apply,
    setState: (patch) => { Object.assign(state, patch); apply(); },
    connect: (dest) => (dest && dest.input ? node.connect(dest.input) : node.connect(dest)),
    disconnect: () => { try { node.disconnect(); } catch { /* fine */ } },
    dispose: () => { try { node.disconnect(); } catch { /* fine */ } },
  };
}

export const EFFECTS = [
  { id: 'gain', name: 'Gain', cost: 0.02, custom: makeGain,
    params: ['gain'], defaults: { gain: 0 } },
  // `short` is what an insert slot shows: a 118px strip cannot hold "Multiband
  // Compressor", and a name cut off mid-word is worse than an abbreviation someone
  // chose. The full name stays everywhere there is room for it.
  { id: 'peq', name: 'Parametric EQ', short: 'Param EQ', cost: 0.15, custom: makeParametricEq,
    params: ['f1', 'g1', 'f2', 'g2', 'q2', 'f3', 'g3', 'q3', 'f4', 'g4'],
    defaults: { f1: 120, g1: 0, f2: 500, g2: 0, q2: 1, f3: 2000, g3: 0, q3: 1, f4: 6000, g4: 0 } },
  { id: 'chandelay', name: 'Advanced Delay', short: 'Adv. Delay', cost: 0.15, custom: makeChannelDelay, timed: true,
    params: ['sync', 'division', 'delayMs', 'feedback', 'tone', 'pan', 'mix'],
    defaults: { sync: 1, division: 0.5, delayMs: 250, feedback: 0.3, tone: 4000, pan: 0, mix: 0.35 } },
  { id: 'pingpong', name: 'Ping-Pong Delay', short: 'Ping-Pong', cost: 0.19, tone: 'PingPongDelay', timed: true,
    params: ['sync', 'division', 'delayMs', 'feedback', 'wet'],
    defaults: { sync: 1, division: 0.5, delayMs: 250, feedback: 0.3, wet: 0.35 } },
  { id: 'delay', name: 'Delay', cost: 0.09, tone: 'FeedbackDelay', timed: true,
    params: ['sync', 'division', 'delayMs', 'feedback', 'wet'],
    defaults: { sync: 1, division: 0.5, delayMs: 250, feedback: 0.3, wet: 0.35 } },
  { id: 'chorus', name: 'Chorus', cost: 0.28, tone: 'Chorus',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'wet'], defaults: { rateSync: 0, rateDivision: 1, frequency: 1.5, depth: 0.7, wet: 0.5 } },
  { id: 'phaser', name: 'Phaser', cost: 2.06, tone: 'Phaser',
    params: ['rateSync', 'rateDivision', 'frequency', 'octaves', 'baseFrequency', 'wet'], defaults: { rateSync: 0, rateDivision: 4, frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 } },
  { id: 'tremolo', name: 'Tremolo', cost: 0.45, tone: 'Tremolo',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'spread', 'wet'], defaults: { rateSync: 0, rateDivision: 0.5, frequency: 9, depth: 0.7, spread: 180, wet: 1 }, start: true },
  { id: 'vibrato', name: 'Vibrato', cost: 0.25, tone: 'Vibrato',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'wet'], defaults: { rateSync: 0, rateDivision: 1, frequency: 5, depth: 0.1, wet: 1 } },
  { id: 'autofilter', name: 'Auto Filter', cost: 0.4, tone: 'AutoFilter',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'baseFrequency', 'octaves', 'wet'], defaults: { rateSync: 0, rateDivision: 2, frequency: 1, depth: 1, baseFrequency: 200, octaves: 2.6, wet: 1 }, start: true },
  { id: 'autowah', name: 'Auto Wah', cost: 0.68, tone: 'AutoWah',
    params: ['baseFrequency', 'octaves', 'sensitivity', 'Q', 'wet'], defaults: { baseFrequency: 100, octaves: 6, sensitivity: 0, Q: 2, wet: 1 } },
  { id: 'autopanner', name: 'Auto Panner', cost: 0.32, tone: 'AutoPanner',
    params: ['rateSync', 'rateDivision', 'frequency', 'depth', 'wet'], defaults: { rateSync: 0, rateDivision: 2, frequency: 1, depth: 1, wet: 1 }, start: true },
  { id: 'distortion', name: 'Distortion', cost: 0.08, tone: 'Distortion',
    params: ['distortion', 'wet'], defaults: { distortion: 0.4, wet: 0.5 } },
  { id: 'chebyshev', name: 'Chebyshev', cost: 0.09, tone: 'Chebyshev',
    params: ['order', 'wet'], defaults: { order: 12, wet: 0.4 } },
  { id: 'widener', name: 'Stereo Widener', short: 'Widener', cost: 0.28, tone: 'StereoWidener',
    params: ['width', 'wet'], defaults: { width: 0.7, wet: 1 } },
  { id: 'shifter', name: 'Frequency Shifter', short: 'Freq Shift', cost: 0.52, tone: 'FrequencyShifter',
    params: ['frequency', 'wet'], defaults: { frequency: 0, wet: 1 },
    // Also a frequency that is not a rate: how far the whole spectrum is moved.
    ranges: { frequency: { min: -1200, max: 1200, step: 5, unit: 'Hz' } } },
  { id: 'pitch', name: 'Pitch Shift', cost: 0.75, tone: 'PitchShift',
    params: ['pitch', 'windowSize', 'feedback', 'wet'], defaults: { pitch: 0, windowSize: 0.1, feedback: 0, wet: 1 } },
  { id: 'reverb', name: 'Reverb', cost: 0.73, tone: 'Reverb',
    params: ['decay', 'preDelay', 'wet'], defaults: { decay: 2, preDelay: 0.01, wet: 0.4 } },
  { id: 'compressor', name: 'Compressor', cost: 0.14, tone: 'Compressor',
    params: ['threshold', 'ratio', 'attack', 'release'], defaults: { threshold: -18, ratio: 4, attack: 0.01, release: 0.15 } },
  // The two compressors whose controls are NESTED. Tone builds each of these out of
  // whole Tone.Compressors — `mid`, `side`, or `low`/`mid`/`high` — so a threshold
  // is at `mid.threshold`, not on the effect. The dotted names are the parameter
  // names here; applyParams walks them and paramRange falls back to the leaf, so all
  // six thresholds share one range. Both are plain ToneAudioNodes rather than
  // Effects, which is why neither has a `wet`: they are always fully in circuit.
  { id: 'msComp', name: 'Mid/Side Compressor', short: 'M/S Comp', cost: 0.45, tone: 'MidSideCompressor',
    params: ['mid.threshold', 'mid.ratio', 'mid.attack', 'mid.release', 'mid.knee',
      'side.threshold', 'side.ratio', 'side.attack', 'side.release', 'side.knee'],
    defaults: {
      'mid.threshold': -24, 'mid.ratio': 3, 'mid.attack': 0.02, 'mid.release': 0.03, 'mid.knee': 16,
      'side.threshold': -30, 'side.ratio': 6, 'side.attack': 0.03, 'side.release': 0.25, 'side.knee': 10,
    } },
  { id: 'mbComp', name: 'Multiband Compressor', short: 'Multi Comp', cost: 0.87, tone: 'MultibandCompressor',
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
  { id: 'filter', name: 'Filter', cost: 0.15, tone: 'Filter',
    params: ['type', 'frequency', 'Q'], defaults: { type: 'lowpass', frequency: 1000, Q: 1 },
    ranges: { frequency: { min: 20, max: 18000, step: 10, unit: 'Hz', log: true } } },
];

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
export const ENGINE_BASE_COST = 10;

/**
 * What the master chain starts with: a bus compressor, BYPASSED.
 *
 * It is there so the master opens with the thing you would reach for already in
 * place at a sane bus setting — slow attack, 2:1, enough release to breathe — rather
 * than sending you to the picker to find it. A bypassed effect is skipped in the
 * wiring rather than turned down (see makeChainSlot), so an untouched seed costs no
 * CPU and renders bit-identically, which is what keeps the null test intact.
 *
 * Its position is already the right one and is not a choice the seed makes: the
 * master chain runs after the master trim and BEFORE the limiter, so this shapes the
 * dynamics and the limiter catches whatever is still over. A compressor AFTER a
 * limiter would put peaks back above the ceiling the limiter had just set, which is
 * why no desk offers that order.
 *
 * A function, not a constant: each track needs its own copy to edit.
 */
export const DEFAULT_MASTER_CHAIN = () => ([
  { id: 'compressor', bypass: true, params: { threshold: -12, ratio: 2, attack: 0.03, release: 0.25 } },
]);

/**
 * True if a master chain is still exactly the untouched seed. The seed is not an
 * edit, so a track carrying only this is not a track with a mix — without it every
 * song in the game would gain a masterEffects line in mix.js the first time the desk
 * saved anything.
 */
export function isDefaultMasterChain(list = []) {
  const seed = DEFAULT_MASTER_CHAIN();
  if (!Array.isArray(list) || list.length !== seed.length) return false;
  return list.every((e, i) => {
    const s = seed[i];
    if (e.id !== s.id || !e.bypass !== !s.bypass) return false;
    const keys = new Set([...Object.keys(e.params || {}), ...Object.keys(s.params || {})]);
    return [...keys].every((k) => (e.params?.[k] ?? null) === (s.params?.[k] ?? null));
  });
}

export const EFFECT_BY_ID = Object.fromEntries(EFFECTS.map((e) => [e.id, e]));

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
 * Build one effect. Returns null for an unknown id rather than throwing, so a mix
 * file naming an effect that has since been removed degrades to "no effect" instead
 * of taking the whole song down.
 */
export function createEffect(id, params = {}, ctx = null, bpm = 120) {
  const def = EFFECT_BY_ID[id];
  if (!def) return null;
  if (def.custom) {
    if (!ctx) return null;
    const node = def.custom(ctx, params);
    node.applyState(bpm);
    return { def, node, set: (patch, b) => node.setState(patch, b ?? bpm) };
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
  return {
    def,
    node,
    set: (patch, b = bpm) => {
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
      applyParams(node, out);
    },
  };
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
