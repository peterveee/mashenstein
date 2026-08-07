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

/**
 * The 808's six inharmonic partials, as ratios.
 *
 * Its hats and cymbals are six square oscillators at these intervals through a
 * highpass, and the ratios are the whole trick: they are close enough together to beat
 * and far enough from whole numbers that the ear hears METAL rather than a chord. Tone's
 * MetalSynth uses the same set and hides it — a preset here can override it, which is
 * the difference between one cymbal and a family of them.
 */
const METAL_RATIOS = [1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523];

/**
 * The nine drawbars of a tonewheel organ, as ratios of the note.
 *
 * In the order they sit on the console — 16′, 5⅓′, 8′, 4′, 2⅔′, 2′, 1⅗′, 1⅓′, 1′ — which is
 * why the list does not ascend: the first bar is the sub-octave and the second the fifth
 * above it, both BELOW the fundamental that the third bar plays. Every registration ever
 * written down is nine digits in that order, so keeping this order the console's order is
 * what lets a number somebody wrote on a napkin in 1968 be typed straight into a preset.
 *
 * The engine's own organ lane pulls five of them — 8′, 4′, 2⅔′, 2′ and 1⅓′, which is
 * `[0, 0, 1, 0.62, 0.32, 0.2, 0, 0.1, 0]`. See `addDrawbar` in src/data/voices.js.
 */
export const DRAWBAR_RATIOS = [0.5, 1.5, 1, 2, 3, 4, 5, 6, 8];

/**
 * A waveform an `OscillatorNode` will actually take.
 *
 * The desk's editor offers `pwm` and `pulse` as well, and Tone spells an oscillator's
 * VOICING as a prefix on its type — `fatsawtooth`, `amsine`. Every one of those is valid to
 * Tone and none of them is valid here: assigning one to `OscillatorNode.type` throws, and it
 * throws inside the sequencer's lookahead, which kills the note and every note after it on
 * that lane. The native voices are edited in a data file by hand, so this coerces rather
 * than trusts — the same failure `scrubOscTypes` exists for, approached from the other end.
 */
const NATIVE_WAVES = ['sine', 'square', 'sawtooth', 'triangle'];
const nativeWave = (type, fallback = 'sine') => (NATIVE_WAVES.includes(type) ? type : fallback);

/**
 * A PULSE of any width, as a PeriodicWave — the fifth waveform a layer can be, and the
 * arcade cue's 25% timbre, from one piece of arithmetic.
 *
 * `OscillatorNode` has four types and none of them is this: a square is the one pulse it
 * can make, at exactly 50%. Narrow the duty and the even harmonics come back in — 20% is
 * the reedy, hollow tone a Juno makes, 10% is nasal and thin enough to cut through
 * anything, and the walk between them is the sound this synth was missing.
 *
 * Built from the rectangle's own Fourier series rather than by subtracting two saws: one
 * oscillator instead of two, no delay line to keep in tune, and the browser band-limits a
 * PeriodicWave per octave so a narrow pulse at the top of the keyboard does not alias into
 * a chorus of wrong notes. At d = 0.5 every even term vanishes and this IS a square, which
 * is the check that the arithmetic is right. The DC term is dropped — a 20% pulse is
 * asymmetric about zero and its offset would ride through the drive as a click at note-on.
 *
 * `sine` picks which phase convention the terms are written in. It exists for one reason:
 * the arcade cue was built on the sine form and normalisation makes the two identical in
 * amplitude but not in phase, so its call site keeps `sine: true` and its renders stay
 * bit-identical. New callers take the cosine form.
 *
 * The cost is that WIDTH is fixed for the life of a note: a table cannot be swept. Sweeping
 * it is what `pwm` is for — see the two-saw build in `_playLayer` — and a layer with no
 * `pwm` block still comes through here, for one node instead of three.
 *
 * Cached PER CONTEXT, not per sample rate: a PeriodicWave belongs to the context that made
 * it, and an offline render sharing a live context's table is not a cache hit but a bug.
 */
const pulseTables = new WeakMap();
export function pulseTable(ctx, duty = 0.5, { harmonics = 64, sine = false } = {}) {
  const d = Math.min(0.95, Math.max(0.05, duty));
  let perCtx = pulseTables.get(ctx);
  if (!perCtx) { perCtx = new Map(); pulseTables.set(ctx, perCtx); }
  const key = `${d.toFixed(4)}|${harmonics}|${sine ? 's' : 'c'}`;
  const hit = perCtx.get(key);
  if (hit) return hit;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) {
    const a = ((sine ? 2 : 4) / (n * Math.PI)) * Math.sin(n * Math.PI * d);
    if (sine) imag[n] = a; else real[n] = a;
  }
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  perCtx.set(key, wave);
  return wave;
}

/**
 * One of the four native waveforms, rotated to start at an arbitrary PHASE.
 *
 * `OscillatorNode` always starts at phase zero, which is exactly right when there is one
 * modulator and exactly wrong when there are several meant to be independent: five vibrato
 * LFOs started together at the same rate are one LFO with extra nodes. Rotating a harmonic
 * series by `n·φ` is the standard way to move phase without a delay line — no silence at
 * the start, no node in the signal path, and the rotation is exact.
 *
 * The series are the textbook ones. Thirty-two harmonics is far more than a modulator at
 * a few hertz can use, and the waves are cached per context beside the pulse tables.
 */
const phaseWaves = new WeakMap();
function phasedWave(ctx, type, phase) {
  const kind = nativeWave(type, 'sine');
  let perCtx = phaseWaves.get(ctx);
  if (!perCtx) { perCtx = new Map(); phaseWaves.set(ctx, perCtx); }
  const key = `${kind}|${phase.toFixed(4)}`;
  const hit = perCtx.get(key);
  if (hit) return hit;
  const H = 32;
  const real = new Float32Array(H + 1);
  const imag = new Float32Array(H + 1);
  for (let n = 1; n <= H; n++) {
    let b = 0;
    if (kind === 'sine') b = n === 1 ? 1 : 0;
    else if (kind === 'square') b = n % 2 ? 4 / (n * Math.PI) : 0;
    else if (kind === 'sawtooth') b = (2 / (n * Math.PI)) * (n % 2 ? 1 : -1);
    else if (n % 2) b = (8 / (n * n * Math.PI * Math.PI)) * (((n - 1) / 2) % 2 ? -1 : 1);
    if (!b) continue;
    // b·sin(nθ + nφ) = b·sin(nφ)·cos(nθ) + b·cos(nφ)·sin(nθ)
    real[n] = b * Math.sin(n * phase);
    imag[n] = b * Math.cos(n * phase);
  }
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  perCtx.set(key, wave);
  return wave;
}

const NOISE_Q = 2;

/**
 * A number in [0,1) that depends only on WHEN a hit is scheduled.
 *
 * Every drum in the library plays the identical waveform on every hit, which is the
 * machine-gun sound sixteenths of a closed hat have always had here — real hats vary a
 * decibel and a few hertz per stroke, and the ear reads that variation as a player.
 *
 * Derived from the scheduled time rather than from a counter, because a counter is
 * state and state does not survive a lane being rendered on its own: a stem must
 * contain the same noise as the full mix or the stems stop summing. Integer ops only —
 * xorshift and imul are bit-exact everywhere, where anything built on Math.sin or
 * Math.random would drift between a browser and a headless render.
 */
function hitRandom(time, salt) {
  let n = (Math.round(time * 48000) + Math.imul(salt, 2654435761)) | 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}

/** `amount` either side of 1, deterministically. Zero — the default — is exactly 1. */
const vary = (amount, time, salt) => (amount > 0 ? 1 + (hitRandom(time, salt) - 0.5) * 2 * amount : 1);

/**
 * A pitch sweep onto `param`, in one of three SHAPES. `param` must already hold the
 * frequency the sweep starts from, set at `t`.
 *
 * The shape is not a detail. Where the sweep spends its time is most of what a listener
 * hears as the character of the drop, and the three read as three different instruments:
 *
 *   exp   Web Audio's exponential ramp: a constant RATIO per second, which is a constant
 *         number of semitones per second — a straight line on a piano roll and a
 *         perfectly even glide. The 808 flavour, and what every preset written before
 *         this existed renders as, which is why it is the default.
 *   lin   a constant number of HERTZ per second, which over a big drop is not a glide at
 *         all: half the hertz of 165→48 is only two thirds of the octaves, so it hangs
 *         up top and then plunges. A whip rather than a slide.
 *   snap  an RC discharge — hardest at the very start, settling onto the target. This is
 *         what an analogue drum machine's pitch envelope actually does, and it is the
 *         difference between a kick that clicks and then thumps and one that goes boing.
 *
 * `setTargetAtTime` never ARRIVES, so `snap` runs a time constant of a quarter of the
 * stated sweep (98% of the way by the end) and then plants the value at the end anyway.
 * That way the SWEEP pot goes on meaning "it is over by here" whichever shape is on it —
 * a knob whose units change with a pill beside it is two controls pretending to be one.
 */
function pitchRamp(param, target, t, dur, curve = 'exp') {
  const end = t + Math.max(0.001, dur);
  if (curve === 'lin') {
    param.linearRampToValueAtTime(target, end);
  } else if (curve === 'snap') {
    param.setTargetAtTime(target, t, Math.max(0.0005, dur / 4));
    param.setValueAtTime(target, end);
  } else {
    // Frequencies only, and an exponential ramp cannot pass through zero — the floor is
    // the same 1e-4 every gain envelope in the rack lands on rather than a real pitch.
    param.exponentialRampToValueAtTime(Math.max(1e-4, target), end);
  }
}

/**
 * A HELD envelope, where `_playDrum`'s `env` is a struck one.
 *
 * A drum is over when it is over. A melodic note has a LENGTH to fill, and the whole
 * difference is a sustain stage: attack to full, decay to the sustain level, hold there
 * until the note ends, then release. Module-level rather than inside one play method
 * because every native pitched voice needs the identical one.
 *
 * Every stage is a plain time in seconds. `decay` once carried a magic zero meaning "as
 * long as the note", which put the LONGEST decay at the anticlockwise stop and made a
 * zeroed control behave like a maxed one. It is gone: zero is now an instant fall, the way
 * it reads on every other synth, and a decay that should span the note says so in seconds.
 * The clamp to `end` below is what keeps a long decay from outliving a short note, so a
 * preset written for a 1.8s note still behaves at 0.5s.
 *
 * `sustain` is WHERE that fall lands. At 0 the note reaches silence, which is the struck
 * shape and the default; at 0.7 it falls only to seven tenths and releases from there.
 *
 * Returns when the tail is actually over, which is what the caller stops its oscillator on.
 */
function adsr(param, t, end, peak, e = {}, sustaining = false) {
  const level = Math.max(1e-4, peak);
  const attack = Math.max(0.001, e.attack ?? 0.01);
  const release = Math.max(0, e.release ?? 0.015);
  const sustain = Math.min(1, Math.max(0, e.sustain ?? 0));
  // An attack longer than the note itself would never reach its peak, and the note would
  // be a fade-in cut off partway up. The same clamp `_playGame` uses.
  const peakAt = t + Math.min(attack, Math.max(0.001, (end - t) * 0.45));
  // Clamped to the note, so a long decay on a short note cannot leave the release ramping
  // down from a level the envelope never actually reached.
  const decayEnd = Math.min(end, peakAt + Math.max(0, e.decay ?? 0));
  // Everything is floored at 1e-4 until the very last ramp. An exponential ramp throws on a
  // target of exactly zero, and is a silent no-op when the value it starts FROM is zero —
  // so nothing here may be 0 while ramps are still being scheduled.
  const held = Math.max(1e-4, level * sustain);
  param.setValueAtTime(1e-4, t);
  // Every stage takes the same exp/lin pair the decay has always taken — `curve`
  // keeps its historical name and its decay meaning, so every preset on file reads
  // back unchanged, and the two new keys default to the exponential shape every
  // stage always had. Exponential from 1e-4 is a late-blooming attack; linear is
  // the even fade-in, which is what Tone calls the default.
  if (e.attackCurve === 'lin') param.linearRampToValueAtTime(level, peakAt);
  else param.exponentialRampToValueAtTime(level, peakAt);
  if (e.curve === 'lin') param.linearRampToValueAtTime(held, decayEnd);
  else param.exponentialRampToValueAtTime(held, decayEnd);
  // HELD: stop here. The note is being played by a finger rather than by a sequencer, so
  // the envelope runs to its sustain level and STAYS there — an AudioParam holds its last
  // value indefinitely — and `releaseNow` writes the rest when the key comes up. Nothing
  // below is scheduled, which is exactly the difference between a note with a length and a
  // note with a player.
  if (sustaining) return end + release + 0.005;
  // The plateau — and the reason this is not `_playDrum`'s `env` with one stage bolted on.
  // A ramp interpolates from the time of the event BEFORE it, so without this the release
  // starts falling the instant the decay ends and there is no sustain at all. Only when the
  // decay finished early: a decay that ran to the end of the note has no plateau to hold,
  // and two events at one instant are last-writer-wins.
  if (decayEnd < end) param.setValueAtTime(held, end);
  const off = end + release;
  if (release > 0) {
    if (e.releaseCurve === 'lin') param.linearRampToValueAtTime(1e-4, off);
    else param.exponentialRampToValueAtTime(1e-4, off);
  }
  // ...and then to actual zero. An exponential ramp is aimed at 1e-4 and would sit there
  // until the oscillator stopped, which is a step to silence and an audible click on a
  // quiet lane — the same fix `play` in audio.js carries, for the same reason.
  param.linearRampToValueAtTime(0, off + 0.005);
  return off + 0.005;
}

/**
 * The filter envelope a native filtered voice schedules: ENV AMOUNT octaves up from the
 * cutoff and back, over its own ADSR.
 *
 * Written in CENTS on `.detune` rather than in hertz on `.frequency`, which is what lets
 * it SUM with the LFO instead of fighting it for the same param — and linear in cents is
 * exponential in hertz, so the travel is musically even. Bipolar, which Tone's
 * positive-only `octaves` cannot say: a negative amount is a pluck closing from above.
 * Times are plain seconds and sustain rides them, exactly as `adsr` reads them.
 *
 * Zero octaves schedules NOTHING — which is why no filter envelope card needs an on/off
 * switch: zero already is one, for free.
 *
 * Module-level beside `adsr` because a stack's per-layer filters and its global filter
 * must move identically; two copies of this arithmetic would drift the first time one of
 * them was tuned.
 */
function centsEnv(params, cents, e = {}, t, end, { base = 0, dfltAttack = 0.01 } = {}) {
  if (!cents) return;
  const a = Math.max(0, e.attack ?? dfltAttack);
  const s = Math.min(1, Math.max(0, e.sustain ?? 0));
  // An attack longer than the note never reaches its peak, the same clamp `adsr` takes.
  // At zero the envelope is simply THERE at note-on — which is what a pitch bend that
  // starts twenty-four semitones up and falls into the note is, and writing it as a
  // one-millisecond ramp instead would be a glide nobody asked for.
  const peakAt = a > 0 ? t + Math.min(Math.max(0.001, a), Math.max(0.001, (end - t) * 0.45)) : t;
  const decayEnd = Math.min(end, peakAt + Math.max(0, e.decay ?? 0));
  for (const p of params) {
    // Every value is `base` PLUS the envelope, because the param usually already carries
    // something — a layer's static DETUNE, its unison spread. Scheduling from zero would
    // silently cancel it: automation events on an AudioParam replace its value outright,
    // where a connected node (vibrato) sums with them.
    if (a > 0) { p.setValueAtTime(base, t); p.linearRampToValueAtTime(base + cents, peakAt); }
    else p.setValueAtTime(base + cents, t);
    p.linearRampToValueAtTime(base + cents * s, decayEnd);
    if (decayEnd < end) p.setValueAtTime(base + cents * s, end);
    p.linearRampToValueAtTime(base, end + Math.max(0.001, e.release ?? 0.015));
  }
}

/** ENV AMOUNT octaves on a filter cascade. Every stage moves together. */
const filterEnv = (stages, fe, t, end) =>
  centsEnv(stages.map((st) => st.detune), (fe?.octaves ?? 0) * 1200, fe || {}, t, end);

/**
 * The pitch envelope, in semitones, on `.detune`.
 *
 * On `.detune` rather than `.frequency` so it COMPOSES with a portamento instead of
 * fighting it for one param — a glide sets where the note comes from, the envelope bends
 * it on the way — and so a noise layer bends too, its band centre taking cents exactly as
 * an oscillator does. Attack defaults to ZERO: the arcade shape is a note that starts
 * away and arrives, not one that scoops out to the offset first.
 */
const pitchEnv = (params, pe, t, end, base = 0) =>
  centsEnv(params, (pe?.semitones ?? 0) * 100, pe || {}, t, end, { base, dfltAttack: 0 });

/**
 * The other half of a HELD envelope: let go, from wherever the note happens to be.
 *
 * Reads the param's CURRENT value rather than assuming it reached sustain, because a key
 * released during the attack must fall from where it got to — releasing from the sustain
 * level would make a stab louder on the way out than it ever was on the way in.
 *
 * Returns when the tail is over, which is what the caller re-schedules `stop()` for.
 */
function releaseNow(param, at, e = {}) {
  const rel = Math.max(0, e.release ?? 0.015);
  const from = Math.max(1e-4, param.value);
  param.cancelScheduledValues(at);
  param.setValueAtTime(from, at);
  const off = at + rel;
  if (rel > 0) {
    if (e.releaseCurve === 'lin') param.linearRampToValueAtTime(1e-4, off);
    else param.exponentialRampToValueAtTime(1e-4, off);
  }
  param.linearRampToValueAtTime(0, off + 0.005);
  return off + 0.005;
}

/**
 * How long a held note may ring with nobody holding it.
 *
 * A note-off can go missing — a key released while the panel closes, a MIDI cable pulled,
 * a page that lost focus mid-chord — and a native voice with no scheduled end would ring
 * until the context died. Thirty seconds is far past any preset's release and far short of
 * a nuisance.
 */
const HOLD_SECONDS = 30;

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
  constructor(ctx, noiseBuf = null, longBuf = null) {
    this.ctx = ctx;
    // The engine's own SEEDED noise buffer (AudioSys.noiseBuf, mulberry32 via
    // setNoiseSeed). Noise presets are built on it rather than on `Tone.Noise`,
    // which fills its buffer from Math.random at construction: two renders of the
    // same song would not match, and stems would stop summing to the mix. The
    // engine solved this years ago for its own snare; a preset uses the same buffer.
    this.noiseBuf = noiseBuf;
    // Which layers of which preset are SOLOED on the desk, as `voiceId → Set<'osc1'…>`.
    //
    // Monitoring, never a preset key: it is not on the voice, so it is never written to a
    // song, never saved to the library, and never seen by tools/measure-voices.js — which
    // builds its own rack, whose map is empty. A solo left on cannot move a calibrated
    // level, and there is nothing here for pot-coverage to call a hidden parameter.
    //
    // Assigned BY AudioSys and owned by it, deliberately. This rack is disposed and
    // rebuilt whenever the context goes away or the bank changes; state kept here would
    // vanish under lit buttons. What is kept here is a reference to the map that outlives
    // the rack.
    this.soloLayers = null;
    // And the LONG one — AudioSys.crashBuf, 2.5 seconds of the same seeded stream.
    // The half-second buffer has to be looped for anything that outlasts it, and a
    // loop drops a seam at a fixed 0.5s offset that has nothing to do with the tempo,
    // so it reads as out of time. That is why the engine's own crash has never used
    // the short one, and why a preset that wants to be a cymbal cannot either.
    this.longBuf = longBuf;
    // Tone routes everything it builds through its own context. createMixer already
    // sets it, but a rack used on its own (a test, a future audition tool) has to be
    // able to stand up without one.
    Tone.setContext(ctx);
    this.pools = new Map();
    // Pools taken out of service but still sounding — see `_retire`. Keyed by their
    // own disposal timer so `dispose` can cancel one that has not fired yet.
    this._retired = new Map();
    // Active preview notes, keyed by `${laneKey}|${freq}` → { slot }.
    // A note-off calls `triggerRelease` on the stored synth so a held key sustains
    // and a released one decays through its envelope instead of ringing for a fixed
    // sequencer length.
    this._activePreviews = new Map();
    // Held NATIVE notes, keyed the same way. The pooled classes above are released through
    // Tone's own `triggerRelease`; a native voice is a heap of scheduled AudioParams with
    // no synth object to ask, so what is kept here is the params to let go of and the
    // sources to stop early. See `releaseNow`.
    this._heldNative = new Map();
  }

  /**
   * Everything about a preset that is BUILT INTO a slot, as opposed to read per note.
   *
   * This is the line the desk's preset editor lives on. LENGTH, TRANSPOSE,
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
      // Depth is capped at 1 on THIS path alone, and it is Tone's cap rather than ours:
      // `Tone.Vibrato.depth` is a NormalRange param, so a 0–12 setting from the pot
      // would be rejected outright and take the note with it. The native paths carry
      // the full range; a Tone preset turned past 1 simply stops getting deeper, which
      // is the most a `Tone.Vibrato` can do.
      vibrato: v.vibrato && v.vibrato.depth > 0
        ? {
          rate: v.vibrato.rate ?? 5,
          depth: Math.min(1, v.vibrato.depth),
          type: v.vibrato.type || 'sine',
        }
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
   * second floor covers every one of those in the catalogue. The editor allows ten
   * seconds now, so the retirement window must cover that full envelope too.
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
    return Math.min(10, Math.max(1, longest)) + 0.1;
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

  play(laneKey, voiceId, freq, { time, dur, gain, detune = 1, dry, wet, echo = true, preview = false }) {
    const v = VOICES[voiceId];
    if (v && v.kind === 'noise') return this._playNoise(v, { time, gain, dry, wet, echo });
    if (v && v.kind === 'drum') return this._playDrum(v, { time, gain, dry, wet, echo });
    if (v && v.synth === 'GameSynth') {
      // A previewed note plays the full one-shot envelope — the decay needs room to
      // reach silence, and the preset's `dur` is a sequencer default, not a
      // sound-design parameter. 4 s is enough for any exponential ramp to hit -80 dB.
      return this._playGame(v, { freq, time, dur: preview ? 4 : dur, gain, detune, dry, wet, echo, laneKey, preview });
    }
    // Before the allowlist, not after: `SYNTHS` holds Tone classes, so a native synth that
    // reached that line would find nothing under its name and return false, which looks
    // exactly like a preset that does nothing.
    if (v && v.synth === 'AdditiveSynth') {
      return this._playAdditive(v, { freq, time, dur, gain, detune, dry, wet, echo, laneKey, preview });
    }
    if (v && v.synth === 'LayerSynth') {
      return this._playLayer(v, { freq, time, dur, gain, detune, dry, wet, echo, laneKey, preview });
    }
    if (!v || !SYNTHS[v.synth]) return false;
    const notes = Array.isArray(freq) ? freq : [freq];
    // Polyphony is not a property of the preset — the same sound is one voice on a
    // bass lane and five on a chord lane, and a preset that had to declare which
    // could not be lane-agnostic. The pool grows to the widest chord it has been
    // asked for and stops there: one slot per note, plus one so the chord landing on
    // the next beat does not steal a slot that is still ringing.
    // No `taps` on this path. A tap is one hit repeated milliseconds later — a clap, a
    // flam, a buzz roll — which is a percussion idea, and percussion is what the drum
    // and noise paths are for; both still read the key. A melodic class carrying it
    // meant the pooled loop had to size the pool for repeats every preset but five
    // never used, and those five were claps and flams filed under a synth class.
    // A mono preset is ONE instance, reused. Two things follow, and they are the two
    // things a hardware mono synth does: a new note cuts the one still ringing off
    // instead of stacking with it, and — because the instance remembers what it was
    // last playing — `portamento` finally has a pitch to glide from. Round-robining
    // notes across slots, which is right for everything else here, defeats both.
    const mono = v.mono === true;
    const pool = this._pool(laneKey, voiceId, dry, wet, echo,
      mono ? 1 : notes.length + 1, preview);
    if (!pool) return false;
    // A chord arrives as an array of frequencies; a melody as one number. Nulls are
    // rests, and a bank writes plenty of them.
    //
    // `dur` matches: one length for the whole chord, or one PER NOTE, positionally
    // aligned with `freq`, which is how a piano roll that draws a rectangle per chord
    // tone says that the tones are different lengths. A short array falls back to its
    // first entry rather than to silence — a caller that says less than the chord
    // needs has still said something about it.
    notes.forEach((f, note) => {
      const noteDur = Array.isArray(dur) ? (dur[note] ?? dur[0]) : dur;
      if (f == null || !(f > 0)) return;
      {
        // Mono holds slot 0 rather than advancing. A chord handed to a mono preset
        // therefore sounds its last note, which is what a mono synth does with one —
        // not a case to guard against, just the behaviour being asked for.
        const slot = mono ? pool.slots[0] : pool.slots[pool.next % pool.slots.length];
        if (!mono) pool.next++;
        const t = time;
        // Level is set on this slot's own gain, at this note's own time, rather than
        // on one shared node: two notes overlapping at different levels is ordinary
        // (a section changes `chordGain` mid-song) and a shared node would give the
        // ringing note the new one's level.
        slot.out.gain.setValueAtTime(gain, t);
        // The preset's own tuning rides on top of the song warp. Both are ratios, so
        // they simply multiply — a preset an octave down stays an octave down through
        // a tempo/pitch warp instead of drifting against it.
        //
        // ---- and the seatbelt ------------------------------------------------------
        //
        // Tone keeps a state timeline per oscillator and refuses a state added BEFORE
        // one already on it. Overlap is fine — a note arriving while the last one still
        // rings is a RESTART, which is what a synth does, and songs in the catalogue
        // rely on it — but a note booked behind everything on that instance throws, and
        // it throws inside the sequencer's lookahead, where the whole desk's script dies
        // with it.
        //
        // The route that reached it is a note previewed WHILE THE SONG PLAYS: the
        // sequencer is a quarter-second ahead and a key press lands at now + 20ms, behind it. That
        // now has a pool of its own (see previewNote), which is the actual fix. This is
        // the seatbelt for whatever else finds the same edge: one note goes missing
        // instead of the page. Deliberately not a slot-picking scheme — rerouting a note
        // to a different instance changes which note gets cut off, and that is a change
        // to what existing songs sound like.
        try {
          if (preview) {
            // A previewed note uses triggerAttack so a later note-off can release it.
            // Release any previous note at this (lane, freq) first — the same key
            // pressed again restarts rather than stacking.
            const noteKey = `${laneKey}|${f.toFixed(2)}`;
            this._releasePreview(noteKey);
            slot.synth.triggerAttack(f * detune * VoiceRack.pitchShift(v), t, 1);
            this._activePreviews.set(noteKey, { slot });
          } else {
            slot.synth.triggerAttackRelease(f * detune * VoiceRack.pitchShift(v), noteDur, t);
          }
        } catch { return; }
        // How far into the future this pool is committed. Notes are scheduled up to
        // a quarter-second ahead, so "is it playing" is not a question about now — and a pool
        // taken out of service has to outlive the ones already booked on it or they
        // go missing. See `_retire`.
        pool.until = Math.max(pool.until, t + noteDur);
      }
    });
    return true;
  }

  /** Native game oscillator: the simple voice path without Tone's ADSR layer. */
  _playGame(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', preview = false }) {
    const notes = Array.isArray(freq) ? freq : [freq];
    const attack = Math.max(0.001, v.attack ?? 0.01);
    const release = Math.max(0, v.release ?? 0.015);
    const shift = VoiceRack.pitchShift(v) * detune;
    // The note starts AMOUNT semitones away and arrives at its written pitch, rather than
    // starting on it and leaving. That direction is the whole of why this is usable on a
    // melody lane: a voice that walks off its own note can only ever be a sound effect,
    // and these are lane presets. +24 falling over 60ms is a coin, −36 over 200ms is a
    // laser, and zero schedules nothing at all — so a preset that does not name it
    // renders the same samples it did before this existed.
    //
    // Semitones, not hertz, because the offset is a RATIO: +12 is an octave up whether
    // the note is a bass D or a lead D, and it composes with the song warp and the
    // preset's own transpose for free, the way `pitchShift` already does.
    //
    // One shape for both native paths: AMOUNT in semitones over its own A/D/S/R, written
    // as cents on `.detune`. `sweep`/`sweepTime`/`sweepCurve` said the same thing in a
    // dialect only this synth spoke — a single ramp, no sustain, no release — and two
    // panels calling one idea by two names is what the desk exists not to do.
    const pe = v.pitch && (v.pitch.semitones ?? 0) !== 0 ? v.pitch : null;
    // `vibrato.depth` is 0–1 here, the same as everywhere else in the rack — it is ONE
    // key with one control (`commonRows`' VIB DEPTH), and a preset carries it onto any
    // lane and any path. The Tone path hands it to `Tone.Vibrato`, which takes 0–1;
    // this path has an oscillator to detune instead, so the scale is stated once, here.
    //
    // A semitone per unit: depth 1 is ±100 cents, which is already far more than an
    // instrument does. It is NOT capped there any more. A game synth is allowed to want
    // the seasick end, and the pot runs to 12 — a full octave of wobble, which at any
    // speed is a siren and at audio rate is frequency modulation with the sidebands as
    // the point. The cap that used to live here made the top eleven twelfths of that
    // pot silently do nothing.
    //
    // Unclamped rather than clamped higher: nothing downstream needs a ceiling. This
    // number becomes cents on an oscillator's `detune`, hertz on a bandpass below, and
    // both params clamp themselves at the edges of what they can do.
    const vib = v.vibrato && v.vibrato.depth > 0 ? v.vibrato : null;
    const vibCents = vib ? vib.depth * 100 : 0;
    // NOISE is a waveform here, not a separate preset kind. The library's 28 noise and
    // drum presets are percussion: their filter sits at a fixed frequency and ignores
    // the note. A chip noise channel is PITCHED — it follows the melody — and that is
    // the sound this path was missing. Filtered noise plus a big negative `sweep` is
    // an explosion, which nothing in the catalogue could say before.
    //
    // The seeded buffer, never `Math.random`, so two renders still match and stems
    // still sum. A rack built without one falls back to the engine's own voice rather
    // than playing silence — the same answer `_playNoise` gives.
    const isNoise = (v.waveform || 'square') === 'noise';
    if (isNoise && !this.noiseBuf) return false;
    // ONE LFO for the whole chord. Per-note LFOs would start at the same phase and then
    // drift apart on any rate rounding, and a chord whose notes wobble independently is
    // a chorus, not a vibrato. Created per note-on and stopped with the last voice —
    // unlike the Tone path's, which builds an LFO into the pool and leaves it running
    // whether or not anything triggered it.
    //
    // Three stages rather than one, because the two waveform paths need the same wobble
    // in different UNITS: an oscillator detunes in cents, and a bandpass tracking the
    // note has to move in hertz, which depends on which note it is. So the LFO stays at
    // unit amplitude, `vibEnv` carries the ONSET (shared — every note in a chord should
    // bloom together), and the last gain does the scaling per destination.
    let lfo = null, vibEnv = null, centsGain = null, lastOff = 0;
    if (vib) {
      lfo = this.ctx.createOscillator();
      vibEnv = this.ctx.createGain();
      lfo.type = vib.type || 'sine';
      // `?? 5` matches the Tone path's own fallback a hundred lines up, so a preset
      // with a depth and no rate wobbles at the same speed whichever path plays it.
      lfo.frequency.setValueAtTime(Math.max(0.01, vib.rate ?? 5), time);
      // The DELAYED vibrato: depth grows from nothing to full over `vibrato.delay`.
      // A fade rather than a gate, because that is what a player does and because a
      // wobble switching on at full depth mid-note is heard as a fault. `0` — the
      // default — ramps within a millisecond, which is the behaviour without it.
      //
      // This is the one vibrato key the Tone path does NOT read: its LFO lives in the
      // pool and free-runs across notes, so there is no note-on for an onset to be
      // measured from. Stated in the panel as a GameSynth row for that reason.
      const delay = Math.max(0.001, v.vibrato.delay || 0.001);
      vibEnv.gain.setValueAtTime(0, time);
      vibEnv.gain.linearRampToValueAtTime(1, time + delay);
      lfo.connect(vibEnv);
      if (!isNoise) {
        centsGain = this.ctx.createGain();
        centsGain.gain.setValueAtTime(vibCents, time);
        vibEnv.connect(centsGain);
      }
    }
    // `dur` matches `freq`: one length for the whole chord, or one PER NOTE, the way
    // the Tone path reads it — a piano roll drawing a rectangle per chord tone says
    // the tones are different lengths, and this path was reading past that.
    notes.forEach((f, note) => {
      if (!(f > 0)) return;
      const noteDur = Array.isArray(dur) ? (dur[note] ?? dur[0]) : dur;
      const t = time;
      const end = t + Math.max(0.001, noteDur || 0.001);
      const peakAt = t + Math.min(attack, Math.max(0.001, (end - t) * 0.45));
      const g = this.ctx.createGain();
      // The optional tone filter, between whatever makes the sound and the envelope
      // that shapes it — so a preset can be a chip waveform with the top taken off, a
      // noise burst that dulls as it falls, or a resonant sweep that is most of the
      // effect. Absent, `into` is a plain connect and not one node is built: the same
      // deal VIB DEPTH 0 makes, and the reason every preset that shipped before this
      // sounds identical.
      //
      // `_filterChain` rather than a filter written out here, so this is the same
      // filter the noise and drum voices already have — same keys, same slopes, same
      // `to`-over-`sweep` ramp — instead of a second one that drifts from it. It is
      // built PER NOTE because its sweep starts at note-on: a chord's notes are struck
      // together, but a filter shared between them would be re-triggered by whichever
      // note was scheduled last.
      const chain = v.filter ? this._filterChain(v.filter, t, 1, 'lowpass', 4000) : null;
      if (chain) chain.tail.connect(g);
      const into = (node) => node.connect(chain ? chain.head : g);
      // The source and the thing that carries its PITCH are the only difference between
      // the two waveform families: an oscillator's `frequency`, or the centre of a
      // bandpass the noise runs through. Both are frequencies in hertz, so the sweep,
      // the note and the preset's tuning are written onto whichever one it is exactly
      // the same way below.
      let o, pitch, det, makeup = 1;
      if (isNoise) {
        o = this.ctx.createBufferSource();
        o.buffer = this.noiseBuf;
        // Looped: the buffer is half a second and a held note is not. The filter takes
        // the edge off the seam, which is the same trade `_playDrum` makes.
        o.loop = true;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        // Fixed and fairly loose. Higher and the noise starts to whistle a pitch, which
        // is an oscillator with extra steps; lower and the note stops being audible at
        // all. A control here would be the fourth knob on the simplest voice in the rack.
        bp.Q.setValueAtTime(NOISE_Q, t);
        o.connect(bp);
        pitch = bp.frequency; det = bp.detune;
        into(bp);
        // A bandpass keeps only the slice of the noise inside its band, and that slice
        // NARROWS with the note: at Q 2 a 110 Hz note holds a 55 Hz-wide sliver of a
        // 22 kHz spectrum and renders some thirty times quieter than the oscillators
        // beside it — measured, not estimated. Worse, it would fade as it descended,
        // which is a voice that cannot play a melody.
        //
        // Noise POWER adds as bandwidth, so amplitude goes as its square root, and the
        // makeup is that root. The floor stops a very low note asking for an absurd
        // boost; the whole thing is a formula rather than a measurement, so it stays
        // deterministic offline.
        const nyquist = this.ctx.sampleRate / 2;
        makeup = Math.sqrt(nyquist / Math.max(20, (f * shift) / NOISE_Q));
      } else {
        o = this.ctx.createOscillator();
        o.type = v.waveform || 'square';
        pitch = o.frequency; det = o.detune;
        into(o);
      }
      pitch.setValueAtTime(f * shift, t);
      // The bend, in cents on `.detune` — the note sits at its written pitch and the
      // envelope moves it, rather than the note being written away from itself and
      // ramped back. Arrives BY note-off however long it asks for: `centsEnv` clamps its
      // decay to the note, the same clamp the attack above already takes.
      //
      // On the bandpass for a noise waveform, whose `.detune` is cents like an
      // oscillator's — so a filtered-noise voice bends exactly as a square does, which
      // the hertz arithmetic below the vibrato needs and this no longer does.
      if (pe) pitchEnv([det], pe, t, end);
      // Cents into `detune` for an oscillator; hertz into the filter for noise, and the
      // hertz depend on the note — a semitone at 220 Hz is 13 Hz and at 1760 it is 105.
      // Hence a gain per noise note where the oscillators share one.
      //
      // The hertz swing is the UPWARD interval, applied both ways, so a deep setting is
      // lopsided here where the oscillator's is symmetrical: at a full octave the band
      // sweeps from the note to twice it going up, and down into the filter's own floor
      // at zero going the other way. That is the sound at that setting rather than a
      // fault — the alternative is a bandpass asked for a negative frequency.
      if (centsGain) centsGain.connect(o.detune);
      else if (vibEnv && isNoise) {
        const hzGain = this.ctx.createGain();
        hzGain.gain.setValueAtTime(f * shift * (Math.pow(2, vibCents / 1200) - 1), t);
        vibEnv.connect(hzGain);
        hzGain.connect(pitch);
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain * makeup, peakAt);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      g.gain.linearRampToValueAtTime(0, end + release);
      // This path has no SUSTAIN to hold — its envelope is an arcade AR, attack then a
      // fall across the note, and there is no level for a finger to sit on. So a held
      // preview does not sustain; it gets a NOTE-OFF, which is the half that was missing.
      // Before this, a previewed game note ran its full four seconds whatever the key did.
      if (preview) {
        const noteKey = `${laneKey}|${f.toFixed(2)}`;
        this._releasePreview(noteKey);
        this._heldNative.set(noteKey, {
          params: [{ param: g.gain, e: { release } }], sources: [o],
        });
      }
      // The source is already wired into `g` by the branch above — through the bandpass
      // for noise, directly for an oscillator, and through the tone filter when the
      // preset has one. Connecting it again here would put raw unfiltered noise beside
      // the filtered copy.
      g.connect(dry);
      if (echo && wet) g.connect(wet);
      o.start(t); o.stop(end + release + 0.005);
      lastOff = Math.max(lastOff, end + release + 0.005);
    });
    // A chord of nothing but rests built no oscillators, so there is nothing to wobble.
    if (lfo && lastOff) { lfo.start(time); lfo.stop(lastOff); }
    return true;
  }

  /**
   * The pool for one (lane, voice, echo) combination.
   *
   * `dry`/`wet` are stable nodes on a channel strip, so the pool is normally built
   * once and reused. They are still compared: a rebuilt mixer hands out new nodes,
   * and a pool wired to the old ones would play into a graph nothing is listening to.
   */
  _pool(laneKey, voiceId, dry, wet, echo, want = 1, preview = false) {
    // A preview's synths are its own. The song is scheduled a quarter-second ahead and a preview
    // lands in the middle of that; Tone will not accept a state before one already on
    // an instrument's timeline, so sharing these threw. See previewNote in audio.js.
    const key = `${laneKey}|${voiceId}|${echo ? 1 : 0}${preview ? '|preview' : ''}`;
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
      pool = { voiceId, dry, wet, echo, preview, slots: [], next: 0, until: 0,
        spec: VoiceRack.buildSpec(VOICES[voiceId]) };
      this.pools.set(key, pool);
    }

    // Grown, never shrunk. A chord that is five notes wide once is likely to be
    // again, and tearing slots down mid-song would cut whatever is ringing on them.
    while (pool.slots.length < Math.max(1, want)) this._addSlot(pool, dry, wet, echo);
    return pool;
  }

  /** One more instance of this pool's preset, wired to the same strip. */
  _addSlot(pool, dry, wet, echo) {
    const Ctor = SYNTHS[pool.spec.synth];
    {
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
      const slot = { synth, out, vib };
      pool.slots.push(slot);
      return slot;
    }
  }

  /**
   * The seeded buffer, filtered into a colour, built once and kept.
   *
   * White noise is flat per HERTZ, and hearing is not: half of a white buffer's energy
   * sits in its top octave, which is why every hat in the library is a highpass and
   * every snare is a fight to keep the fizz off it. A colour moves the energy before
   * the filter ever sees it — pink under a snare has body the highpass cannot invent,
   * violet under a hat is air with no rumble to remove.
   *
   * Derived from `noiseBuf` rather than generated: it is the SEEDED buffer, and a
   * colour is a pure function of it, so two renders of a song still match sample for
   * sample and stems still sum to the mix. Normalised back to the white buffer's RMS
   * so choosing a colour is a timbre change and not a level change.
   *
   * Cheap enough to be lazy — one pass over half a second of samples, once per colour
   * per rack, the first time a preset asks for it.
   */
  _noise(color, long = false) {
    const base = (long && this.longBuf) || this.noiseBuf;
    if (!color || color === 'white') return base;
    this._colored ||= new Map();
    const key = `${color}:${base === this.longBuf ? 'long' : 'short'}`;
    let buf = this._colored.get(key);
    if (buf) return buf;
    const src = base.getChannelData(0);
    const len = src.length;
    buf = this.ctx.createBuffer(1, len, base.sampleRate);
    const d = buf.getChannelData(0);
    if (color === 'pink' || color === 'blue') {
      // Paul Kellet's economy pink filter: three one-poles summed, which tracks
      // -3 dB/octave to within a tenth of a decibel across the audible band.
      let b0 = 0; let b1 = 0; let b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = src[i];
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        d[i] = b0 + b1 + b2 + w * 0.1848;
      }
      // Blue is pink differentiated: -3 dB/oct plus the +6 a difference gives is the
      // +3 blue is defined as. Cheaper and more accurate than a second filter design.
      if (color === 'blue') {
        let prev = 0;
        for (let i = 0; i < len; i++) { const w = d[i]; d[i] = w - prev; prev = w; }
      }
    } else if (color === 'brown') {
      // A leaky integrator: -6 dB/oct. The leak is what stops a random walk wandering
      // off DC across half a second of samples.
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * src[i]) / 1.02; d[i] = last; }
    } else if (color === 'violet') {
      // The plain difference of white: +6 dB/oct, all air.
      let prev = 0;
      for (let i = 0; i < len; i++) { const w = src[i]; d[i] = w - prev; prev = w; }
    } else {
      return base;                                // an unknown colour is white, not silence
    }
    let a = 0; let b = 0;
    for (let i = 0; i < len; i++) { a += src[i] * src[i]; b += d[i] * d[i]; }
    const k = b > 0 ? Math.sqrt(a / b) : 1;
    for (let i = 0; i < len; i++) d[i] *= k;
    this._colored.set(key, buf);
    return buf;
  }

  /**
   * The buffer a section should be built on: the short one, or the long one.
   *
   * Not a control, and deliberately not one. The half-second buffer has to be LOOPED
   * for anything that outlasts it, and the loop drops a seam at a fixed 0.5s offset
   * that has nothing to do with the tempo — so it reads as out of time. The engine's
   * own crash has never used the short buffer for exactly this reason; it carries a
   * dedicated 2.5s one so a cymbal can play straight through.
   *
   * A section that runs past the short buffer gets the long buffer, and one that does
   * not is untouched. The 5% margin is what keeps the whole existing library on the
   * short buffer: the longest noise envelope in it is `clapRoom` at 0.501s, whose loop
   * point lands a millisecond into a tail that is already 80dB down. `sec.long` states
   * it outright where a preset would rather decide for itself.
   */
  _bufFor(sec, dfltDecay) {
    const len = (sec.attack ?? 0.001) + (sec.hold ?? 0) + (sec.decay ?? dfltDecay);
    const long = sec.long ?? (this.longBuf ? len > (this.noiseBuf.duration || 0.5) * 1.05 : false);
    return this._noise(sec.color, long);
  }

  /**
   * A filter as a CHAIN, so a section can have a slope steeper than one biquad's.
   *
   * One biquad is 12 dB/octave, and 12 dB/octave is not much: a hat highpassed at
   * 8 kHz still carries audible energy an octave and a half below the cutoff, which is
   * the rumble every closed hat in the library has had to be levelled around. Two in
   * series is 24, four is 48, and a 48 dB/octave highpass leaves nothing but air.
   *
   * Resonance goes on the FIRST stage only. Q on every stage of a cascade multiplies —
   * four stages at Q 8 is a howl, not a slope — so the chain gets one resonant peak and
   * Butterworth stages behind it, which is the shape a filter knob is expected to have.
   *
   * `mul` is the per-hit cutoff ratio: per-tap tone and humanise, applied here so a
   * sweep's destination moves with its origin rather than snapping back.
   */
  _filterChain(spec, t, mul = 1, dfltType = 'bandpass', dfltFreq = 2600) {
    const ctx = this.ctx;
    const stages = spec.slope === -48 ? 4 : spec.slope === -24 ? 2 : 1;
    const freq = Math.max(20, (spec.freq ?? dfltFreq) * mul);
    let head = null; let tail = null;
    // Kept and returned so a caller can modulate the whole cascade — an LFO into one
    // stage's `.detune` of a -48 chain would wobble a quarter of the slope. The existing
    // callers read `head`/`tail` and ignore it.
    const built = [];
    for (let k = 0; k < stages; k++) {
      const f = ctx.createBiquadFilter();
      f.type = spec.type || dfltType;
      f.frequency.setValueAtTime(freq, t);
      if (spec.to != null && spec.to !== (spec.freq ?? dfltFreq)) {
        const sweep = spec.sweep ?? ((spec.attack ?? 0.001) + (spec.decay ?? 0.12));
        f.frequency.exponentialRampToValueAtTime(Math.max(20, spec.to * mul), t + sweep);
      }
      f.Q.value = k === 0 ? (spec.Q ?? 0.7) : 0.7071;
      if (tail) tail.connect(f); else head = f;
      tail = f;
      built.push(f);
    }
    return { head, tail, stages: built };
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
    const hum = v.humanize || {};
    const buf = this._bufFor(n, 0.09);
    for (let i = 0; i < taps.length; i++) {
      const t = time + taps[i];
      // Each tap is quieter than the one before it — a burst repeated at one level is
      // a stutter, where a clap is one hit heard several times in a small room.
      //
      // `tapGains` states them outright where a falloff cannot. The engine's own clap
      // is the case that needs it: three bursts at 0.16, 0.16 and 0.26, the LAST the
      // loudest and four times the length — the two slaps and then the room. No curve
      // through those points is a falloff, so a preset that has to be exact gets to
      // list them, and `tapDecays` does the same for the lengths.
      const fade = (v.tapGains?.[i] ?? (v.tapFalloff ?? 1) ** i)
        * vary(hum.gain, time, i);
      const tone = (v.tapTone ?? 1) ** i * vary(hum.filter, time, i + 16);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const chain = this._filterChain(n, t, tone, 'bandpass', 2600);
      const g = ctx.createGain();
      const decay = v.tapDecays?.[i] ?? n.decay ?? 0.09;
      g.gain.setValueAtTime(Math.max(1e-4, level * fade), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      src.connect(chain.head); chain.tail.connect(g); g.connect(dry);
      if (echo && wet) g.connect(wet);
      src.start(t); src.stop(t + decay + 0.02);
    }
    // The body: a short pitched thump under the noise, which is what tells a snare
    // from a hiss and a kick from a click.
    const body = v.body;
    if (body) {
      const t = time;
      const bend = vary(hum.pitch, time, 32);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = body.type || 'triangle';
      o.frequency.setValueAtTime((body.from ?? 210) * bend, t);
      o.frequency.exponentialRampToValueAtTime((body.to ?? 140) * bend, t + (body.decay ?? 0.06));
      og.gain.setValueAtTime(Math.max(1e-4, gain * (body.gain ?? 0.375) * vary(hum.gain, time, 0)), t);
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
   *          over `sweep` seconds, in the shape `pitchCurve` names — see `pitchRamp`),
   *          and an amp envelope of its own
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
    const r = v.ring;
    const m = v.metal;
    if (!o && !n && !r && !m && !(v.knock > 0)) return false;
    if ((n || r) && !this.noiseBuf) return false;
    const taps = v.taps || [0];
    const hum = v.humanize || {};

    // One envelope, five shapes of arrival: instant, ramped, held, gated, and SAGGED.
    //
    // `hold` is what a gated drum machine does that an attack-decay pair cannot — the
    // level stays put for a moment before it moves, which is the difference between a
    // 909 snare and the same snare with a fast fade.
    //
    // `sag` is the two-stage decay, and it is the one the engine's own kit needed: its
    // rimshot drops to 16% in twenty milliseconds and then rings out over the next
    // fifty-five, and the hand-written kick does the same trick more gently. One
    // exponential cannot be both a transient and a tail — set to the fast one it has no
    // ring, set to the slow one it has no crack — and the ear reads the join as the
    // thing being STRUCK. `sag` is the level it falls to (a fraction) and `sagAt` is
    // when, in seconds; the rest of `decay` carries it the rest of the way down.
    //
    // Reads its times off the section itself, so every section takes the same five
    // controls without six call sites repeating the list. `dflt` is the decay each
    // section falls back to, which is the one number they genuinely disagree about.
    const env = (param, t, level, sec = {}, dflt = 0.1) => {
      const attack = sec.attack ?? 0.001;
      const decay = sec.decay ?? dflt;
      const hold = sec.hold ?? 0;
      const lvl = Math.max(1e-4, level);
      const lin = sec.curve === 'lin';
      param.setValueAtTime(1e-4, t);
      param.linearRampToValueAtTime(lvl, t + attack);
      if (hold > 0) param.setValueAtTime(lvl, t + attack + hold);
      let from = t + attack + hold;
      let left = decay;
      if (sec.sag > 0 && sec.sag < 1) {
        // Clamped to the decay: a sag point past the end of the envelope is a preset
        // asking for a transient that outlasts its own tail.
        const at = Math.min(sec.sagAt ?? 0.02, decay * 0.9);
        const knee = Math.max(1e-4, lvl * sec.sag);
        if (lin) param.linearRampToValueAtTime(knee, from + at);
        else param.exponentialRampToValueAtTime(knee, from + at);
        from += at;
        left -= at;
      }
      if (lin) param.linearRampToValueAtTime(0, from + left);
      else param.exponentialRampToValueAtTime(0.0001, from + left);
      return attack + hold + decay;
    };

    for (let i = 0; i < taps.length; i++) {
      const t = time + taps[i];
      const fade = (v.tapGains?.[i] ?? (v.tapFalloff ?? 1) ** i) * vary(hum.gain, time, i);
      // Two per-tap ratios beside the gain falloff, because a clap made of one sound
      // four times is a stutter and a real one is four hands: `tapDetune` walks the
      // pitch, `tapTone` walks the filter, and both compound the way the gain does.
      const bend = (v.tapDetune ?? 1) ** i * vary(hum.pitch, time, i + 16);
      const tone = (v.tapTone ?? 1) ** i * vary(hum.filter, time, i + 32);

      // The hit's output: note level applied AFTER the shaper — see above. The tone
      // filter sits between them, because what it is for is the fizz the shaper just
      // added and it would have nothing to do in front of it.
      const out = ctx.createGain();
      out.gain.value = gain * fade;
      out.connect(dry);
      if (echo && wet) out.connect(wet);
      let into = out;
      if (v.tone) {
        const tf = ctx.createBiquadFilter();
        tf.type = v.tone.type || 'lowpass';
        tf.frequency.value = Math.max(20, (v.tone.freq ?? 8000) * tone);
        tf.Q.value = v.tone.Q ?? 0.7;
        tf.connect(into);
        into = tf;
      }
      if (v.drive > 0) {
        const shaper = ctx.createWaveShaper();
        shaper.curve = this._driveCurve(v.drive, v.shape);
        shaper.connect(into);
        into = shaper;
      }

      let len = 0;
      if (o) {
        const osc = ctx.createOscillator();
        osc.type = o.type || 'sine';
        const from = (o.from ?? 190) * bend;
        const to = (o.to ?? 52) * bend;
        osc.frequency.setValueAtTime(from, t);
        // `pitchCurve`, not `curve` — `curve` on this section is its AMP envelope's, and
        // the two are genuinely separate choices: a kick can snap in pitch while its
        // level falls exponentially, which is most kicks.
        if (to !== from) pitchRamp(osc.frequency, to, t, o.sweep ?? 0.07, o.pitchCurve);
        const g = ctx.createGain();
        len = Math.max(len, env(g.gain, t, o.gain ?? 1, o, 0.35));
        // The one modulator, and the reason a single oscillator can be a cowbell. Its
        // pitch is fixed at the carrier's STARTING frequency rather than tracking the
        // sweep: the ratio drifting through a kick's octave-and-a-half drop is what
        // turns a clang into a siren, and a drum wants the clang.
        if (o.fm) {
          const mod = ctx.createOscillator();
          mod.type = o.fm.type || 'sine';
          mod.frequency.value = from * (o.fm.ratio ?? 1.4);
          const mg = ctx.createGain();
          // Depth in HERTZ, stated as a multiple of the carrier: at an index of 1 the
          // modulator swings the carrier by its own starting frequency either way, so
          // the number means the same thing on a 50 Hz kick and a 2 kHz rim.
          env(mg.gain, t, from * (o.fm.index ?? 1), o.fm, o.decay ?? 0.35);
          mod.connect(mg); mg.connect(osc.frequency);
          mod.start(t); mod.stop(t + len + 0.03);
        }
        osc.connect(g); g.connect(into);
        osc.start(t); osc.stop(t + len + 0.03);
      }
      // ---- the knock --------------------------------------------------------
      //
      // The engine's own kick is three layers, not two: a sine body, a noise click, and
      // between them a short triangle punch around 300 Hz — the band the bass mostly
      // leaves open, which is what lets the kick read on a phone speaker where the sub
      // is felt rather than heard. `scheduleStep` has always had it as `kickKnock`.
      //
      // A level and nothing else, deliberately. Its shape is the engine's — 300 Hz
      // falling to 180 over 40ms, up in 4ms and gone in 50 — and every parameter it
      // could expose is one more control on a panel pinned to a strip's width. It is
      // the second oscillator a kick needs and the only one, so it is a pot, not a
      // section. Zero, the default, builds nothing at all.
      //
      // Gated on the oscillator section being present: the knock is the oscillator's
      // midrange punch layer. When the oscillator is switched off there is nothing for
      // the knock to sit under, and it fires alone as an orphaned thwack.
      if (o && v.knock > 0) {
        const k = ctx.createOscillator();
        const kg = ctx.createGain();
        k.type = 'triangle';
        k.frequency.setValueAtTime(300 * bend, t);
        k.frequency.exponentialRampToValueAtTime(180 * bend, t + 0.04);
        // 80ms rather than the engine's stated 50: the engine's knock ramps to an
        // ABSOLUTE 0.001 from 0.17, where `env` ramps to 0.0001 from the level asked
        // for — the same curve stated against a lower floor, so it needs the longer
        // number to fall at the same rate. Matched at knock ≈ 0.4, which is where the
        // engine's own kick sits.
        const klen = env(kg.gain, t, v.knock, { attack: 0.004 }, 0.08);
        len = Math.max(len, klen);
        k.connect(kg); kg.connect(into);
        k.start(t); k.stop(t + klen + 0.03);
      }
      if (n) {
        const src = ctx.createBufferSource();
        src.buffer = this._bufFor(n, 0.12);
        // Looped: the buffer is half a second and an open hat's envelope is not. The
        // filter takes the edge off the seam the crash path avoids with a longer buffer.
        src.loop = true;
        const chain = this._filterChain(n, t, tone, 'bandpass', 2600);
        const g = ctx.createGain();
        // A per-tap decay overrides the section's, which is what lets one burst of a
        // clap be the room and the two before it be slaps.
        const nlen = env(g.gain, t, n.gain ?? 1,
          v.tapDecays ? { ...n, decay: v.tapDecays[i] ?? n.decay } : n, 0.12);
        len = Math.max(len, nlen);
        src.connect(chain.head); chain.tail.connect(g); g.connect(into);
        src.start(t); src.stop(t + nlen + 0.03);
      }
      // ---- the resonator ----------------------------------------------------
      //
      // A click into a very narrow bandpass, which is what a rim, a clave, a wood block
      // and the body of a snare drum all are: something struck briefly, and a resonance
      // that goes on ringing after the strike is over. The pitch is the filter's, not an
      // oscillator's, so it arrives already decaying and already inharmonic at the edges
      // — the two things a sine with an envelope on it can never quite fake.
      //
      // `hit` is how long the excitation lasts and it is the whole character control:
      // two milliseconds is a stick, twenty is a mallet, and past fifty it stops being a
      // strike and becomes a filtered burst, which is what the noise section is for.
      if (r) {
        const src = ctx.createBufferSource();
        src.buffer = this._bufFor(r, 0.25);
        src.loop = true;
        const hit = ctx.createGain();
        const hitLen = Math.max(0.0002, r.hit ?? 0.002);
        hit.gain.setValueAtTime(1, t);
        hit.gain.linearRampToValueAtTime(0, t + hitLen);
        const f = ctx.createBiquadFilter();
        f.type = r.type || 'bandpass';
        f.frequency.setValueAtTime(Math.max(20, (r.freq ?? 400) * bend), t);
        if (r.to != null) {
          f.frequency.exponentialRampToValueAtTime(Math.max(20, r.to * bend), t + (r.sweep ?? (r.decay ?? 0.25)));
        }
        // Ring time is Q over pi-f, so this is the pitch's own decay and the envelope
        // below can only ever cut it shorter. A rim wants 40 and up; below about 10 a
        // bandpass stops ringing and starts merely colouring.
        const q = r.Q ?? 40;
        f.Q.value = q;
        const g = ctx.createGain();
        // Q COSTS LEVEL, and the whole section is unusable without saying so here.
        // Web Audio's bandpass has unity peak gain, so narrowing it does not boost the
        // resonance — it throws away everything either side of it. At Q 90 the filter
        // passes about 19 Hz of a 22 kHz buffer, and the ring came out thirty times
        // quieter than the click that excited it: measured, `rimRing` was 20 dB down
        // three milliseconds in, which is a preset with a resonator you cannot hear.
        //
        // Amplitude goes as the square root of the bandwidth, so the compensation is
        // the square root of Q. That is what makes `gain: 1` mean the same thing here
        // as it does in the noise section, instead of meaning "whatever this Q left".
        const rlen = env(g.gain, t, (r.gain ?? 1) * Math.sqrt(Math.max(1, q)), r, 0.25);
        len = Math.max(len, rlen);
        src.connect(hit); hit.connect(f); f.connect(g); g.connect(into);
        src.start(t); src.stop(t + rlen + 0.03);
      }
      // ---- the metal cluster ------------------------------------------------
      //
      // Six squares at inharmonic ratios through a highpass: the 808's cymbal circuit,
      // and the only thing here that makes a sound filtered noise cannot. Tone's
      // MetalSynth is the same idea with the ratios welded shut and an FM operator per
      // oscillator; this is cheaper per hit and the ratios are a preset's to choose,
      // which is what turns one cymbal into a family of them.
      if (m) {
        const ratios = (Array.isArray(m.ratios) && m.ratios.length ? m.ratios : METAL_RATIOS)
          .slice(0, m.count ?? 6);
        const base = Math.max(20, (m.freq ?? 800) * bend);
        // `spread` stretches the cluster around its fundamental: at 0 every oscillator
        // lands on the base note and the cluster is a square wave, at 2 the partials are
        // twice as far apart as the 808's and it reads as broken glass.
        const spread = m.spread ?? 1;
        // The cluster's filter is stated in its own keys — `freq` here is the pitch the
        // partials are built from, and a section cannot have two meanings for one word.
        const chain = this._filterChain({
          type: m.filter, freq: m.hp, to: m.hpTo, sweep: m.hpSweep, Q: m.Q, slope: m.slope,
          attack: m.attack, decay: m.decay,
        }, t, tone, 'highpass', 3000);
        const g = ctx.createGain();
        const mlen = env(g.gain, t, m.gain ?? 1, m, 0.2);
        len = Math.max(len, mlen);
        for (const ratio of ratios) {
          const osc = ctx.createOscillator();
          osc.type = m.wave || 'square';
          const at = 1 + (ratio - 1) * spread;
          osc.frequency.setValueAtTime(base * at, t);
          // The whole cluster sags together, each partial keeping its ratio — which is
          // what the engine's own rimshot does (three squares falling 6% as they ring)
          // and what stops a struck metal sounding like a held chord.
          if (m.to != null && m.to !== (m.freq ?? 800)) {
            osc.frequency.exponentialRampToValueAtTime(
              Math.max(20, m.to * bend * at), t + (m.sweep ?? mlen),
            );
          }
          osc.connect(chain.head);
          osc.start(t); osc.stop(t + mlen + 0.03);
        }
        chain.tail.connect(g); g.connect(into);
      }
    }
    return true;
  }

  /**
   * An additive voice: a stack of sine partials at fixed ratios, each with its own level,
   * summed under one envelope.
   *
   * This is the drawbar organ — and the drawbar organ is the WHOLE of the engine's own
   * `organChords` lane: five sines at 8′, 4′, 2⅔′, 2′ and 1⅓′ and nothing else. No filter,
   * no drive, no rotary, no key click; the channel strip adds only a delay send. It is the
   * one hand-written voice no Tone class can approach, not because it is complicated but
   * because it is nine oscillators where every class in the allowlist has one or two.
   *
   * Two controls stop it being only an organ, and each is one knob where the honest
   * version is nine:
   *
   *   stretch  inharmonicity, the piano/bell law `r′ = r·√(1 + stretch·r²)`. At zero the
   *            partials are the harmonic series and this is a Hammond. Wound up they
   *            spread, and a spread stack is a bell, a gong, a struck bar.
   *   damp     how much faster the top of the stack decays: partial n falls over
   *            `decay · ratio^-damp`. At zero every partial decays together, which is what
   *            an organ does and what nothing struck does. A bell needs BOTH — an
   *            inharmonic stack with no damping is a siren, not a bell.
   *
   * Like `_playNoise` and `_playDrum`: native nodes, one-shot, never pooled. More
   * deterministic than either, in fact, because there is no noise in it at all.
   */
  _playAdditive(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', preview = false }) {
    const ctx = this.ctx;
    const a = v.additive;
    if (!a) return false;
    const bars = Array.isArray(a.bars) ? a.bars : [];
    // A stack with every bar pushed in is silence, not a sound. Said here rather than left
    // to arithmetic so that `/voice-save`'s silence check is not the thing that finds it.
    if (!bars.some((b) => b > 0)) return false;
    const ratios = Array.isArray(a.ratios) && a.ratios.length ? a.ratios : DRAWBAR_RATIOS;
    const count = Math.min(a.count ?? bars.length, bars.length, ratios.length);
    const wave = nativeWave(a.type, 'sine');
    const notes = Array.isArray(freq) ? freq : [freq];
    const hum = v.humanize || {};
    const shift = VoiceRack.pitchShift(v) * detune;
    const stretch = a.stretch ?? 0;
    const damp = a.damp ?? 0;
    const p = a.pitch;
    // Above this a partial does not add brightness, it folds back down the spectrum as a
    // frequency that was never in the chord. Nine bars reach the eighth harmonic, so the
    // top of the stack crosses it two octaves before the fundamental does.
    const nyquist = ctx.sampleRate * 0.5;

    // ONE LFO for the whole note-on, built exactly as `_playGame` builds its own: the
    // same `vibrato` key, the same 0–1 depth, the same ±100 cents at full travel and the
    // same onset delay. `commonRows` puts VIB DEPTH on every preset in the library, so a
    // path that ignored it would be a control that silently does nothing on one synth and
    // works on the next — and the whole point of the key being shared is that a preset's
    // wobble follows it onto any lane and into any song.
    //
    // Shared by every partial rather than one each: nine oscillators each with their own
    // LFO would drift apart on any rate rounding, and a stack that wobbles out of step
    // with itself is a chorus, not a vibrato.
    const vib = v.vibrato && v.vibrato.depth > 0 ? v.vibrato : null;
    let vibCents = null; let lfo = null; let lastOff = 0;
    if (vib) {
      lfo = ctx.createOscillator();
      lfo.type = nativeWave(vib.type, 'sine');
      // `?? 5` matches both other paths, so a preset with a depth and no rate wobbles at
      // the same speed whichever one plays it.
      lfo.frequency.setValueAtTime(Math.max(0.01, vib.rate ?? 5), time);
      // Depth grows from nothing to full over `vibrato.delay` — a fade rather than a
      // gate, because that is what a player does and a wobble arriving at full depth
      // mid-note is heard as a fault. Zero ramps within a millisecond, which is the
      // behaviour without it.
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(1, time + Math.max(0.001, vib.delay || 0.001));
      // Cents, because that is what `OscillatorNode.detune` takes — and because a param's
      // automation and its incoming connections SUM, this rides on top of whatever the
      // partial's own pitch envelope is doing rather than fighting it.
      vibCents = ctx.createGain();
      // Uncapped, exactly as `_playGame` is: one key, one scale of 100 cents to the
      // unit, and the same octave of travel at the top of the pot. A cap here and not
      // there would be the same preset wobbling differently on two lanes.
      vibCents.gain.setValueAtTime(vib.depth * 100, time);
      lfo.connect(env); env.connect(vibCents);
    }

    // Humanise only. NO TAPS on this path, for the reason `play` gives: a repeated hit
    // is a percussion idea, and the drum and noise paths are where percussion lives.
    {
      const t = time;
      const fade = vary(hum.gain, time, 0);
      const bend = vary(hum.pitch, time, 16);

      // One summing point per hit: it carries the note's level, and it is the only thing
      // that decides whether this hit reaches the echo. Every partial lands inside it.
      const out = ctx.createGain();
      out.gain.value = gain * fade;
      out.connect(dry);
      if (echo && wet && a.echo !== false) out.connect(wet);
      // The percussion register is always dry, so it needs a bus of its own — built only
      // if a preset actually pulls it. See below for why it is kept out of the echo.
      let perc = null;
      const percBus = () => {
        if (!perc) {
          perc = ctx.createGain();
          perc.gain.value = gain * fade;
          perc.connect(dry);
        }
        return perc;
      };

      notes.forEach((f, n) => {
        if (!(f > 0)) return;
        // One length for the whole chord, or one per note positionally aligned with `freq`
        // — how a piano roll that draws a rectangle per chord tone says the tones differ.
        const noteDur = Array.isArray(dur) ? (dur[n] ?? dur[0]) : dur;
        const end = t + Math.max(0.001, noteDur || 0.001);
        const base = f * shift * bend;
        // A drawbar stack under a finger holds, exactly as the organ it is modelled on
        // does — one envelope shared by every partial, so they let go together. The
        // percussion register below is deliberately NOT held: a Hammond's percussion is a
        // circuit constant that strikes once and is gone however long the key is down.
        const stackHolds = preview && (a.sustain ?? 0) > 0;
        const heldParams = [];
        const heldSources = [];

        for (let k = 0; k < count; k++) {
          const level = bars[k];
          // A bar at zero is a bar that is not pulled out. Skipping it rather than running
          // an oscillator at 1e-4 is most of the reason nine partials cost what five did.
          if (!(level > 0)) continue;
          const r = ratios[k];
          const partial = base * (stretch > 0 ? r * Math.sqrt(1 + stretch * r * r) : r);
          if (!(partial > 0) || partial >= nyquist) continue;
          const o = ctx.createOscillator();
          o.type = wave;
          o.frequency.setValueAtTime(partial * (p ? (p.from ?? 1) : 1), t);
          // The whole registration bends together, each partial keeping its ratio — which
          // is what `organSwoop` is, and what stops a glide sounding like a chord sliding
          // apart. Through `pitchRamp`, so the bend speaks the same curve vocabulary as
          // every other pitch move in the rack — exp glide, lin whip, snap thud.
          if (p && (p.to ?? 1) !== (p.from ?? 1)) {
            pitchRamp(o.frequency, Math.max(1, partial * (p.to ?? 1)), t,
              p.sweep, p.curve);
          }
          const g = ctx.createGain();
          // `damp` tilts the decay across the stack. Ratios BELOW one — the sub-octave
          // bars — come out longer, which is what a real one does too.
          const decay = damp > 0 ? a.decay * (r ** -damp) : a.decay;
          const shape = {
            attack: a.attack, decay, sustain: a.sustain, release: a.release,
            attackCurve: a.attackCurve, curve: a.curve, releaseCurve: a.releaseCurve,
          };
          const off = adsr(g.gain, t, stackHolds ? t + HOLD_SECONDS : end, level, shape, stackHolds);
          if (stackHolds) { heldParams.push({ param: g.gain, e: shape }); heldSources.push(o); }
          if (vibCents) vibCents.connect(o.detune);
          o.connect(g); g.connect(out);
          o.start(t); o.stop(off + 0.01);
          lastOff = Math.max(lastOff, off + 0.01);
        }
        if (stackHolds && heldParams.length) {
          const noteKey = `${laneKey}|${f.toFixed(2)}`;
          this._releasePreview(noteKey);
          this._heldNative.set(noteKey, { params: heldParams, sources: heldSources });
        }

        // Hammond percussion: one louder partial struck on the key attack and gone long
        // before the note is. Its decay is in SECONDS rather than a fraction of the note,
        // because a real percussion register is a circuit constant — fast or slow whatever
        // the player holds. Kept dry, as the engine keeps it, so that repeated off-beat
        // stabs stay crisp; a pip inside a delay is a rattle.
        const pc = a.perc;
        if (pc && (pc.gain ?? 0.72) > 0) {
          const pf = base * (pc.ratio ?? 3);
          if (pf > 0 && pf < nyquist) {
            const o = ctx.createOscillator();
            o.type = wave;
            o.frequency.setValueAtTime(pf, t);
            const g = ctx.createGain();
            // The strike falls across its OWN length — stated, now that `decay: 0` no
            // longer means "as long as the note". Passing the span twice looks odd and
            // is exactly right: it is the note, and it is how long the fall takes.
            const percSpan = Math.max(0.005, pc.decay ?? 0.08);
            const off = adsr(g.gain, t, t + percSpan, pc.gain ?? 0.72,
              { attack: pc.attack ?? 0.002, decay: percSpan, sustain: 0, release: 0.01 });
            if (vibCents) vibCents.connect(o.detune);
            o.connect(g); g.connect(percBus());
            o.start(t); o.stop(off + 0.01);
            lastOff = Math.max(lastOff, off + 0.01);
          }
        }
      });
    }
    // Started once the last partial has said when it ends. An LFO left running past the
    // note it belongs to is a node nothing disposes.
    if (lfo && lastOff) { lfo.start(time); lfo.stop(lastOff); }
    return true;
  }

  /**
   * A layered voice: up to three oscillator sections, each a COMPLETE voice — its own
   * ratio, level, note-length multiplier, envelope, filter, pitch envelope, FM operator
   * and unison — summed into the drum path's drive/tone. A section's waveform may also
   * be `noise`: GameSynth's pitched noise, built in the unison loop below. This is what the hand-written
   * melodic voices in scheduleStep are (a square, a sine an octave down, a triangle an
   * octave up, each at its own level and its own length), and the one shape no Tone
   * class in the allowlist can say.
   *
   * The per-layer `len` is the part with no commercial parallel and the part that makes
   * the engine voices sound like themselves: bass80s' octave layer lasts 0.62 of the
   * note where its sub lasts 1.08, which is a drum-machine idea (per-section decay)
   * applied to a melodic voice. Everything else is a Roland partial by another name.
   *
   * One output chain per hit — every layer sums into the same drive, which is much of
   * what makes a stack read as one instrument. Whether the echo bus hears the voice is
   * the LANE's decision alone: a per-layer send/dry flag existed briefly and lost — a
   * routing choice no synth offers, hiding on a synth panel. `wet` is tapped after the
   * shaper, as `_playDrum` taps it: the echo bus hears the instrument, not its guts.
   * Per-note level after the shaper too, and for the same reason (`voiceGain`
   * linearity).
   *
   * The LFO is KEY-SYNCED — one oscillator per note-on, phase zero, faded in over
   * `delay`. Deliberate, not a bug: a free-running rack-level LFO is order-dependent
   * state a stem render would have to reproduce, and this file's whole discipline is
   * that nothing here survives the note. Its targets are `filter` and `level` only;
   * pitch wobble is `$vibrato`, the same key with the same meaning as on every other
   * preset in the library.
   *
   * `mono` is the first native path to honour it: one sounding note per (lane, voice) —
   * a new note chokes the last over 5 ms — and `portamento` finally glides, from the
   * previous note's pitch, which per-note nodes remember via `_last`. Keyed with the
   * preview flag, like `_pool`, so a desk keypress cannot move the song's glide origin.
   * Stem-safe: a stem render deletes the OTHER lanes, so the kept lane sees the same
   * note sequence and glides identically.
   *
   * Like every native path: one-shot nodes, never pooled, nothing memoised by voice id
   * — which is exactly why live edits are audible on the next note.
   */
  _playLayer(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', preview = false }) {
    const ctx = this.ctx;
    const L = v.layer;
    if (!L) return false;
    // A layer at gain 0 is a layer taken out — skipped entirely, not run at 1e-4, or
    // the save-time measurement would hear it.
    //
    // SOLO rides the same filter, which is the whole of its implementation: a soloed
    // audition builds exactly the nodes that layer builds on its own, rather than
    // attenuating the others and leaving them to leak through the shared drive. Empty or
    // absent means everything plays; a set with anything in it plays only what it names,
    // and a layer switched OFF stays off — solo removes the others, it does not turn
    // anything on.
    const solo = this.soloLayers?.get(v.id) || null;
    const heard = (key) => !solo || solo.size === 0 || solo.has(key);
    const specs = [['osc1', L.osc1], ['osc2', L.osc2], ['osc3', L.osc3]]
      .filter(([key, s]) => s && (s.gain ?? 1) > 0 && heard(key))
      .map(([, s]) => s);
    if (!specs.length) return false;
    const all = Array.isArray(freq) ? freq : [freq];
    // A chord handed to a mono preset sounds its LAST note — the same answer the pool
    // gives (mono holds slot 0 and each chord tone restarts it), and what a hardware
    // mono synth does with one. Stacking all of them here would make MONO mean two
    // different things depending on which synth is behind the pill.
    const monoLast = v.mono === true ? all.filter((f) => f > 0).slice(-1) : null;
    const notes = monoLast && monoLast.length ? monoLast : all;
    const hum = v.humanize || {};
    const shift = VoiceRack.pitchShift(v) * detune;
    const nyquist = ctx.sampleRate * 0.5;
    const lfoSpec = L.lfo && (L.lfo.depth ?? 0) > 0
      && (L.lfo.target === 'filter' || L.lfo.target === 'level') ? L.lfo : null;
    // The global stage: one filter and one VCA the whole stack passes through, after
    // the layers and before the drive. Both sections optional and BOTH ABSENT IS THE
    // DEFAULT — a preset with no `global` block builds not one extra node and sums its
    // layers straight into the chain exactly as it always did, which is what keeps
    // every shipped preset sample-identical. Either one present is the summed voice:
    // three layers arriving at one filter and one envelope, which is the difference
    // between a stack of sounds and an instrument.
    const gf = v.global?.filter || null;
    const gv = v.global?.vca || null;

    // ---- the shared modulators, one of each per note-on ----------------------
    // Vibrato exactly as `_playAdditive` builds it: the same key, the same 0–1 depth,
    // ±100 cents at full travel, the same onset delay — a preset's wobble means one
    // thing whichever synth plays it. Every oscillator of every layer takes it on
    // `.detune`, where it SUMS with the unison spread rather than fighting it.
    const vib = v.vibrato && v.vibrato.depth > 0 ? v.vibrato : null;
    let lastOff = 0;
    // ---- the ensemble ------------------------------------------------------
    //
    // SPREAD scatters the vibrato across the unison voices — each one its own rate and
    // its own starting phase — which is the difference between a section and one singer
    // through a chorus. Locked together (the default, and every preset written before
    // this) they are one wobble arriving at nine oscillators, and the ear hears the lock.
    //
    // Seeded on the UNISON INDEX and nothing else, which is the whole design: voice 2 is
    // the SAME singer in osc1, osc2 and osc3, because a person has one larynx feeding all
    // of their formants. Seed it per (layer, index) instead and one singer's F1 and F3
    // would wobble apart, which does not sound like a bigger choir — it sounds like the
    // voice coming apart. The note's own time is in the seed too, so a second note is a
    // slightly different section rather than a copy of the first.
    const vibSpread = Math.min(1, Math.max(0, vib?.spread ?? 0));
    const vibOscs = [];
    const vibVoices = new Map();
    const vibFor = (u) => {
      if (!vib) return null;
      // Locked: ONE modulator, shared, exactly the graph this path has always built. A
      // preset that never touches SPREAD renders the identical samples it did before.
      const key = vibSpread > 0 ? u : 0;
      const held = vibVoices.get(key);
      if (held) return held;
      const lfo = ctx.createOscillator();
      const rate = Math.max(0.01, vib.rate ?? 5);
      if (vibSpread > 0) {
        // ±10% of rate at full spread — the range a real section actually covers. Wider
        // stops being an ensemble and starts being out of tune with itself.
        lfo.frequency.setValueAtTime(rate * vary(vibSpread * 0.1, time, 911 + key), time);
        lfo.setPeriodicWave(phasedWave(ctx, vib.type, hitRandom(time, 977 + key) * 2 * Math.PI * vibSpread));
      } else {
        lfo.type = nativeWave(vib.type, 'sine');
        lfo.frequency.setValueAtTime(rate, time);
      }
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(1, time + Math.max(0.001, vib.delay || 0.001));
      const cents = ctx.createGain();
      cents.gain.setValueAtTime(Math.min(1, vib.depth) * 100, time);
      lfo.connect(env); env.connect(cents);
      vibOscs.push(lfo);
      vibVoices.set(key, cents);
      return cents;
    };
    // The routable LFO. Unit-amplitude oscillator, onset fade, then one depth gain in
    // the units its destination takes: cents for a filter's `.detune` (2400 at full —
    // two octaves of movement), a plain modulation gain for tremolo.
    let lfoOsc = null; let lfoOut = null;
    if (lfoSpec) {
      lfoOsc = ctx.createOscillator();
      lfoOsc.type = nativeWave(lfoSpec.type, 'sine');
      lfoOsc.frequency.setValueAtTime(Math.max(0.01, lfoSpec.rate ?? 4), time);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(1, time + Math.max(0.001, lfoSpec.delay || 0.001));
      lfoOut = ctx.createGain();
      const depth = Math.min(1, lfoSpec.depth);
      lfoOut.gain.setValueAtTime(lfoSpec.target === 'filter' ? depth * 2400 : depth / 2, time);
      lfoOsc.connect(env); env.connect(lfoOut);
    }

    // ---- glide and choke ----------------------------------------------------
    const mono = v.mono === true;
    const glideKey = `${laneKey}|${v.id}${preview ? '|p' : ''}`;
    this._last ||= new Map();
    const prev = mono ? this._last.get(glideKey) : null;
    const glideFrom = prev && v.portamento > 0 ? prev.freq : null;
    // The choke: a hardware mono synth cuts the note still ringing. 5ms, on the OLD
    // note's own output gains — its envelopes are already written, so this is a cancel
    // and a fast fade rather than a fight over the same events.
    if (mono && prev && prev.stopAt > time) {
      for (const o of prev.outs) {
        o.gain.cancelScheduledValues(time);
        o.gain.setValueAtTime(o.gain.value, time);
        o.gain.linearRampToValueAtTime(0, time + 0.005);
      }
    }

    const allOuts = [];
    let lastBase = 0;
    {
      const t = time;
      // Humanise only. NO TAPS on this path: a tap is one hit repeated milliseconds
      // later — a clap, a flam — which is a percussion idea, and every preset in the
      // catalogue that uses one is a clap or a roll. On a melodic voice the slapback
      // it would give you belongs on the strip's delay insert, which is exactly why
      // the finale and walking basses had their written-in `bassRepeat` removed.
      const fade = vary(hum.gain, time, 0);
      const bend = vary(hum.pitch, time, 16);
      const toneMul = vary(hum.filter, time, 32);
      // Seconds, not a multiplier: how far apart the unison voices come in.
      const entry = Math.max(0, Math.min(0.08, hum.entry ?? 0));

      // One chain per note, built on demand: shaper → tone → trem → out. A note of
      // nothing but rests builds none of it.
      let chain = null;
      const chainFor = () => {
        if (chain) return chain;
        const out = ctx.createGain();
        out.gain.value = gain * fade;
        out.connect(dry);
        if (echo && wet) out.connect(wet);
        allOuts.push(out);
        let into = out;
        if (lfoSpec && lfoSpec.target === 'level') {
          // Tremolo between (1 - depth) and 1: the carrier gain sits at 1 - depth/2
          // and the LFO adds ±depth/2 on top. In BOTH chains, from the one LFO.
          const trem = ctx.createGain();
          trem.gain.setValueAtTime(1 - Math.min(1, lfoSpec.depth) / 2, t);
          lfoOut.connect(trem.gain);
          trem.connect(into); into = trem;
        }
        if (v.tone) {
          const tf = ctx.createBiquadFilter();
          tf.type = v.tone.type || 'lowpass';
          tf.frequency.value = Math.max(20, (v.tone.freq ?? 8000) * toneMul);
          tf.Q.value = v.tone.Q ?? 0.7;
          tf.connect(into); into = tf;
        }
        if (v.drive > 0) {
          const shaper = ctx.createWaveShaper();
          shaper.curve = this._driveCurve(v.drive, v.shape);
          shaper.connect(into); into = shaper;
        }
        chain = { into };
        return chain;
      };

      notes.forEach((f, n) => {
        if (!(f > 0)) return;
        // `dur` aligns with the ORIGINAL chord positionally — a mono preset that kept
        // only the last tone must read that tone's own drawn length, not the first's.
        const di = monoLast ? all.lastIndexOf(f) : n;
        const noteDur = Array.isArray(dur) ? (dur[di] ?? dur[0]) : dur;
        const base = f * shift * bend;
        lastBase = base;

        // ---- the global stage, built PER NOTE -------------------------------
        //
        // Per note rather than per note-on, and that is the whole design rather than a
        // detail: KEY FOLLOW has to read THIS note's frequency, and one filter shared
        // by three sounding notes is a paraphonic synth. Inside the loop each chord
        // tone gets its own filter and its own VCA, so per-note lengths work and a held
        // chord releases note by note.
        //
        // Lazy for the same reason `chainFor` is: a note whose every layer is skipped —
        // all above nyquist, or noise with no buffer — builds nothing at all.
        //
        // The VCA's length is the DRAWN note, never a layer's `len`. `len` is what makes
        // one layer die inside another; this envelope belongs to the note over all of
        // them, and a layer at GATE 62% still ends where it always did.
        const gEnd = t + Math.max(0.001, noteDur || 0.001);
        // ---- held notes -------------------------------------------------------
        //
        // A previewed note is played by a FINGER, so it has no length until the finger
        // says so. Anything with a sustain above zero runs to that level and waits there;
        // anything at sustain 0 is a struck sound and dies exactly as written, because
        // that is what a struck sound IS — `bestMonsterBass`' octave tick should not hang
        // just because somebody is leaning on the key. GATE stops meaning anything on a
        // sustaining layer under a held note, which is correct: 62% of "until I let go"
        // is not a length.
        const holdEnd = t + HOLD_SECONDS;
        const heldParams = [];
        const heldSources = [];
        let stage = null;
        const stageFor = () => {
          if (stage) return stage;
          // Built from the OUTPUT backwards, so the signal reads filter → VCA → drive.
          // The VCA sits last because the shaper should hear an enveloped note, which
          // is what every subtractive synth does and most of why drive sounds like
          // playing rather than like a setting.
          let head = chainFor().into;
          if (gv) {
            const vg = ctx.createGain();
            // Peak 1: the level lives on the layers and on the note's own gain. A third
            // control called LEVEL on one signal path is how two of them end up wrong.
            const vcaHolds = preview && (gv.sustain ?? 0) > 0;
            const off = adsr(vg.gain, t, vcaHolds ? holdEnd : gEnd, 1, gv, vcaHolds);
            if (vcaHolds) heldParams.push({ param: vg.gain, e: gv });
            // The modulators have to outlive this tail — a global release longer than
            // every layer's would otherwise have its LFO stopped out from under it.
            // The oscillators still stop at their OWN layer's off: a VCA can only shape
            // what is playing, and running them to the global tail would pay for silence.
            lastOff = Math.max(lastOff, off);
            vg.connect(head); head = vg;
          }
          if (gf) {
            const track = gf.track > 0 ? (base / 110) ** Math.min(1, gf.track) : 1;
            const chain = this._filterChain(
              { type: gf.type, slope: gf.slope, freq: gf.freq, Q: gf.Q },
              t, track * toneMul, 'lowpass', 1150,
            );
            chain.tail.connect(head);
            // One target, every filter in the patch — the layers' and this one. A third
            // pill value naming which filter to breathe would be a routing choice hiding
            // on a modulation control.
            if (lfoSpec && lfoSpec.target === 'filter') {
              for (const st of chain.stages) lfoOut.connect(st.detune);
            }
            filterEnv(chain.stages, gf.env, t, gEnd);
            head = chain.head;
          }
          stage = { head };
          return stage;
        };

        // eslint-disable-next-line no-loop-func
        const registerHold = () => {
          if (!preview || !heldParams.length) return;
          const noteKey = `${laneKey}|${f.toFixed(2)}`;
          // The same key pressed again restarts rather than stacking — the pooled path's
          // own rule, applied here so both behave alike under a trill.
          this._releasePreview(noteKey);
          this._heldNative.set(noteKey, { params: heldParams, sources: heldSources });
        };

        for (const spec of specs) {
          // The per-layer length: this layer's own note, as a fraction (or multiple)
          // of the drawn one. bass80s' octave tick lives and dies inside the note the
          // sub is still holding — that is the sound, not an approximation of it.
          const end = t + Math.max(0.001, (noteDur || 0.001) * (spec.len ?? 1));
          const ratio = spec.ratio ?? 1;
          const target = base * ratio;
          if (!(target > 0) || target >= nyquist) continue;
          // `noise` is a waveform here exactly as it is on GameSynth: the seeded
          // buffer through a bandpass that follows the note. Every pot still means
          // something — RATIO, DETUNE, the pitch envelope, glide and FM all drive the
          // band's centre the way they drive an oscillator's frequency — so a noise
          // layer is a full member of the stack, not a special case with dead
          // controls. A rack built without the buffer skips the layer, the same
          // answer `_playGame` gives for the whole voice.
          const isNoise = spec.type === 'noise';
          if (isNoise && !this.noiseBuf) continue;
          // Where this layer sums: the global stage when the preset has one, the note-on
          // chain when it does not. The null path is the old line unchanged.
          const into = (gf || gv) ? stageFor().head : chainFor().into;

          // The layer's own gain, enveloped once and shared by its unison voices.
          const g = ctx.createGain();
          const layerHolds = preview && (spec.sustain ?? 0) > 0;
          const off = adsr(g.gain, t, layerHolds ? holdEnd : end, spec.gain ?? 1, spec, layerHolds);
          if (layerHolds) heldParams.push({ param: g.gain, e: spec });
          lastOff = Math.max(lastOff, off);

          // The filter, when the layer has one — per layer, not per unison voice: a
          // fat stack through one filter is a synth voice, through five is a chorus
          // of synths, and the engine voice being recreated had one.
          let dest = g;
          if (spec.filter) {
            const fl = spec.filter;
            const track = fl.track > 0 ? (base / 110) ** Math.min(1, fl.track) : 1;
            // A static base — CUTOFF times KEY FOLLOW — with all the movement on the
            // envelope and the LFO, which is how every software synth states it. The
            // freq/to/sweep language the drums and the Game synth speak is deliberately
            // NOT passed through here: the layer card dropped the sweep pair, and the
            // shipped sweeps were rewritten as envelopes (CUTOFF at the floor, a
            // positive ENV AMOUNT of log2(top/floor) octaves, decay across the note —
            // the same exponential trajectory _filterChain used to schedule).
            const chain = this._filterChain(
              { type: fl.type, slope: fl.slope, freq: fl.freq, Q: fl.Q },
              t, track * toneMul, 'lowpass', 1150,
            );
            chain.tail.connect(g);
            if (lfoSpec && lfoSpec.target === 'filter') {
              for (const st of chain.stages) lfoOut.connect(st.detune);
            }
            // The filter envelope — the MonoSynth card's model on the native path:
            // ENV AMOUNT octaves up from CUTOFF and back, over its own ADSR. Written
            // in cents on `.detune`, where it SUMS with the LFO's breathing and rides
            // on top of whatever the sweep pair is doing to the base frequency.
            // Linear in cents IS exponential in hertz, so the travel is musically
            // even. Bipolar, which Tone's positive-only `octaves` could not say: a
            // negative amount is a pluck closing from above. Times are plain seconds and
            // sustain rides them, exactly as the amp envelope reads them.
            //
            // The same helper the global filter below uses, so the two move alike.
            filterEnv(chain.stages, fl.env, t, end);
            dest = chain.head;
          }
          g.connect(into);

          // Unison: free at 1 — no extra nodes, no detune arithmetic. Above 1 the
          // voices sit symmetrically across `spread` cents on `.detune`, scaled by
          // 1/√count so a stack arrives at the level one voice did.
          const count = Math.max(1, Math.min(5, Math.round(spec.unison ?? 1)));
          const norm = count > 1 ? 1 / Math.sqrt(count) : 1;
          // The bandwidth makeup `_playGame` derives: a bandpass keeps only its
          // slice of the noise, the slice narrows with the note, and the level goes
          // as the square root of it. Same NOISE_Q, same formula, so a noise layer
          // sits at the level of the oscillators beside it at every pitch.
          const makeup = isNoise
            ? Math.sqrt(nyquist / Math.max(20, target / NOISE_Q)) : 1;
          let fmSpread = null;

          // ---- pulse width modulation ------------------------------------------
          //
          // A PeriodicWave cannot be swept, so a MOVING width is built the other way:
          // `pulse(t) = saw(t) − saw(t − Δ)` with `Δ = duty / frequency`. Delay time is
          // an AudioParam, so an LFO reaches it — and two band-limited saws differenced
          // are still band-limited, with EXACTLY zero DC because both have the same mean.
          // Two oscillators instead of one is the price, and it is only paid by a layer
          // that actually asks to move.
          //
          // The modulator is built per NOTE rather than per note-on, because its depth is
          // in SECONDS and seconds-per-duty depends on the note — the same reason
          // `_playGame` needs a gain per note to put vibrato in hertz on a tracking
          // bandpass. Every one starts at the same instant with the same phase, so a
          // chord's notes still breathe together: this costs nodes, not a sound.
          const pwm = spec.type === 'pulse' && spec.pwm && (spec.pwm.depth ?? 0) > 0
            ? spec.pwm : null;
          const wCentre = Math.min(0.95, Math.max(0.05, spec.width ?? 0.5));
          let pwmSecs = null;
          if (pwm) {
            const lfo = ctx.createOscillator();
            lfo.type = nativeWave(pwm.type, 'sine');
            lfo.frequency.setValueAtTime(Math.max(0.01, pwm.rate ?? 0.4), t);
            const env = ctx.createGain();
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(1, t + Math.max(0.001, pwm.delay || 0.001));
            // How far the duty may swing before it would leave the range a pulse HAS: at
            // a 20% centre it can fall no further than 15 points, and asking for more is
            // asking for a duty of zero, which is silence rather than a wider sound.
            const room = Math.min(wCentre - 0.05, 0.95 - wCentre);
            const swing = Math.min(room, Math.min(1, pwm.depth) * 0.45);
            pwmSecs = ctx.createGain();
            pwmSecs.gain.setValueAtTime(swing / target, t);
            lfo.connect(env); env.connect(pwmSecs);
            lfo.start(t); lfo.stop(off + 0.01);
          }

          for (let u = 0; u < count; u++) {
            // The source and the params that carry its pitch and detune — an
            // oscillator's own, the bandpass that gives the noise its, or BOTH saws of a
            // modulated pulse. A biquad's `.detune` is cents like an oscillator's, so the
            // spread and the vibrato land on any of them without conversion.
            let out;
            const sources = [];        // everything that needs start() and stop()
            const pitches = [];        // every frequency param the note must be written to
            const dets = [];           // every detune param the spread and vibrato reach
            let o;
            if (isNoise) {
              o = ctx.createBufferSource();
              o.buffer = this.noiseBuf;
              // Looped: the buffer is half a second and a held note is not. The
              // band takes the edge off the seam, as it does everywhere this
              // buffer plays.
              o.loop = true;
              const bp = ctx.createBiquadFilter();
              bp.type = 'bandpass';
              bp.Q.setValueAtTime(NOISE_Q, t);
              o.connect(bp);
              out = bp; sources.push(o);
              pitches.push(bp.frequency); dets.push(bp.detune);
            } else if (pwm) {
              // Two saws, one delayed by the duty and subtracted. Both take the note, the
              // detune, the spread, the pitch envelope and the FM together — they are one
              // oscillator wearing two nodes, and anything written to only one of them
              // would come out as a phasing artefact rather than as a pulse.
              const a = ctx.createOscillator(); a.type = 'sawtooth';
              const b = ctx.createOscillator(); b.type = 'sawtooth';
              // 0.25s is four seconds' worth of headroom at the lowest note anything here
              // can play; the delay only ever holds one cycle's fraction.
              const line = ctx.createDelay(0.25);
              const inv = ctx.createGain(); inv.gain.value = -1;
              const sum = ctx.createGain();
              a.connect(sum);
              b.connect(line); line.connect(inv); inv.connect(sum);
              line.delayTime.setValueAtTime(wCentre / target, t);
              pwmSecs.connect(line.delayTime);
              out = sum; sources.push(a, b);
              pitches.push(a.frequency, b.frequency); dets.push(a.detune, b.detune);
            } else {
              o = ctx.createOscillator();
              // `pulse` is the fifth waveform: a table rather than a type, at whatever
              // duty the layer asks for. Everything downstream — detune, unison, the
              // pitch envelope, FM, the filter — is identical to an oscillator's,
              // because it IS one.
              if (spec.type === 'pulse') o.setPeriodicWave(pulseTable(ctx, wCentre));
              else o.type = nativeWave(spec.type, 'square');
              out = o; sources.push(o);
              pitches.push(o.frequency); dets.push(o.detune);
            }
            const cents = (spec.detune ?? 0)
              + (count > 1 ? (spec.spread ?? 20) * (u / (count - 1) - 0.5) : 0);
            // The static offset is the pitch envelope's BASE when there is one, because
            // both live on `.detune` and an envelope scheduled from zero would cancel a
            // DETUNE written before it. Vibrato is a connected node, so it sums with
            // either and needs no such care.
            if (spec.pitch && (spec.pitch.semitones ?? 0) !== 0) {
              pitchEnv(dets, spec.pitch, t, end, cents);
            } else if (cents) for (const d of dets) d.setValueAtTime(cents, t);
            const vibCents = vibFor(u);
            if (vibCents) for (const d of dets) vibCents.connect(d);

            // Pitch and glide no longer compete. The envelope is cents on `.detune` and
            // the glide is hertz on `.frequency`, so a preset can do both: arrive from
            // the previous note AND bend on the way, which is a portamento lead with a
            // scoop and was unreachable while the two shared one param.
            for (const pitch of pitches) {
              if (glideFrom) {
                // A glide stays 'exp' — constant semitones per second is what a
                // portamento IS.
                pitch.setValueAtTime(Math.max(1, glideFrom * ratio), t);
                pitchRamp(pitch, target, t, Math.max(0.001, v.portamento));
              } else {
                pitch.setValueAtTime(target, t);
              }
            }

            // One modulator for the whole unison stack, mirroring `_playDrum`'s
            // operator: pitch fixed at the carrier's STARTING frequency, depth in
            // hertz as a multiple of it. Built with the first voice, fanned into the
            // rest — five modulators would beat against each other.
            if (spec.fm && (spec.fm.index ?? 1) > 0) {
              if (!fmSpread) {
                const mod = ctx.createOscillator();
                mod.type = nativeWave(spec.fm.type, 'sine');
                mod.frequency.setValueAtTime(target * (spec.fm.ratio ?? 1.4), t);
                fmSpread = ctx.createGain();
                // Its own envelope through the same helper — a long decay is the
                // modulation swelling across the note, which is what brass is.
                adsr(fmSpread.gain, t, end, target * (spec.fm.index ?? 1), {
                  attack: spec.fm.attack, decay: spec.fm.decay, sustain: 0, release: 0,
                });
                mod.connect(fmSpread);
                mod.start(t); mod.stop(off + 0.01);
              }
              for (const pitch of pitches) fmSpread.connect(pitch);
            }

            // ---- where in the field this voice stands ---------------------
            //
            // A unison stack has always been detuned but never PLACED: five voices at
            // five pitches arriving at one point. Spreading them across the field is what
            // turns a thick mono sound into a wide one, and it is the cheap half of that
            // — the oscillators are unchanged, one panner splits each into two channels.
            //
            // BEFORE the layer's filter, deliberately: the filter stays ONE node handling
            // a stereo signal with the same cutoff on both sides, rather than becoming a
            // filter per voice. That is the difference between costing a second channel
            // and costing five filters.
            //
            // Skipped entirely at zero — no node, no stereo, the same graph and the same
            // samples this path has always produced.
            let sink = dest;
            const width = Math.min(1, Math.max(0, spec.stereo ?? 0));
            if (width > 0 && count > 1 && ctx.createStereoPanner) {
              const pn = ctx.createStereoPanner();
              // Symmetric about the centre, like the detune spread it sits beside: at
              // full width the outer voices are hard left and hard right and the middle
              // one stays put.
              pn.pan.setValueAtTime((u / (count - 1) - 0.5) * 2 * width, t);
              pn.connect(dest);
              sink = pn;
            }
            if (norm * makeup !== 1) {
              const ng = ctx.createGain(); ng.gain.value = norm * makeup;
              out.connect(ng); ng.connect(sink);
            } else out.connect(sink);
            // ENTRY: singers do not come in together. A few milliseconds of stagger per
            // unison voice is the cheapest human thing in the whole path — and it is the
            // same seed as the vibrato, so voice 2 is late in every layer at once rather
            // than smearing one singer's formants apart in time.
            const late = entry > 0 ? hitRandom(t, 1013 + u) * entry : 0;
            for (const src of sources) { src.start(t + late); src.stop(off + 0.01); }
            if (layerHolds) heldSources.push(...sources);
          }
        }
        registerHold();
      });
    }

    // `adsr` returns ABSOLUTE times, so these are used as they are — adding `time`
    // would double-count and leave modulator nodes running seconds past the note.
    if (mono && lastBase > 0) {
      this._last.set(glideKey, { freq: lastBase, outs: allOuts, stopAt: lastOff });
    }
    if (lastOff) for (const l of vibOscs) { l.start(time); l.stop(lastOff + 0.01); }
    if (lfoOsc && lastOff) { lfoOsc.start(time); lfoOsc.stop(lastOff + 0.01); }
    return true;
  }

  /**
   * The drive's transfer curve, cached per amount and shape, normalised so the curve
   * always reaches full scale and the drive changes the KNEE rather than the level.
   * Deterministic — a formula, not noise — so it renders offline like everything else.
   *
   * Three shapes, and they are three different jobs rather than three flavours of the
   * same one. `soft` is a desk being pushed: it rounds the top of a transient and adds
   * the harmonics above it. `fold` turns the peak back on itself, so past a point MORE
   * level makes a DIFFERENT sound instead of a louder one — ring-modulator territory,
   * where a kick's body turns to metal. `crush` throws away resolution, which is
   * quantisation noise riding the signal and the one that sounds like hardware.
   *
   * Only FOLD and CRUSH are named below; everything else falls through to the soft
   * curve. That is what lets the shape be RENAMED without touching a preset — `soft`
   * and the older `tanh` both land in the same branch and render identically.
   */
  _driveCurve(amount, shape = 'soft') {
    this._driveCurves ||= new Map();
    const key = `${shape}:${Math.round(amount * 100)}`;
    let curve = this._driveCurves.get(key);
    if (curve) return curve;
    const a = Math.round(amount * 100) / 100;
    curve = new Float32Array(1025);
    if (shape === 'fold') {
      // A sine folder: past full scale the transfer turns over rather than clipping,
      // so the folds are smooth and there is no step for aliasing to hang off.
      const k = 1 + a ** 2 * 12;
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.sin(k * x * Math.PI * 0.5);
      }
    } else if (shape === 'crush') {
      // Twelve bits down to two across the dial. Rounded rather than truncated so the
      // curve stays odd-symmetric and a quiet hit does not pick up a DC step.
      const bits = Math.max(1.5, 12 - a * 10);
      const steps = 2 ** bits;
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.round(x * steps) / steps;
      }
    } else {
      // Square-law, like a drive knob: the bottom half of the travel is warmth, the
      // near-square crunch lives in the top quarter. Linear-in-k put a heavily
      // squared wave at 0.2 on the dial and left the rest of the travel repeating it.
      const k = 1 + a ** 2 * 24;
      const norm = Math.tanh(k);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / norm;
      }
    }
    this._driveCurves.set(key, curve);
    return curve;
  }

  /**
   * Take a pool out of service WITHOUT cutting off what it is playing.
   *
   * Disposing a pool disposes its synths, and disposing a synth mid-note is a hard
   * stop: the note you are listening to ends on the spot, and any note already booked
   * in the quarter-second lookahead never sounds at all. That is fine when the audio is muted
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
      // this panel that is MOST of the controls. LENGTH, TRANSPOSE, FINE,
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

  /**
   * Dispose only the pools created for an on-screen preview.
   *
   * A mixer can be playing its own Tone pools at the same time as the desk's
   * preset bench. Cutting the whole rack here would stop the song just because
   * somebody compared two sounds, so preview pools carry their own flag and are
   * the only ones this operation touches.
   */
  stopPreview() {
    for (const [key, pool] of [...this.pools]) {
      if (!pool.preview) continue;
      this.pools.delete(key);
      this._disposePool(pool);
    }
    for (const [timer, pool] of [...this._retired]) {
      if (!pool.preview) continue;
      clearTimeout(timer);
      this._retired.delete(timer);
      this._disposePool(pool);
    }
    this._activePreviews.clear();
    for (const held of this._heldNative.values()) {
      for (const src of held.sources) { try { src.stop(this.ctx.currentTime); } catch { /* ignore */ } }
    }
    this._heldNative.clear();
  }

  /** Release a previewed note — the other half of triggerAttack above. */
  releasePreview(laneKey, freq) {
    const noteKey = `${laneKey}|${freq.toFixed(2)}`;
    this._releasePreview(noteKey);
  }

  _releasePreview(noteKey) {
    const entry = this._activePreviews.get(noteKey);
    if (entry) {
      try { entry.slot.synth.triggerRelease(this.ctx.currentTime); } catch { /* ignore */ }
      this._activePreviews.delete(noteKey);
    }
    const held = this._heldNative.get(noteKey);
    if (held) {
      const at = this.ctx.currentTime;
      let stopAt = at;
      for (const h of held.params) {
        try { stopAt = Math.max(stopAt, releaseNow(h.param, at, h.e)); } catch { /* ignore */ }
      }
      // Re-scheduled, not stopped twice: the last `stop()` before a source has ended is
      // the one that takes effect, so this pulls the far-future stop back to the tail.
      for (const src of held.sources) { try { src.stop(stopAt + 0.01); } catch { /* ignore */ } }
      this._heldNative.delete(noteKey);
    }
  }

  dispose() {
    for (const [timer, pool] of this._retired) { clearTimeout(timer); this._disposePool(pool); }
    this._retired.clear();
    for (const pool of this.pools.values()) this._disposePool(pool);
    this.pools.clear();
    this._activePreviews.clear();
    this._heldNative.clear();
    // The glide origins. The nodes they point at belong to the dying context; keeping
    // the map would glide the next song's first note from the last song's last one.
    if (this._last) this._last.clear();
  }
}
