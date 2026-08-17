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

// Musical lengths are measured in sixteenths because the sequencer's `spb` is the
// seconds-per-sixteenth clock. The stored keys stay readable in the preset file while
// the native path gets one exact period at the current song tempo.
const LFO_TEMPO_STEPS = Object.freeze({
  '1/64': 0.25, '1/32': 0.5, '1/16': 1, '1/8': 2, '1/4': 4, '1/2': 8,
  // Keep old saved voices renderable even though the editor no longer offers these.
  '1bar': 16, '2bar': 32,
});

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
 * WHERE THE WAVE STARTS matters, and the cosine form gets it wrong on its own. `cos(nθ)`
 * centres the plateau on phase 0, so a note gated on at phase 0 starts at the TOP of the
 * pulse — measured across the Fourier sum, 84% of full scale at 50% duty and 96% at 5%.
 * A zero-attack gate on that is a one-sample step from silence, which is broadband and
 * which a low note has no top end of its own to hide: it is the tick at note-on. So the
 * terms are rotated by φ = πd, which slides the plateau to START at phase 0 — the same
 * rectangle, moved, not a different one: peak, harmonic amplitudes and timbre are
 * untouched to 1e-14 and only the phase moves. That takes the step to 0% at 50% duty and
 * to ~40% at the narrow end, where the two Gibbs edges are close enough to overlap. The
 * rest is `gateAdsr`'s minimum attack, which is what covers every waveform.
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
  // The rotation above, applied per harmonic: cos(nθ − nφ) = cos(nφ)cos(nθ) + sin(nφ)sin(nθ).
  const phi = Math.PI * d;
  for (let n = 1; n <= harmonics; n++) {
    const a = ((sine ? 2 : 4) / (n * Math.PI)) * Math.sin(n * Math.PI * d);
    if (sine) { imag[n] = a; continue; }
    real[n] = a * Math.cos(n * phi);
    imag[n] = a * Math.sin(n * phi);
  }
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  perCtx.set(key, wave);
  return wave;
}

/**
 * A slave oscillator whose phase is reset whenever Osc 1 completes a cycle.
 *
 * Web Audio has no hard-sync input on OscillatorNode. The reset waveform is nonetheless
 * periodic at the MASTER frequency, so it can be stated exactly as one PeriodicWave:
 * walk the slave waveform `ratio` times during one master cycle, then let the table's
 * boundary perform the reset. Non-integer ratios leave the discontinuity that gives hard
 * sync its bright, tearing spectrum; integer ratios collapse to an ordinary harmonic.
 *
 * The numerical Fourier projection keeps all six MRDR wave shapes on the native/offline
 * path. Tables are cached per context and authored setting, so the projection is paid on
 * the first note rather than on every note in a song.
 */
const syncTables = new WeakMap();
export function hardSyncTable(ctx, type, ratio, width = 0.5, harmonics = 96) {
  const kind = type === 'pulse' ? 'pulse' : nativeWave(type, 'square');
  const r = Math.max(0.01, ratio);
  const duty = Math.min(0.95, Math.max(0.05, width));
  let perCtx = syncTables.get(ctx);
  if (!perCtx) { perCtx = new Map(); syncTables.set(ctx, perCtx); }
  const key = `${kind}|${r.toFixed(5)}|${duty.toFixed(4)}|${harmonics}`;
  const hit = perCtx.get(key);
  if (hit) return hit;
  const samples = 1024;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let i = 0; i < samples; i++) {
    const master = (i + 0.5) / samples;
    const phase = (master * r) % 1;
    let value;
    if (kind === 'sine') value = Math.sin(phase * Math.PI * 2);
    else if (kind === 'square') value = phase < 0.5 ? 1 : -1;
    else if (kind === 'sawtooth') value = phase * 2 - 1;
    else if (kind === 'triangle') value = 1 - 4 * Math.abs(phase - 0.5);
    else value = phase < duty ? 1 : -1;
    const angle = master * Math.PI * 2;
    const cosStep = Math.cos(angle);
    const sinStep = Math.sin(angle);
    let cosN = cosStep;
    let sinN = sinStep;
    for (let n = 1; n <= harmonics; n++) {
      real[n] += value * cosN;
      imag[n] += value * sinN;
      const nextCos = cosN * cosStep - sinN * sinStep;
      sinN = sinN * cosStep + cosN * sinStep;
      cosN = nextCos;
    }
  }
  const scale = 2 / samples;
  for (let n = 1; n <= harmonics; n++) {
    real[n] *= scale;
    imag[n] *= scale;
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
 *
 * The cache is CAPPED, unlike the pulse tables beside it. A pulse table is keyed on a
 * duty a preset wrote down, so there are as many as the library has; a phase is drawn
 * fresh from the note's own start time for every note-on and every unison voice, so the
 * key space is the four decimals it is rounded to — tens of thousands of `PeriodicWave`s
 * per waveform over a long session, none of which is ever asked for twice. Oldest out
 * when the cap is reached, which is insertion order because that is what a `Map` keeps.
 * The cap only bounds memory: the wave built for a given phase is the same wave either
 * way, so nothing renders differently for having been evicted.
 */
const PHASE_WAVE_CACHE = 256;
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
  if (perCtx.size >= PHASE_WAVE_CACHE) perCtx.delete(perCtx.keys().next().value);
  perCtx.set(key, wave);
  return wave;
}

const NOISE_Q = 2;

// Where GameSynth's fall across the note LANDS, as a fraction of that note's own peak —
// the level a note-off finds, and therefore the level its RELEASE gets to work on. See
// the long note at the envelope itself in `_playGame`; this is the one number to turn.
const GAME_NOTE_OFF_LEVEL = 0.1;       // -20 dB

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
 * Does WHEN an MRDR-3 note is scheduled change WHAT it is?
 *
 * The question the note cache has to answer before it may stand in for a note, and the
 * companion to `hitRandom` above — which is why it lives here rather than beside the
 * cache. `hitRandom` is seeded from the note's own time and nothing else, so a preset
 * that never reaches it renders the same samples at every time it could be played, and
 * one buffer is the whole truth about that note.
 *
 * Every path in `_playLayer` that reaches it is guarded by one of these keys, and this
 * is the complete list:
 *
 *   humanize.gain / .pitch / .filter   `vary` at the top of the note (the fade, the
 *                                      bend and the drive's TONE multiplier)
 *   humanize.entry                     the unison entry stagger, `hitRandom(t, 1013+u)`
 *   vibrato.spread                     per-voice vibrato rate and starting PHASE
 *   lfo.type 'samplehold'              a fresh value per period, seeded on each step
 *
 * KEEP THIS IN STEP WITH `hitRandom`'S CALLERS. A new humanised path with no key here
 * would be cached as if it were still, which is the one failure this whole design is
 * arranged to avoid — so it is not left to vigilance:
 * `work/local/probe-layer-determinism.js` renders every shipped preset at two different
 * times and fails if the measurement and this function disagree.
 *
 * `vary` returns exactly 1 at amount 0 without calling `hitRandom` at all, so "the key
 * is absent or zero" and "the note does not vary" are the same statement.
 */
export function layerVariesWithTime(v) {
  const hum = v?.humanize || {};
  if ((hum.gain ?? 0) > 0 || (hum.pitch ?? 0) > 0
    || (hum.filter ?? 0) > 0 || (hum.entry ?? 0) > 0) return true;
  // Spread is what scatters the ensemble; a vibrato without it is one locked LFO
  // started at phase zero on the note, which is the same wobble every time.
  if ((v?.vibrato?.depth ?? 0) > 0 && (v.vibrato.spread ?? 0) > 0) return true;
  const lfo = v?.layer?.lfo;
  if (lfo && (lfo.depth ?? 0) > 0 && lfo.type === 'samplehold') return true;
  return false;
}

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
 * The gate-driven ADSR used by the native melodic synths.
 *
 * The older `adsr` helper is intentionally retained for struck/modulation envelopes. It
 * schedules a complete note-shaped fall and then a release after the written note length.
 * That is useful for one-shots, but it is not a standard synthesiser VCA: if a short note
 * ends during attack or decay, its release must begin at the level the envelope has reached
 * at note-off. MRDR-3 and AdditiveSynth are melodic instruments, so their note length is
 * the gate, not an instruction to finish the decay before releasing.
 *
 * `sustaining` is the live-preview form. The gate is held at `end` as a safety horizon and
 * `_releasePreview` later calls `releaseNow`, which reads the current AudioParam level. This
 * deliberately includes sustain-zero envelopes: they may already be silent when released,
 * but a key released during attack/decay still gets the standard tail.
 */
// The shortest ramp out of silence that is a fade rather than a step. Zero attack used to
// mean a bare `setValueAtTime(level, t)` — silence to full in one sample, which is a
// broadband click a low note has nothing bright enough to mask. A millisecond does not
// read as an attack (it is one cycle of a 1kHz tone) and it is the difference between a
// step and a slope at every pitch and on every waveform, including hard sync, where no
// amount of phase-rotating the table helps.
const GATE_MIN_ATTACK = 0.001;
// ...but a millisecond is not one thing. What makes a gate audible is how much of a CYCLE
// it interrupts, which is the same reason the mono choke is measured in periods: a
// millisecond is a whole cycle at 1kHz and a fiftieth of one at 55Hz, and the low note is
// where it ticks. So the floor is a quarter of a period, and it cannot be heard as a soft
// attack because it is over before the note has finished its first cycle. Measured on a
// 55Hz sine, where every harmonic above 2kHz is the gate and nothing else: a flat 1ms
// leaves -39dB of broadband energy at the onset, a quarter cycle leaves -52dB.
//
// Capped, so a sub-bass note cannot arrive late, and floored, so the top of the keyboard
// keeps the shortest fade that is still a fade. Above ~250Hz this is the millisecond.
const GATE_MAX_ATTACK_FLOOR = 0.005;
const gateFloor = (freq) => (freq > 0
  ? Math.min(GATE_MAX_ATTACK_FLOOR, Math.max(GATE_MIN_ATTACK, 0.25 / freq))
  : GATE_MIN_ATTACK);
// Below this the exponential attack curve is not a shape, it is the same step wearing a
// ramp's clothes: rising from 1e-4, it is still at 1% of level halfway through and does
// most of its travel in the last tenth of a millisecond. Short attacks go linear.
//
// And "short" is again a matter of cycles: the CURVE of an attack briefer than one period
// is not something the ear can hear, because there is no waveform under it for the shape
// to act on — measured, an authored 5ms exponential on a 55Hz note leaves 9dB more onset
// energy than a plain ramp and sounds no different. So the linear threshold rises with
// the period too, capped, because down at the bottom of the keyboard a period is long
// enough that a curve across it really is somebody's authored swell.
const GATE_LIN_ATTACK = 0.004;
const GATE_MAX_LIN_ATTACK = 0.015;
const gateLinUnder = (freq) => (freq > 0
  ? Math.min(GATE_MAX_LIN_ATTACK, Math.max(GATE_LIN_ATTACK, 1 / freq))
  : GATE_LIN_ATTACK);
function gateAdsr(param, t, end, peak, e = {}, sustaining = false, freq = 0) {
  // An AudioParam throws on a non-finite value, and this runs inside the scheduling
  // pass — one bad number from a malformed preset would kill not just this note but
  // every note after it, for as long as the song is up. Skipping the envelope leaves
  // the note silent (its gain never leaves zero) and the song playing, which is the
  // right way round. Off the hot path: four compares per note-on.
  // Zero, not `t`: the return is an absolute END TIME that callers feed to
  // `Math.max(lastOff, …)` and then to `stop()`, so handing back the bad number
  // would carry it straight into the next throw. Zero is the sentinel those callers
  // already test for (`if (lastOff)`), so a skipped envelope reads as "nothing was
  // scheduled", which is exactly what happened.
  if (!Number.isFinite(t) || !Number.isFinite(end) || !Number.isFinite(peak)) {
    console.warn('[voices] skipping an envelope with non-finite numbers', { t, end, peak });
    return 0;
  }
  const level = Math.max(1e-4, peak);
  // Floored, never zero: see gateFloor. An authored 0 still means "as immediate as this
  // note can be" — a quarter of its own cycle — rather than a scheduler-imposed fade-in.
  const minAttack = gateFloor(freq);
  const attack = Math.max(minAttack, e.attack ?? 0.01);
  const decay = Math.max(0, e.decay ?? 0);
  const release = Math.max(0, e.release ?? 0.015);
  const sustain = Math.min(1, Math.max(0, e.sustain ?? 0));
  const held = Math.max(1e-4, level * sustain);
  const attackEnd = t + attack;
  const decayEnd = attackEnd + decay;

  // An attack this short has no audible curve to it, so give it the one that cannot click —
  // including an attack that is only this long because the floor made it so.
  const attackLin = e.attackCurve === 'lin' || attack <= Math.max(gateLinUnder(freq), minAttack);
  // Where the authored exponential has itself reached after the lift. Handing over at its
  // own value keeps the curve EXACTLY the authored one — an exponential ramp between two
  // points of an exponential is that same exponential — and only replaces the crawl along
  // the bottom, which is the part no one authored and everyone hears.
  const expAt = (u) => 1e-4 * Math.pow(level / 1e-4, u);
  const liftLevel = expAt(minAttack / attack);
  // A straight ramp out of silence has no step in it, but it does have a CORNER at each
  // end — the slope goes from nothing to everything in one sample — and a corner is a
  // discontinuity in the first derivative, which is broadband too, just quieter. A raised
  // cosine leaves under the note, arrives under it, and has no corner anywhere; four
  // linear segments approximate it closely enough that the residue drops to the noise.
  // Segments rather than `setValueCurveAtTime`, which owns its whole window exclusively
  // and throws when a release lands inside it — which a short note's does.
  const RAISED_COS = [0.25, 0.5, 0.75, 1];
  const cosAt = (u) => 0.5 * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u))));

  const levelAt = (at) => {
    const dt = Math.max(0, at - t);
    if (dt < attack) {
      const u = dt / attack;
      if (attackLin) return level * cosAt(u);
      if (dt < minAttack) return liftLevel * cosAt(dt / minAttack);
      return expAt(u);
    }
    if (decay > 0 && dt < attack + decay) {
      const u = (dt - attack) / decay;
      if (e.curve === 'lin') return level + (held - level) * u;
      return level * Math.pow(held / level, u);
    }
    return held;
  };

  // From actual zero, not 1e-4: the param starts where silence is.
  param.setValueAtTime(0, t);
  if (attackLin) {
    for (const u of RAISED_COS) param.linearRampToValueAtTime(level * cosAt(u), t + attack * u);
  } else {
    for (const u of RAISED_COS) {
      param.linearRampToValueAtTime(liftLevel * cosAt(u), t + minAttack * u);
    }
    param.exponentialRampToValueAtTime(level, attackEnd);
  }
  if (decay > 0) {
    if (e.curve === 'lin') param.linearRampToValueAtTime(held, decayEnd);
    else param.exponentialRampToValueAtTime(held, decayEnd);
  } else {
    param.setValueAtTime(held, attackEnd);
  }

  if (sustaining) {
    if (decayEnd < end) param.setValueAtTime(held, end);
    return end + release + 0.005;
  }

  // Note-off may arrive before the attack or decay automation has reached its endpoint.
  // Cancel those future events and pin the exact level at the gate edge before starting
  // Release. Without this, a short note either releases from silence or leaves a future
  // decay ramp fighting the release ramp.
  const offAt = Math.max(t, end);
  // Floored: the attack now starts from a true zero, and an exponential release ramp out
  // of exactly zero is not a ramp — it is a no-op that ends in a step.
  const current = Math.max(1e-4, levelAt(offAt));
  param.cancelScheduledValues(offAt);
  param.setValueAtTime(current, offAt);
  const off = offAt + release;
  if (release > 0) {
    if (e.releaseCurve === 'lin') param.linearRampToValueAtTime(1e-4, off);
    else param.exponentialRampToValueAtTime(1e-4, off);
  }
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

// The same envelope sampled at a sync-grain boundary. A hard-synced slave cannot put
// this bend on `.detune`: that would move the whole already-shaped wavetable. Instead,
// dynamic sync samples the envelope as a change in the slave/master ratio. Keep this
// arithmetic beside `pitchEnv` so the panel's AMOUNT/ATTACK/DECAY/SUSTAIN values mean
// exactly the same thing on an ordinary and a synced layer.
function pitchEnvValue(pe, at, t, end) {
  const amount = (pe?.semitones ?? 0) * 100;
  if (!amount) return 0;
  const span = Math.max(0.001, end - t);
  const attack = Math.max(0, pe?.attack ?? 0);
  const peakAt = attack > 0 ? t + Math.min(Math.max(0.001, attack), span * 0.45) : t;
  const decay = Math.max(0, pe?.decay ?? 0);
  const decayEnd = Math.min(end, peakAt + decay);
  if (at < peakAt) return amount * Math.max(0, (at - t) / Math.max(0.001, peakAt - t));
  if (decay > 0 && at < decayEnd) {
    const u = Math.max(0, Math.min(1, (at - peakAt) / decay));
    return amount * (1 + ((pe?.sustain ?? 0) - 1) * u);
  }
  return amount * (pe?.sustain ?? 0);
}

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

// ---- the filter-automation record -------------------------------------------
//
// Every biquad this file builds, kept for the last few dozen writes. It exists for
// one question, asked after the fact: Chrome logs "BiquadFilterNode: state is bad,
// probably due to unstable filter caused by fast parameter automation" and names
// nothing at all — not the node, not the preset, not the numbers — and a filter that
// has gone unstable can emit a non-finite sample that sticks in the first compressor
// downstream, which is how this desk loses its output entirely.
//
// So the desk's watchdog dumps this the moment it sees a non-finite sample at the
// output (see checkAudioHealth), and the write that did it is in here, with its
// corner, its sweep target, its time and its Q.
//
// A plain array of small objects, capped: the ceiling is what makes it free to leave
// on for ever, and 64 covers several seconds of the densest arrangement. Module
// scope rather than per-rack because a rack is disposed with its context and the
// evidence has to outlive the thing that produced it.
const FILTER_WRITE_LOG = 64;
const filterWrites = [];
function noteFilterWrite(entry) {
  filterWrites.push(entry);
  if (filterWrites.length > FILTER_WRITE_LOG) filterWrites.shift();
}

/**
 * Cut the silence off the end of a rendered note — which is most of it, and the
 * reason a warm cache could be SLOWER than the pool it replaced.
 *
 * A note is rendered for `dur + tailOf(spec)`, and `tailOf` has a floor of a second
 * plus change: it is sizing a RETIREMENT window, where being generous costs nothing.
 * As a buffer length it costs plenty. A pluck whose sound is over in 200ms comes back
 * as a 1.2s buffer, and a replayed buffer is a live BufferSource for its whole
 * length — so in a sixteenth-note passage the graph carried five times the concurrent
 * nodes the pool would have, all of them dutifully reading silence and summing it in.
 * Measured across this desk's own song: half of every buffer, 18MB of it, and the
 * cost only arrives once the cache is warm — which is to say after the first complete
 * loop, in the busiest bars. Exactly what it was reported as.
 *
 * -100 dBFS is the line, with 10ms of guard past it. That is not "bit-identical" and
 * this comment will not pretend otherwise: samples are being discarded. They are
 * samples a hundred decibels under the note, at the end of a decay that is already
 * inaudible, and the alternative is paying for them on every voice in every bar.
 */
const CACHE_SILENCE_FLOOR = 1e-5;      // -100 dBFS
const CACHE_TAIL_GUARD_S = 0.01;
// The two bounds the note cache is held to — see `_trimNoteCache` for which one binds
// when. 64MB is about a minute and a half of stereo pad, and small enough that the desk
// never trades a core problem for a memory one.
//
// The count was 256, chosen as "several bars of the densest chord layer in the
// catalogue". That is the right unit for a song that REPEATS: a few bars of distinct
// notes is the whole working set, because bar 40 asks for what bar 8 already rendered.
// An imported one need not repeat at all. Measured on a MIDI import of the Barber of
// Seville overture — 266 bars, 262 of them structurally unique — the song asks for
// 3,435 distinct keys, so 256 held 7% of it and the LRU evicted mid-song while the
// transport was still playing: buffers fell 164 → 131 over twenty seconds of playback,
// with every eviction guaranteeing a later miss. A cache that cannot survive one pass
// of the song is doing bookkeeping, not caching.
//
// So let the BYTES bind, which is what the paragraph in `_trimNoteCache` says they are
// for. The count stays as the backstop it was always described as, set where it binds
// only for notes small enough that thousands of them still fit the byte budget: at the
// ~130KB a desk note averaged in that measurement, 64MB binds first at about 490
// entries and this number is never reached; at the ~10KB of a closed hat, 2048 entries
// is 20MB and the LRU still means something.
const NOTE_CACHE_ENTRIES = 2048;
const NOTE_CACHE_BYTES = 64 * 1024 * 1024;
// A render creates a complete throwaway graph and asks the browser to run it. One at a
// time is deliberate: the live AudioContext and an OfflineAudioContext are both asking
// the same device for work, so two background renders are a poor trade for a cache hit.
const NOTE_RENDER_JOBS = 1;

/**
 * Run a render when the main thread has room — and NEVER inside the scheduling pass.
 *
 * This is the difference between a cache that helps and a cache you can hear arriving.
 * A miss builds its whole graph synchronously before it can `await` anything: a context,
 * a rack, and every oscillator, filter and envelope of the note. Started inline, that
 * lands in the middle of `Audio.schedule()` — the pass that is FEEDING Web Audio its
 * lookahead — so a cold bar spends its scheduling budget rendering the notes it is
 * simultaneously trying to queue. Measured on the desk's dense bars: the worst
 * scheduling pass went from 37ms with the cache off to 55ms with it on, while the
 * steady state was already 40% cheaper. The saving was real and the way in was audible.
 *
 * `requestIdleCallback` rather than a bare timeout so a render waits for a gap instead
 * of merely waiting its turn; the timeout is the promise that a busy desk still warms
 * up, just later. Neither exists in a bare offline render, and a `setTimeout` fallback
 * is enough there — nothing is competing for the thread.
 */
function whenIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(() => fn(), { timeout: 400 });
    return () => { try { cancelIdleCallback(id); } catch { /* browser owns it */ } };
  }
  const id = setTimeout(fn, 0);
  return () => clearTimeout(id);
}

/** Shared desk-only state for rendered notes. It deliberately outlives VoiceRack. */
export function createNoteCacheState() {
  return {
    entries: new Map(),
    revisions: new Map(),
    bytes: 0,
    queue: [],
    rendering: 0,
    playbackActive: false,
    idlePending: false,
    cancelIdle: null,
    generation: 0,
    // LIFETIME TOTALS, and every name here carries `Total` when a live field of the
    // same idea exists. `queuedTotal` used to be `queued`, which collided with the
    // live backlog in the health object below and silently won the spread: every
    // reader that asked "how much is left to render" was handed "how many jobs has
    // this session ever made", a number that only goes up. The pre-roll's
    // drained-yet? test was the casualty.
    stats: {
      hits: 0, misses: 0, queuedTotal: 0, started: 0, completed: 0,
      failed: 0, stale: 0,
    },
  };
}

function cacheEntryCurrent(state, job) {
  return !!state && !!job && state.generation === job.generation
    && state.entries.get(job.key) === job.entry
    && (state.revisions.get(job.voiceId) || 0) === job.revision;
}

function purgeNoteCacheEntries(state, voiceId) {
  if (!state || !voiceId) return;
  for (const [key, entry] of state.entries) {
    if (entry.voiceId !== voiceId) continue;
    state.bytes = Math.max(0, state.bytes - (entry.bytes || 0));
    entry.evicted = true;
    state.entries.delete(key);
  }
  const before = state.queue.length;
  state.queue = state.queue.filter((job) => job.voiceId !== voiceId);
  state.stats.stale += before - state.queue.length;
}

/** Invalidate one voice when there is no live rack to perform the purge. */
export function invalidateNoteCacheState(state, voiceId) {
  if (!state || !voiceId) return;
  state.revisions.set(voiceId, (state.revisions.get(voiceId) || 0) + 1);
  purgeNoteCacheEntries(state, voiceId);
}

function pumpCache(state) {
  if (!state || state.playbackActive || state.rendering >= NOTE_RENDER_JOBS
    || state.idlePending || !state.queue.length) return;
  state.idlePending = true;
  state.cancelIdle = whenIdle(() => {
    state.idlePending = false;
    state.cancelIdle = null;
    // Play may have started while the callback was waiting. Leave the job queued so
    // no new OfflineAudioContext render can begin during transport playback.
    if (state.playbackActive) return;
    let job = null;
    while (state.queue.length && !job) {
      const candidate = state.queue.shift();
      if (cacheEntryCurrent(state, candidate)) job = candidate;
      else state.stats.stale++;
    }
    if (!job) { pumpCache(state); return; }
    state.rendering++;
    state.stats.started++;
    Promise.resolve().then(() => job.run()).catch((error) => {
      state.stats.failed++;
      console.warn('[voices] note cache job failed', error?.message || error);
    }).finally(() => {
      state.rendering = Math.max(0, state.rendering - 1);
      pumpCache(state);
    });
  });
}

export function setNoteCachePlaybackActive(state, active) {
  if (!state) return;
  state.playbackActive = !!active;
  if (!state.playbackActive) pumpCache(state);
}

export function clearNoteCacheState(state) {
  if (!state) return;
  if (state.cancelIdle) state.cancelIdle();
  state.cancelIdle = null;
  state.idlePending = false;
  state.queue.length = 0;
  state.generation++;
  state.bytes = 0;
  state.entries.clear();
  state.revisions.clear();
  state.rendering = 0;
}
function trimSilence(buffer) {
  const channels = buffer.numberOfChannels;
  // EVERY channel, and the LATEST of them. A stereo patch can ring longer on one side
  // than the other — a chorus is two delay lines drifting in antiphase, so the two
  // sides do not fall silent together — and trimming to the left channel's tail would
  // cut the right one's while measuring nothing.
  let last = -1;
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = data.length - 1; i > last; i--) {
      if (Math.abs(data[i]) > CACHE_SILENCE_FLOOR) { last = i; break; }
    }
  }
  // A note that rendered to nothing at all is kept as one quantum rather than a
  // zero-length buffer, which Web Audio will not make.
  const keep = Math.min(buffer.length,
    Math.max(128, last + 1 + Math.ceil(CACHE_TAIL_GUARD_S * buffer.sampleRate)));
  if (keep >= buffer.length) return buffer;
  const out = new AudioBuffer({
    length: keep, sampleRate: buffer.sampleRate, numberOfChannels: channels,
  });
  for (let ch = 0; ch < channels; ch++) {
    out.copyToChannel(buffer.getChannelData(ch).subarray(0, keep), ch);
  }
  return out;
}

/**
 * Store a two-channel render as one channel when both sides came back identical.
 *
 * Most presets are mono — a layer's `stereo` spread does nothing at unison 1, and no
 * shipped preset carries a chorus — so rendering in stereo to be safe would otherwise
 * double the memory of the common case for no sound. Web Audio fans a mono buffer to
 * both outputs, so the collapsed buffer plays as the same signal it replaced.
 *
 * Exact equality is the right test rather than a threshold: a genuinely mono graph
 * reaches both channels through the same additions in the same order.
 */
function collapseMono(buffer) {
  if (buffer.numberOfChannels !== 2) return buffer;
  const l = buffer.getChannelData(0);
  const r = buffer.getChannelData(1);
  for (let i = 0; i < l.length; i++) if (l[i] !== r[i]) return buffer;
  const out = new AudioBuffer({
    length: buffer.length, sampleRate: buffer.sampleRate, numberOfChannels: 1,
  });
  out.copyToChannel(l, 0);
  return out;
}

/**
 * How many seconds of render one MRDR-3 note needs before it is over.
 *
 * `VoiceRack.tailOf` cannot answer this: it walks `spec.opts`, which `buildSpec` fills
 * from `v.options` — a key MRDR-3 presets do not have — so it returns its one-second
 * floor for every one of them. That is wrong in the direction that MATTERS: this song's
 * string pad holds a 3.1s global release, and a note rendered for 1.1s would be a pad
 * with its tail cut off, cached and replayed that way for ever.
 *
 * Deliberately generous, and it costs nothing to be: `trimSilence` cuts the render back
 * to where the sound actually ended, so over-estimating spends render time while
 * under-estimating loses the end of the note. For the same reason a bypassed layer is
 * counted rather than skipped — the bypass state is not worth reading to save silence
 * that is trimmed anyway.
 */
function layerNoteSeconds(v, dur) {
  const L = v?.layer || {};
  const gv = v?.global?.vca || null;
  // The global VCA's own release, which can outlast every layer's — that is the whole
  // point of a stage the summed voice passes through.
  const globalOff = gv ? dur + Math.max(0, gv.release ?? 0.015) + 0.005 : 0;
  let end = Math.max(dur, globalOff);
  for (const key of ['osc1', 'osc2', 'osc3']) {
    const s = L[key];
    if (!s || (s.gain ?? 1) <= 0) continue;
    const delay = Math.min(0.5, Math.max(0, s.delay ?? 0));
    // A layer's own note: it enters at its DELAY and runs for its share of the drawn
    // length, so `len` above 1 outlives the note rather than ending with it.
    const own = delay + Math.max(0.001, dur * (s.len ?? 1));
    // `vca: 'through'` has no envelope of its own — it is gated open until whatever
    // shapes it downstream has finished, which is the global VCA when there is one.
    const off = s.vca === 'through'
      ? Math.max(delay + 0.002, globalOff || own) + 0.006
      : own + Math.max(0, s.release ?? 0.015) + 0.005;
    end = Math.max(end, off);
  }
  // The chorus modulator outlives the last envelope so the delay lines drain under a
  // moving LFO — see CHORUS_TAIL_S — and what they drain is still sound.
  if ((v?.chorus?.mix ?? 0) > 0) end += CHORUS_TAIL_S;
  // The margin every source stop in `_playLayer` already carries.
  return end + 0.02;
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

/**
 * The fade a preview gets when it is STOPPED rather than released.
 *
 * Twelve milliseconds is under a frame and over a cycle of anything above 80 Hz, which
 * is the whole requirement: fast enough that the panel still reads as having gone
 * quiet the instant you asked, slow enough that the waveform is walked to zero instead
 * of being cut off wherever it happened to be.
 */
const STOP_FADE = 0.012;

// ---- CHORUS 2 ---------------------------------------------------------------
//
// The Juno's, which is the one everybody means by "chorus" on a stacked synth: TWO short
// delay lines walking around a few milliseconds, driven in ANTIPHASE, one panned left and
// one right. The antiphase is the whole trick and the reason a second oscillator is not
// needed for it — as one line stretches the other shortens, so the two channels drift
// against each other and the sound opens sideways instead of merely wobbling in place.
// One sine through a gain of +swing and a gain of −swing IS that, exactly, and it costs
// one oscillator rather than two that would have to be kept in phase by hand.
//
// The numbers below are the box, not the preset. A delay of about 5 ms and a swing of up
// to ±4 ms is the BBD range: shorter turns into a flanger, longer into a doubler. They are
// engine constants in the same sense `LFO_FILTER_CENTS` is — the units the DEPTH pot is
// denominated in, not a value a patch could usefully state a second way.
//
// Deterministic like everything else on this path: a plain `OscillatorNode` started at the
// note's own time with phase zero, so an offline render and a live take produce identical
// samples and stems still sum to the mix. A free-running chorus would be exactly the
// order-dependent state this file refuses to keep.
const CHORUS_BASE_S = 0.0055;
const CHORUS_SWING_S = 0.004;
// How far past the last envelope the modulator has to keep running for the delay lines to
// drain under a still-moving LFO rather than a frozen one.
const CHORUS_TAIL_S = 0.1;

/**
 * Build the chorus in front of `dest` and hand back its input and its modulator.
 *
 * The oscillator is returned rather than started here because the caller does not yet
 * know when the note ends — see the bottom of `_playLayer`, where every shared modulator
 * on this path is started at once.
 */
function buildChorus(ctx, spec, t, dest) {
  const input = ctx.createGain();
  const mix = Math.min(1, Math.max(0, spec.mix ?? 0));
  const rate = Math.min(8, Math.max(0.05, spec.rate ?? 0.8));
  const depth = Math.min(1, Math.max(0, spec.depth ?? 0.5));
  const width = Math.min(1, Math.max(0, spec.width ?? 1));
  // Equal power, the same curve the strip's own Chorus 2 insert uses — MIX at half is
  // half of each and no dip through the middle of the travel.
  const dry = ctx.createGain();
  dry.gain.setValueAtTime(Math.cos((mix * Math.PI) / 2), t);
  input.connect(dry); dry.connect(dest);
  // Two lines summing, so each takes 1/√2 of the wet leg for the same reason.
  const wetLevel = Math.sin((mix * Math.PI) / 2) / Math.SQRT2;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(rate, t);
  for (const side of [-1, 1]) {
    const delay = ctx.createDelay(0.05);
    delay.delayTime.setValueAtTime(CHORUS_BASE_S, t);
    const swing = ctx.createGain();
    swing.gain.setValueAtTime(side * depth * CHORUS_SWING_S, t);
    osc.connect(swing); swing.connect(delay.delayTime);
    const level = ctx.createGain();
    level.gain.setValueAtTime(wetLevel, t);
    input.connect(delay);
    let tail = delay;
    // WIDTH at zero is both lines up the middle, which is a mono chorus and still a real
    // sound — the drift is between the two delays, not between the two speakers. The
    // panner is skipped entirely there so the graph is what it would have been without
    // one, and skipped on any context that has no `createStereoPanner` at all.
    if (width > 0 && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(side * width, t);
      delay.connect(pan); tail = pan;
    }
    tail.connect(level); level.connect(dest);
  }
  return { input, osc };
}

/**
 * Did anything but a NUMBER change between two option bags?
 *
 * The question `_applyLive` has to answer before it writes: a number moving on a sounding
 * synth is a cutoff being swept, and stepping it is inaudible. A string moving is a
 * different waveform or a different filter, and stepping THAT is a click — the signal
 * jumps from wherever the old shape was to wherever the new one starts.
 *
 * Missing on either side counts as changed, so switching a section on or off dips too:
 * an option that has just appeared is a node that has just started.
 */
function shapeChanged(a, b) {
  if (a === b) return false;
  if (typeof a !== typeof b) return true;
  if (a === null || b === null || typeof a !== 'object') {
    return typeof a === 'number' && typeof b === 'number' ? false : a !== b;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (shapeChanged(a[k], b[k])) return true;
  return false;
}

/**
 * The options that are a LIVE PARAM rather than a stored number, and the glide they get.
 *
 * `synth.set` writes a value the instant it is called: for a plain property — an
 * envelope time, a curve name, an oscillator count — that is right, because nothing is
 * reading it until the next note. For an AudioParam it is a STEP, and a step on a
 * sounding synth is zipper noise: drag a DETUNE and you hear the pitch climb in stairs
 * rather than slide, because the desk sends sixty edits a second and every one of them
 * jumps the param to its new value between two sample blocks.
 *
 * So these are pulled out of the bag before `set` sees it and rammped instead. 20 ms is
 * short enough that the pot still feels attached to the sound and long enough that no
 * single step is a click — and the ramps chain, because each one starts from wherever
 * the last had reached (`rampTo` holds the current value first).
 *
 * A path is on this list only if it is BOTH a param and free of anything else writing
 * it. `frequency` is deliberately absent from the top level: it is the note, written by
 * `triggerAttack` and glided by portamento, and a second writer on it is a fight.
 * `filter.frequency` is here because a MonoSynth's filter envelope CONNECTS to it — a
 * summed signal, not a scheduled one — so a ramp of its own offset cannot collide.
 */
const SMOOTH_SECONDS = 0.02;
const SMOOTH_PARAMS = [
  ['detune'], ['volume'], ['harmonicity'], ['modulationIndex'], ['resonance'],
  ['vibratoAmount'], ['vibratoRate'],
  ['filter', 'Q'], ['filter', 'frequency'],
  ['oscillator', 'detune'], ['modulation', 'detune'],
  // DuoSynth keeps two whole MonoSynths under `voice0`/`voice1`, and their options
  // nest the same way their objects do.
  ['voice0', 'detune'], ['voice0', 'filter', 'Q'], ['voice0', 'filter', 'frequency'],
  ['voice1', 'detune'], ['voice1', 'filter', 'Q'], ['voice1', 'filter', 'frequency'],
];

const atPath = (root, path) => path.reduce((node, k) => (node == null ? node : node[k]), root);

/** A Tone `Param`/`Signal` — the thing that can be ramped, as opposed to a number. */
const isParam = (x) => !!x && typeof x.rampTo === 'function' && typeof x.value === 'number';

/**
 * Take every live param out of an options bag, so `set` cannot step it.
 *
 * Returns what to ramp instead. The bag is mutated — it is already a private clone by
 * the time this sees it — and a branch left empty is fine: `set` walks what it is given.
 */
function liftSmoothParams(synth, bag) {
  const lifted = [];
  for (const path of SMOOTH_PARAMS) {
    const parent = atPath(bag, path.slice(0, -1));
    if (!parent || typeof parent !== 'object') continue;
    const leaf = path[path.length - 1];
    const value = parent[leaf];
    // Not a finite number is not something to glide to — a `-Infinity` volume, a note
    // name, a missing key. Leave it in the bag and let Tone do whatever it does with it.
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const param = atPath(synth, path);
    if (!isParam(param)) continue;
    delete parent[leaf];
    lifted.push({ param, value });
  }
  return lifted;
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
 * How a pitched voice responds when another note arrives.
 *
 * `mono` was the original boolean. Keep reading it for old songs and user presets, but
 * give the editor a name for the middle behaviour instead of making one flag carry both
 * single-note allocation and envelope policy.
 */
const keyMode = (v) => {
  if (v?.mode === 'poly' || v?.mode === 'legato' || v?.mode === 'mono') return v.mode;
  return v?.mono === true ? 'mono' : 'poly';
};

/**
 * How long this preset's GLIDE takes, from wherever the preset happens to keep it.
 *
 * The editor writes `$portamento` at the top level; a hand-written or imported Tone preset
 * may carry it inside `options`, where `buildSpec` also finds it. One reader so the two
 * paths cannot disagree about whether a preset has a glide at all.
 */
const glideTime = (v) => {
  const p = v?.portamento ?? v?.options?.portamento ?? 0;
  return Number.isFinite(p) && p > 0 ? p : 0;
};

// MRDR-3 optional sections have historically appeared in equivalent forms:
// the editor's flat `bypassed['global.filter']` hold, a `$`-prefixed hold, and (for
// hand-authored/user-imported patches) an explicit `bypass`/`enabled` flag on the live
// section. Treat all of them as the same topology decision. This keeps a stale live
// subtree from leaking back into the graph when a draft is rebound or a shared patch
// was authored by an earlier editor build. Do not infer a nested parent hold from a
// child hold: `bypassed.layer.osc1.filter` must not accidentally mute the whole layer.
const hasOwn = (object, key) => !!object
  && Object.prototype.hasOwnProperty.call(object, key);
const sectionBypassed = (voice, key, section = null) => {
  const bag = voice?.bypassed;
  return hasOwn(bag, key) || hasOwn(bag, `$${key}`)
    || section?.bypass === true || section?.enabled === false || section?.on === false;
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
  constructor(ctx, noiseBuf = null, longBuf = null, noteCacheState = null) {
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
    // Rendered notes, and the revision counter that lets an edited preset invalidate
    // them — see the note cache above `_cacheablePool`. Desk racks share this state so
    // a Mixer pause/re-bank does not throw away buffers that were prepared while stopped.
    // A throwaway offline rack gets its own state and never enables the cache.
    this.noteCache = false;
    this._cacheState = noteCacheState || createNoteCacheState();
    this._noteCache = this._cacheState.entries;
    this._specRev = this._cacheState.revisions;
    Object.defineProperty(this, '_noteCacheBytes', {
      configurable: true,
      get: () => this._cacheState.bytes,
      set: (value) => { this._cacheState.bytes = Number(value) || 0; },
    });
    // Presentation-specific groups can make several lanes share one physical channel.
    // Arcade Corner uses this for its single percussion voice; preview groups are kept
    // separate so auditioning a drum cannot cut the song's live drum.
    this._monoGroups = new Map();
    // Pools taken out of service but still sounding — see `_retire`. Keyed by their
    // own disposal timer so `dispose` can cancel one that has not fired yet.
    this._retired = new Map();
    // The same list for an OFFLINE render, which has no timers to key them by — see
    // `_retire`. Held only so `dispose` can account for them and so the graph keeps a
    // reference to synths that still have notes booked on them.
    this._retiredOffline = [];
    // Active preview notes, keyed by `${laneKey}|${freq}` → { slot }.
    // A note-off calls `triggerRelease` on the stored synth so a held key sustains
    // and a released one decays through its envelope instead of ringing for a fixed
    // sequencer length.
    this._activePreviews = new Map();
    // Cached BufferSources are otherwise deliberately fire-and-forget. Keep only
    // their lightweight records until onended so loop diagnostics can distinguish
    // a growing source population from a genuinely heavier musical passage.
    this._cachedPlayback = new Set();
    // Held NATIVE notes, keyed the same way. The pooled classes above are released through
    // Tone's own `triggerRelease`; a native voice is a heap of scheduled AudioParams with
    // no synth object to ask, so what is kept here is the params to let go of and the
    // sources to stop early. See `releaseNow`.
    this._heldNative = new Map();
    // Notes that are SOUNDING but have no finger on them — the bench's gated auto-play.
    // A held note is cleaned up by its note-off; these end by themselves, so each carries
    // the time it is over and the list is swept rather than deleted from. What they are
    // here for is `refresh`: dragging a cutoff must move the note you are hearing, and
    // before this only a HELD note could be found to move. See `_registerLiveNote`.
    this._liveNotes = [];
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
    // Glide is a constructor option on every Tone synth. It only becomes audible in a
    // non-poly key mode because those modes keep one note on one instance.
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

  /**
   * `preview` and `hold` are two questions that used to be one.
   *
   * `preview` is about the POOL: a previewed note gets its own synths, because the song
   * is scheduled a quarter-second ahead and a note landing in the middle of that would
   * be written behind Tone's timeline. That is true of every previewed note.
   *
   * `hold` is about the GATE: a note played by a FINGER has no length until the finger
   * says so, and is held open until `releasePreview`. A note played by a MACHINE — the
   * bench's pattern player — has a length before it sounds, and holding it open would
   * leave one note per step ringing to the 30-second safety stop. Defaults to `preview`,
   * so a caller that says nothing gets the finger.
   */
  play(laneKey, voiceId, freq, { time, dur, gain, detune = 1, dry, wet, echo = true, preview = false, hold = preview, spb = null }) {
    const v = VOICES[voiceId];
    const monoGroup = v?.monoGroup
      ? `${v.monoGroup}|${preview ? 'preview' : 'live'}` : null;
    if (v && v.kind === 'noise') {
      return this._playNoise(v, { time, gain, dry, wet, echo, monoGroup });
    }
    if (v && v.kind === 'drum') return this._playDrum(v, { time, gain, dry, wet, echo });
    if (v && v.synth === 'GameSynth') {
      // A HELD note plays the full one-shot envelope — the decay needs room to
      // reach silence, and the preset's `dur` is a sequencer default, not a
      // sound-design parameter. 4 s is enough for any exponential ramp to hit -80 dB.
      // A gated preview keeps its length, which is what makes a pattern a pattern.
      return this._playGame(v, { freq, time, dur: hold ? 4 : dur, gain, detune, dry, wet, echo, laneKey, preview, hold });
    }
    // Before the allowlist, not after: `SYNTHS` holds Tone classes, so a native synth that
    // reached that line would find nothing under its name and return false, which looks
    // exactly like a preset that does nothing.
    if (v && v.synth === 'AdditiveSynth') {
      return this._playAdditive(v, { freq, time, dur, gain, detune, dry, wet, echo, laneKey, preview, hold });
    }
    if (v && v.synth === 'MRDR-3') {
      // Rendered once, replayed after that — when this preset is the kind that can be.
      // The gate and the replay both refuse everything they are unsure of, and then
      // this is the line it always was. See `_cacheableLayer`.
      if (this.noteCache
        && this._cacheableLayer(v, v.mode || keyMode(v), preview, hold)
        && this._playCachedLayer(v, voiceId, Array.isArray(freq) ? freq : [freq],
          { time, dur, gain, detune, dry, wet, echo })) {
        return true;
      }
      return this._playLayer(v, { freq, time, dur, gain, detune, dry, wet, echo, laneKey, preview, hold, spb });
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
    // LEGATO and MONO are one instance, reused. LEGATO keeps the current envelope alive
    // when a note overlaps and moves that note's pitch; MONO starts the new envelope and
    // cuts the old one. POLY keeps the existing round-robin pool.
    const mode = v?.mode || keyMode(v);
    const mono = mode !== 'poly';
    const legato = mode === 'legato';
    // Rendered once, replayed after that — when this voice is the kind that can be.
    // See `_cachedNote`: it is the same note, from a buffer, and it is the difference
    // between a sixteenth-note pluck layer costing a third of the audio thread and
    // costing nothing. Returns false for anything it cannot safely stand in for, and
    // then the pool below plays the note exactly as it always did.
    if (this.noteCache && this._cacheablePool(v, mode, preview, hold)
      && this._playCached(v, voiceId, notes, { time, dur, gain, detune, dry, wet, echo })) {
      return true;
    }
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
        // A non-poly mode holds slot 0 rather than advancing. A chord handed to it
        // therefore sounds its last note, which is the only meaningful answer for one
        // sounding voice.
        const slot = mono ? pool.slots[0] : pool.slots[pool.next % pool.slots.length];
        if (!mono) pool.next++;
        const t = time;
        const monoGroup = v?.monoGroup
          ? `${v.monoGroup}|${preview ? 'preview' : 'live'}` : null;
        if (monoGroup) {
          const previous = this._monoGroups.get(monoGroup);
          // Keep each lane's routing intact, but close the previous group's envelope at
          // this note-on. With the Arcade drum release of a few milliseconds, this is
          // one sound at a time without a hard stop/click.
          if (previous && previous.slot !== slot) {
            if (previous.release) previous.release(t);
            else if (previous.pool && !previous.pool.gone) {
              try { previous.slot.synth.triggerRelease(t); } catch { /* already quiet */ }
            }
          }
          this._monoGroups.set(monoGroup, { pool, slot });
        }
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
        // ---- GLIDE IS FINGERED, here and on every other path ---------------------
        //
        // A note glides only when it begins while the previous one is STILL GATED — the
        // overlap that legato playing means, and the same predicate the LEGATO handoff
        // below tests. A note after a rest starts on its own pitch. That is what every
        // mono synth calls fingered (or legato) portamento, and `_playLayer` follows the
        // same sentence, so GLIDE means one thing across the whole rack instead of one
        // thing per synth class.
        //
        // Said by LENDING the instance a portamento for the length of one call rather
        // than by writing `frequency` here: `setNote` reads the property synchronously
        // while it schedules, and the classes own their own pitch writers — MembraneSynth
        // ramps `frequency` down by octaves for its pitch decay — so a second writer on
        // that param is a fight. Restored in the `finally`, which is what keeps the pool's
        // record of itself matching what its synths hold (see `refresh`, and the glide
        // assertion in tests/voice-edit.js).
        //
        // Tone will still refuse a ramp when the note it would glide FROM is under 5% at
        // the note-on (`Monophonic.setNote`) — a sustain-zero patch that decayed to
        // nothing under its own gate. That is a narrower rule than this one and it cannot
        // be talked out of without taking over `frequency`; no preset in the library
        // reaches it, and where it bites, the pitch left behind is one nobody can hear.
        //
        // ---- and a FINGER is not a length ----------------------------------------
        //
        // Two different facts about the note before this one, because a keyboard and a
        // sequencer say "still sounding" in different ways. `activeUntil` is the GATE the
        // sequencer wrote: a length, known before the note starts. `gateKey` is a KEY THAT
        // IS STILL DOWN, and a held note has no length until the finger says so — which is
        // why the rack takes a note-off at all. Reading only the first meant the keyboard
        // lost its glide after the lane's nominal note length, a fifth of a second in,
        // however long you actually held the key: play legato on the keys and the second
        // note jumped, which is not what the pill promises.
        const gated = mono && (slot.activeUntil || 0) > t;
        const fingered = mono && slot.gateKey != null;
        const overlap = gated || fingered;
        const glide = glideTime(v);
        const noteKey = hold ? `${laneKey}|${f.toFixed(2)}` : null;
        const carriesGlide = typeof slot.synth.portamento === 'number';
        if (carriesGlide) slot.synth.portamento = overlap ? glide : 0;
        try {
          if (hold) {
            // A held note uses triggerAttack so a later note-off can release it.
            // Release any previous note at this (lane, freq) first — the same key
            // pressed again restarts rather than stacking.
            this._releasePreview(noteKey);
            slot.synth.triggerAttack(f * detune * VoiceRack.pitchShift(v), t, 1);
            this._activePreviews.set(noteKey, { slot });
            // `gated` rather than `overlap`: this branch re-arms a release at the new
            // note's end, and doing that to a note whose KEY IS STILL DOWN would stop a
            // sound the finger is still asking for. A held predecessor is handled by the
            // branch above, which is where a held note belongs.
          } else if (legato && gated) {
            // A later note owns the same gate. Cancel the previous note's scheduled
            // release before moving the pitch, otherwise the old note-off would close
            // the new note halfway through it. Tone's envelope cancel leaves its
            // current level in place, which is the legato contract.
            const cancel = (node) => {
              if (node?.cancel) node.cancel(t);
              else if (node?.gain?.cancel) node.gain.cancel(t);
            };
            cancel(slot.synth.envelope);
            cancel(slot.synth.filterEnvelope);
            cancel(slot.synth.voice0?.envelope);
            cancel(slot.synth.voice0?.filterEnvelope);
            cancel(slot.synth.voice1?.envelope);
            cancel(slot.synth.voice1?.filterEnvelope);
            slot.synth.setNote(f * detune * VoiceRack.pitchShift(v), t);
            slot.synth.triggerRelease(t + noteDur);
          } else {
            slot.synth.triggerAttackRelease(f * detune * VoiceRack.pitchShift(v), noteDur, t);
          }
          if (mono) {
            slot.activeUntil = t + Math.max(0.001, noteDur || 0.001);
            // Which KEY the gate belongs to, so that a note-off can close it. A sequenced
            // note has no key and no note-off: its gate ends where `activeUntil` says.
            slot.gateKey = noteKey;
          }
        } catch { return; } finally {
          if (carriesGlide) slot.synth.portamento = glide;
        }
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
  _playGame(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', preview = false, hold = preview }) {
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
      // THE NOTE-OFF LEVEL, and why the fall stops above silence.
      //
      // This path is an arcade AR — attack, then a fall across the note — and it stays
      // one. What it cannot be is a fall that has already ARRIVED at silence by the time
      // the note ends, because then there is nothing left for RELEASE to act on: the pot
      // was on the panel, the key was on the preset, and the ramp it scheduled ran from
      // -80 dB to zero where no one could hear it. A control that cannot move a sample is
      // the same bug as a key with no control, seen from the other end.
      //
      // So the fall lands on a LEVEL at note-off and the release carries that level to
      // silence, which is the shape every other path in the rack already has. Measured
      // before and after by work/local/game-synth-envelope-probe.mjs.
      //
      // One number, relative to the note's own peak so it means the same thing at every
      // gain: turn it down toward zero for the old near-silent landing, up toward 1 for
      // a note that barely falls at all. -20 dB is a tenth of the amplitude — an
      // unmistakable decay across the note, and still plainly audible in a mix, which is
      // what a release needs in order to be heard ending.
      const peak = gain * makeup;
      const off = end + release;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, peakAt);
      g.gain.exponentialRampToValueAtTime(peak * GAME_NOTE_OFF_LEVEL, end);
      // The release proper. Skipped rather than scheduled at zero length when the preset
      // asks for none: two ramps landing on the same timestamp is a degenerate segment,
      // and the linear finish below already takes it to zero without a click.
      if (release > 0) g.gain.exponentialRampToValueAtTime(peak * 1e-4, off);
      g.gain.linearRampToValueAtTime(0, off + 0.005);
      // A held preview gets a NOTE-OFF rather than a sustain — there is still no level
      // for a finger to sit ON, only one for it to cut. Before this, a previewed game
      // note ran its full four seconds whatever the key did.
      if (hold) {
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
      o.start(t); o.stop(off + 0.01);
      lastOff = Math.max(lastOff, off + 0.01);
    });
    // A chord of nothing but rests built no oscillators, so there is nothing to wobble.
    if (lfo && lastOff) { lfo.start(time); lfo.stop(lastOff); }
    return true;
  }

  // ---- the note cache ---------------------------------------------------------
  //
  // MEASURED, and aimed by the measurement rather than by intuition. On the desk's
  // dense song one layer — sixteenth-note chords on a Tone pluck — costs 0.14 of the
  // one core Web Audio gets, nearly a third of the whole graph. Taken apart
  // (`work/local/bench-tone-pool.js`): 0.139 of that is PER NOTE and 0.026 is the
  // pool merely existing, and the identical music on a native voice costs 0.15 less.
  // So it is the synthesis of each note that is expensive, not the instrument
  // standing there — which is precisely the cost a rendered note does not pay twice.
  //
  // A note here is a pure function of (preset, pitch, length): the same call, the
  // same schedule, the same samples — that is what tests/null-test.js asserts of this
  // whole engine every run. So it can be rendered once into a buffer and replayed,
  // and the only question is which notes are honestly that pure.
  //
  // WHAT IS EXCLUDED, and why each one has to be:
  //   · mono and legato — a note RETARGETS the one still sounding; there is no
  //     independent note to render.
  //   · vibrato — the pool's LFO free-runs across notes, so where the wobble is when
  //     a note starts depends on every note before it.
  //   · previews and held notes — a finger decides the length, and the length is half
  //     the cache key.
  //   · additive and the game synth, which have their own paths with their own state;
  //     drums and noise are one-shots whose cost the same measurement says is 4% of
  //     the graph, which is not worth a cache's failure modes.
  //
  // MRDR-3 has its own gate and its own renderer below — see `_cacheableLayer`. It is
  // where this song's cost actually is (nine layer lanes, and the last bars at or over
  // one core), and it needs different answers to nearly every question here: a note-on
  // is cached WHOLE rather than per chord tone, the render is in stereo, and the
  // vibrato exclusion above does not apply to it.
  //
  // DESK ONLY, and off by default (see `setNoteCache`): the game never sets it, so
  // every game path is untouched by construction, and an offline render never sets
  // it either — a bounce must render the synthesis itself, not a replay of it.
  _cacheablePool(v, mode, preview, hold) {
    return !!v && v.kind !== 'drum' && v.kind !== 'noise'
      && !preview && !hold
      && mode === 'poly'
      && !!SYNTHS[v.synth]
      && !(v.vibrato && v.vibrato.depth > 0)
      && !v.portamento;
  }

  /**
   * The same question for MRDR-3, which is the family the gate above refuses wholesale
   * and the one the desk's dense song spends most of its core on: nine of its lanes are
   * layer presets, and the last bars measure at or over the one core Web Audio gets.
   *
   * A SEPARATE gate rather than a widened one, because two of the pooled path's
   * exclusions do not mean the same thing here:
   *
   *   VIBRATO is refused above because `Tone.Vibrato` lives on the pool and FREE-RUNS,
   *   so where the wobble is when a note starts depends on every note before it. MRDR-3
   *   builds its own LFO per note-on at phase zero, which is the same wobble every
   *   time — unless SPREAD scatters it, which `layerVariesWithTime` is what asks. This
   *   is not a nicety: this song's busiest lane is a lead with a vibrato on it, and
   *   copying the pooled rule would refuse the one that costs the most.
   *
   *   The TONE CLASS test has no counterpart; what stands in for it is the list below.
   *
   * What is refused here, and why each one has to be:
   *   · anything `layerVariesWithTime` names — the note is not a function of pitch and
   *     length alone, and freezing one draw of it is what turns a choir into a machine.
   *   · mono and legato, and any portamento — a note either RETARGETS the one still
   *     sounding or glides from wherever it left off. Neither is an independent note,
   *     and neither is visible in a render of one.
   *   · a NOISE layer. The throwaway rack in `_renderLayerNote` is built without the
   *     seeded noise buffers, exactly as `_renderNote` is, so the layer would be
   *     skipped — and a note missing a layer renders and replays perfectly happily,
   *     which is what makes this the dangerous one to leave out. Handing the live
   *     buffers to the render would lift this, and nothing in this song needs it.
   *   · a TEMPO-SYNCED LFO, whose rate comes from `spb` — the note then depends on the
   *     tempo as well, and the tempo is not in the key. No shipped preset uses it.
   *   · a lit layer SOLO. It is desk monitoring rather than a preset key, and it
   *     changes which oscillators exist; see `setLayerSolo`, which bumps the revision
   *     so anything already rendered under one is unreachable afterwards.
   *   · previews and held notes, as above: a finger decides the length.
   */
  _cacheableLayer(v, mode, preview, hold) {
    if (!v || v.synth !== 'MRDR-3' || !v.layer) return false;
    if (preview || hold) return false;
    if (mode !== 'poly' || v.portamento) return false;
    if (layerVariesWithTime(v)) return false;
    const lfo = v.layer.lfo;
    if (lfo && (lfo.depth ?? 0) > 0 && lfo.sync === 'tempo') return false;
    for (const key of ['osc1', 'osc2', 'osc3']) {
      if (v.layer[key] && v.layer[key].type === 'noise') return false;
    }
    // A hard-synced slave with a PITCH ENVELOPE is not one oscillator: `_playLayer`
    // refreshes its sync table in 32ms grains, each grain a fresh oscillator started at
    // its own time. A Chrome oscillator takes its phase from the render quantum
    // boundary rather than from `start()`, so where each grain lands in the grid — and
    // therefore what the note sounds like — is not a function of pitch and length
    // alone. The probe measures it at a fifth of the note's own peak, which is how this
    // was found; `syncRazorLead` is the only preset in the catalogue that does it.
    if (v.layer.osc1 && v.sync) {
      const slaves = v.sync === '1+2+3' ? ['osc2', 'osc3']
        : v.sync === '1+2' ? ['osc2'] : v.sync === '1+3' ? ['osc3'] : [];
      for (const key of slaves) {
        const s = v.layer[key];
        if (s && s.type !== 'noise' && s.pitch && (s.pitch.semitones ?? 0) !== 0) return false;
      }
    }
    const solo = this.soloLayers?.get(v.id);
    if (solo && solo.size) return false;
    return true;
  }

  /**
   * Ask for a rendered note and play it, or say the cache could not help.
   *
   * A miss plays nothing and returns false — the caller then plays the note live, as
   * it always did, and the render happens in the background for next time. That is
   * the whole failure mode: the first bar of a new sound costs what it always cost.
   */
  _playCached(v, voiceId, notes, { time, dur, gain, detune, dry, wet, echo }) {
    const ctx = this.ctx;
    // An offline render must synthesise, not replay: a bounce is the reference for
    // what the song IS, and a cache miss inside one would put a rendered note beside
    // a live one and call them the same file.
    if (typeof ctx.startRendering === 'function') return false;
    const list = Array.isArray(notes) ? notes : [notes];
    const entries = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f == null || !(f > 0)) continue;
      const noteDur = Array.isArray(dur) ? (dur[i] ?? dur[0]) : dur;
      const freq = f * detune * VoiceRack.pitchShift(v);
      if (!Number.isFinite(freq) || !Number.isFinite(noteDur) || noteDur <= 0) return false;
      const entry = this._cacheEntry(v, voiceId, freq, noteDur);
      if (!entry?.buffer) return false;
      entries.push(entry);
    }
    if (!entries.length) return false;
    // Preflight the entire chord before creating a source. A partial cache hit must
    // fall back to one complete live chord, never cached tones plus a second live chord.
    for (const entry of entries) {
      const src = ctx.createBufferSource();
      src.buffer = entry.buffer;
      const g = ctx.createGain();
      // Rendered at unity, scaled here: one buffer serves every level the song asks
      // for, which is what keeps the cache small enough to be worth having.
      g.gain.value = gain;
      src.connect(g);
      g.connect(dry);
      if (echo && wet) g.connect(wet);
      const active = { src, gain: g };
      this._cachedPlayback.add(active);
      src.onended = () => {
        this._cachedPlayback.delete(active);
        try { src.disconnect(); } catch { /* context may already be gone */ }
        try { g.disconnect(); } catch { /* ditto */ }
      };
      src.start(time);
      src.stop(time + entry.buffer.duration + 0.01);
    }
    return true;
  }

  /**
   * Inventory one sequencer note into the rendered-note cache without playing it.
   *
   * Start-from-beginning calls this while the cache worker is held. It is deliberately
   * the SAME key builders and eligibility gates as live playback: discovery must not
   * promise a buffer for a note `_playCached` would refuse, nor render a subtly
   * different chord shape. `priority` is the song step; repeated notes retain their
   * latest occurrence so a late dense section is prepared before the opening bars.
   */
  prepareNoteCache(voiceId, freq, dur, { detune = 1, priority = 0 } = {}) {
    if (!this.noteCache) return 0;
    const v = VOICES[voiceId];
    if (!v) return 0;
    const before = this._cacheState.entries.size;
    const hits = this._cacheState.stats.hits;
    const mark = (entry) => {
      if (entry) entry.preparePriority = Math.max(entry.preparePriority || 0, priority);
    };
    if (v.synth === 'MRDR-3') {
      if (!this._cacheableLayer(v, v.mode || keyMode(v), false, false)) return 0;
      mark(this._layerCacheEntry(v, voiceId, Array.isArray(freq) ? freq : [freq], dur, detune));
    } else {
      const mode = v.mode || keyMode(v);
      if (!this._cacheablePool(v, mode, false, false)) return 0;
      const notes = Array.isArray(freq) ? freq : [freq];
      for (let i = 0; i < notes.length; i++) {
        const f = notes[i];
        if (f == null || !(f > 0)) continue;
        const noteDur = Array.isArray(dur) ? (dur[i] ?? dur[0]) : dur;
        const hz = f * detune * VoiceRack.pitchShift(v);
        if (!Number.isFinite(hz) || !Number.isFinite(noteDur) || noteDur <= 0) continue;
        mark(this._cacheEntry(v, voiceId, hz, noteDur));
      }
    }
    // Looking at an already-prepared entry is inventory, not a playback hit. Preserve
    // the counter's meaning so the loop log can compare actual cache use between laps.
    this._cacheState.stats.hits = hits;
    return this._cacheState.entries.size - before;
  }

  /** Put the latest song positions at the front without disturbing equal priorities. */
  prioritisePreparedNotes() {
    this._cacheState.queue.sort((a, b) =>
      (b.entry?.preparePriority || 0) - (a.entry?.preparePriority || 0));
  }

  /** The cache slot for one note, rendering it in the background on a miss. */
  _cacheEntry(v, voiceId, freq, dur) {
    const state = this._cacheState;
    this._noteCache ||= state.entries;
    // `specRev` is what makes an editor change land: `refresh` bumps it, so an edited
    // preset simply has different keys and the old buffers age out. Rounded coarsely
    // — a hundredth of a hertz and a millisecond are far below what anyone can hear,
    // and every decimal in the key is a buffer that gets rendered again.
    const rev = this._specRev?.get(voiceId) || 0;
    const key = `${voiceId}|${rev}|${freq.toFixed(2)}|${Math.round(dur * 1000)}|${this.ctx.sampleRate}`;
    const hit = this._noteCache.get(key);
    if (hit) {
      // LRU by re-insertion: the note played most recently is the one worth keeping.
      this._noteCache.delete(key);
      this._noteCache.set(key, hit);
      if (hit.buffer) state.stats.hits++;
      return hit;
    }
    const entry = { key, voiceId, revision: rev, generation: state.generation,
      buffer: null, rendering: true };
    this._noteCache.set(key, entry);
    state.stats.misses++;
    this._trimNoteCache();
    this._renderNote(v, voiceId, freq, dur, entry);
    return entry;
  }

  /**
   * Hold the cache to both of its bounds, oldest out first.
   *
   * A COUNT alone was enough while only pooled plucks were cached — 256 of those is a
   * few megabytes. It is not enough now: an MRDR-3 pad renders in stereo and can ring
   * for three seconds after a note that was drawn for one, so 256 of THOSE would be
   * several hundred megabytes of buffers held against a desk that is already short of
   * a core. The byte budget is what actually binds for pads; the count still binds for
   * short notes, where 64MB would be thousands of entries and the LRU would stop
   * meaning anything.
   *
   * Entries are evicted with a render possibly still in flight. That is harmless: the
   * render completes into an object nothing can reach any more, and the next note that
   * wants it starts a fresh one.
   */
  _trimNoteCache() {
    const state = this._cacheState;
    while (this._noteCache.size > NOTE_CACHE_ENTRIES
      || (state.bytes > NOTE_CACHE_BYTES && this._noteCache.size > 1)) {
      const oldest = this._noteCache.keys().next().value;
      const going = this._noteCache.get(oldest);
      state.bytes = Math.max(0, state.bytes - (going?.bytes || 0));
      if (going) going.evicted = true;
      this._noteCache.delete(oldest);
    }
  }

  /**
   * Take a render job, and start it when the thread has room. See `whenIdle`.
   *
   * QUEUED, at most `NOTE_RENDER_JOBS` at a time. A cold section is a burst of misses —
   * the dense song's chord layer alone is some thirty distinct note-ons — and each miss
   * costs a context, a rack and a graph on the MAIN THREAD, which is the thread the
   * sequencer lives on. A couple at a time keeps that burst under the queue the
   * scheduler is holding, at the price of the cache warming over a couple of bars
   * instead of one. Missing is free: the note plays live meanwhile.
   */
  _queueRender(job) {
    const state = this._cacheState;
    state.queue.push(job);
    state.stats.queuedTotal++;
    pumpCache(state);
  }

  /** Start the next queued render if a slot is free. */
  _pumpRenders() {
    pumpCache(this._cacheState);
  }

  /** Book a rendered buffer into an entry and into the byte total the LRU spends. */
  _keepBuffer(entry, buffer) {
    const state = this._cacheState;
    const job = { key: entry.key, entry, voiceId: entry.voiceId,
      revision: entry.revision, generation: entry.generation };
    if (!cacheEntryCurrent(state, job)) {
      state.stats.stale++;
      return false;
    }
    entry.buffer = buffer;
    entry.bytes = buffer.length * buffer.numberOfChannels * 4;
    state.bytes += entry.bytes;
    state.stats.completed++;
    this._trimNoteCache();
    return true;
  }

  /**
   * Render one note offline, at unity, into `entry.buffer`.
   *
   * No noise buffers are handed to the throwaway rack, and that is a statement about
   * what may be cached rather than an omission: only the POOLED TONE classes qualify
   * (see `_cacheablePool`), and not one of them reads `noiseBuf` — the buffer-backed
   * voices are the drum and noise kinds, which are excluded. If that ever changes,
   * the buffers have to be COPIED in here rather than regenerated, because live noise
   * is seeded from `Math.random` once per session and a replay that made its own
   * would not be the sound the pool would have played.
   *
   * Queued and started off the scheduling pass — see `_queueRender` and `whenIdle`.
   */
  async _renderNote(v, voiceId, freq, dur, entry) {
    const OAC = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null;
    if (!OAC) { entry.rendering = false; entry.failed = true; return; }
    const job = async () => {
      // TONE'S CONTEXT IS GLOBAL, and that is the whole hazard in this function.
      //
      // Building a rack on the throwaway context calls `Tone.setContext` (see the
      // VoiceRack constructor), which redirects EVERY Tone node built afterwards —
      // including the live pools the sequencer is still filling on the next
      // sixteenth. Left redirected, the live rack builds its synths on a context
      // that is not the one playing, and `_addSlot` throws
      // "cannot connect to an AudioNode belonging to a different audio context" on
      // every note. It did exactly that, and only playing the desk showed it.
      //
      // So the borrow is put back BEFORE the first `await` — everything up to there
      // is synchronous, so no scheduling pass can run inside the window, and the
      // render itself needs no context of Tone's once its graph is built.
      const prevToneCtx = Tone.getContext();
      try {
        const sr = this.ctx.sampleRate;
        const seconds = Math.min(30, dur + VoiceRack.tailOf(VoiceRack.buildSpec(v)));
        const ctx = new OAC(1, Math.ceil(seconds * sr), sr);
        const rack = new VoiceRack(ctx);
        const out = ctx.createGain();
        out.connect(ctx.destination);
        // At unity and with the preset's own transpose divided back out: the caller
        // scales the level, and `freq` already carries the song warp AND
        // `pitchShift`, which `play` will apply again on the way in.
        rack.play('bass', voiceId, freq / VoiceRack.pitchShift(v), {
          time: 0, dur, gain: 1, dry: out, wet: null, echo: false,
        });
        Tone.setContext(prevToneCtx);
        this._keepBuffer(entry, trimSilence(await ctx.startRendering()));
      } catch (e) {
        Tone.setContext(prevToneCtx);
        // A voice that will not render offline simply stays uncached: `_playCached`
        // sees no buffer and the pool plays it live, for ever, which is the
        // behaviour without any of this.
        console.warn('[voices] note cache could not render', voiceId, e?.message);
        entry.failed = true;
        this._cacheState.stats.failed++;
      } finally {
        entry.rendering = false;
      }
    };
    this._queueRender({ key: entry.key, entry, voiceId, revision: entry.revision,
      generation: entry.generation, run: job });
  }

  /**
   * Replay a whole MRDR-3 NOTE-ON from one buffer, or say the cache could not help.
   *
   * ONE ENTRY FOR THE WHOLE NOTE-ON, where the pooled path above caches a buffer per
   * chord tone. That is not a simplification, it is the only correct answer here: an
   * MRDR-3 chord's tones sum into ONE drive shaper and one chorus per note-on (see
   * `chainFor`), and a shaper is not linear — `shape(a+b)` is not `shape(a)+shape(b)`.
   * Summing three separately-rendered tones at replay would drop exactly the
   * intermodulation that makes a driven stack read as one instrument, and it would do
   * it quietly. Keying on the whole chord also disposes of the pooled path's
   * half-a-chord case: there is no half of one buffer.
   *
   * The chord repeats — songs are made of chords that come back — so the hit rate
   * survives the wider key.
   */
  _playCachedLayer(v, voiceId, notes, { time, dur, gain, detune, dry, wet, echo }) {
    const ctx = this.ctx;
    // An offline render must synthesise, not replay: a bounce is the reference for
    // what the song IS, and a cache miss inside one would put a rendered note beside
    // a live one and call them the same file.
    if (typeof ctx.startRendering === 'function') return false;
    const entry = this._layerCacheEntry(v, voiceId, notes, dur, detune);
    if (!entry?.buffer) return false;
    const src = ctx.createBufferSource();
    src.buffer = entry.buffer;
    const g = ctx.createGain();
    // Rendered at unity, scaled here: one buffer serves every level the song asks for.
    g.gain.value = gain;
    src.connect(g);
    g.connect(dry);
    if (echo && wet) g.connect(wet);
    const active = { src, gain: g };
    this._cachedPlayback.add(active);
    src.onended = () => {
      this._cachedPlayback.delete(active);
      try { src.disconnect(); } catch { /* context may already be gone */ }
      try { g.disconnect(); } catch { /* ditto */ }
    };
    src.start(time);
    src.stop(time + entry.buffer.duration + 0.01);
    return true;
  }

  /** The cache slot for one whole layer note-on, rendering it in the background. */
  _layerCacheEntry(v, voiceId, notes, dur, detune) {
    const state = this._cacheState;
    this._noteCache ||= state.entries;
    const shift = VoiceRack.pitchShift(v) * detune;
    // Every tone IN ITS PLACE, rests included. `_playLayer` reads per-tone lengths
    // positionally against the chord it was handed, so a key that dropped the rests
    // would pair the surviving tones with the wrong lengths — and two different chords
    // would share a key.
    const parts = [];
    let sounded = false;
    for (let i = 0; i < notes.length; i++) {
      const f = notes[i];
      if (f == null || !(f > 0)) { parts.push('r'); continue; }
      const noteDur = Array.isArray(dur) ? (dur[i] ?? dur[0]) : dur;
      const hz = f * shift;
      if (!Number.isFinite(hz) || !Number.isFinite(noteDur) || noteDur <= 0) return null;
      parts.push(`${hz.toFixed(2)}:${Math.round(noteDur * 1000)}`);
      sounded = true;
    }
    if (!sounded) return null;
    // `L|` because this shares the LRU with the pooled entries above and the two key
    // shapes must not be able to collide. `specRev` does the same job it does there:
    // `refresh` bumps it, so an edited preset simply has different keys.
    const rev = this._specRev?.get(voiceId) || 0;
    const key = `L|${voiceId}|${rev}|${parts.join(',')}|${this.ctx.sampleRate}`;
    const hit = this._noteCache.get(key);
    if (hit) {
      this._noteCache.delete(key);
      this._noteCache.set(key, hit);
      if (hit.buffer) state.stats.hits++;
      return hit;
    }
    const entry = { key, voiceId, revision: rev, generation: state.generation,
      buffer: null, rendering: true };
    this._noteCache.set(key, entry);
    state.stats.misses++;
    this._trimNoteCache();
    this._renderLayerNote(v, voiceId, notes, dur, detune, entry);
    return entry;
  }

  /**
   * Render one whole layer note-on offline, at unity, into `entry.buffer`.
   *
   * IN STEREO, and that is the difference from `_renderNote` that matters. A layer
   * carries a per-oscillator `stereo` spread and a chorus is two delay lines panned
   * apart — the width IS the sound on exactly the lush patches worth caching, and a
   * mono render would collapse it silently. Most presets are mono all the same, so
   * `collapseMono` puts the second channel back when it turns out to carry nothing.
   *
   * Sized by `layerNoteSeconds` rather than `VoiceRack.tailOf`, which cannot see an
   * MRDR-3 release at all — see there.
   *
   * Everything `_renderNote` says about Tone's global context applies here word for
   * word: the borrow is put back BEFORE the first `await`.
   */
  async _renderLayerNote(v, voiceId, notes, dur, detune, entry) {
    const OAC = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null;
    if (!OAC) { entry.rendering = false; entry.failed = true; return; }
    const job = async () => {
      const prevToneCtx = Tone.getContext();
      try {
        const sr = this.ctx.sampleRate;
        const longest = Array.isArray(dur)
          ? dur.reduce((m, d) => Math.max(m, Number.isFinite(d) ? d : 0), 0) : dur;
        const seconds = Math.min(30, layerNoteSeconds(v, longest));
        const ctx = new OAC(2, Math.ceil(seconds * sr), sr);
        const rack = new VoiceRack(ctx);
        const out = ctx.createGain();
        out.connect(ctx.destination);
        // The song warp folded in and the preset's own transpose left alone, because
        // `play` applies `pitchShift` on the way in and would otherwise apply it twice.
        // No `spb`: a tempo-synced LFO is refused by the gate, so there is no rate here
        // that could want one.
        const warped = notes.map((f) => (f > 0 ? f * detune : f));
        const played = rack.play('bass', voiceId, warped, {
          time: 0, dur, gain: 1, dry: out, wet: null, echo: false,
        });
        Tone.setContext(prevToneCtx);
        // A preset whose every layer is off builds nothing and plays nothing. Caching
        // the silence would be right but pointless, and it would hide the preset going
        // quiet behind a cache hit.
        if (!played) {
          entry.failed = true;
          this._cacheState.stats.failed++;
          return;
        }
        this._keepBuffer(entry, collapseMono(trimSilence(await ctx.startRendering())));
      } catch (e) {
        Tone.setContext(prevToneCtx);
        console.warn('[voices] note cache could not render layer', voiceId, e?.message);
        entry.failed = true;
        this._cacheState.stats.failed++;
      } finally {
        entry.rendering = false;
      }
    };
    this._queueRender({ key: entry.key, entry, voiceId, revision: entry.revision,
      generation: entry.generation, run: job });
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
    //
    // RETIRED rather than disposed, for the same reason `prune` retires: the caller is
    // scheduling a note a quarter-second out, and the pool it is replacing very likely
    // has notes booked on it further out still. Disposing here cut those notes before
    // their start times ever arrived — they simply never sounded. Retiring lets what
    // is already booked ring out on the old synths while the new note goes to the new
    // pool. See `_retire`, which drops the key itself and disposes immediately offline.
    if (pool && (pool.dry !== dry || pool.wet !== wet)) {
      this._retire(key, pool);
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
    const type = spec.type || dfltType;
    // Every number that will reach an AudioParam, checked once here.
    //
    // A biquad handed a non-finite corner THROWS, and this runs inside the scheduling
    // pass: one bad number would kill not just this note but every note after it. A
    // resonant filter swept across one is also the standing suspect for the "state is
    // bad, probably due to unstable filter caused by fast parameter automation"
    // warning Chrome logs just before a non-finite sample escapes into the mix.
    //
    // Substituted rather than skipped, because five of the seven callers wire
    // `chain.head`/`chain.tail` straight into the graph and a null would only be a
    // different crash. A filter at its default corner is audibly wrong for one note;
    // it leaves the song playing and the fault named in the log.
    const num = (value, fallback, what) => {
      if (Number.isFinite(value)) return value;
      console.warn(`[voices] non-finite ${what} in a filter — using ${fallback}`, spec);
      return fallback;
    };
    const freq = Math.max(20, num((spec.freq ?? dfltFreq) * mul, dfltFreq, 'cutoff'));
    const Q = num(spec.Q ?? 0.7, 0.7, 'resonance');
    const swept = spec.to != null && spec.to !== (spec.freq ?? dfltFreq);
    const to = swept ? Math.max(20, num(spec.to * mul, freq, 'sweep target')) : freq;
    const sweep = num(spec.sweep ?? ((spec.attack ?? 0.001) + (spec.decay ?? 0.12)), 0.12, 'sweep time');
    const at = num(t, ctx.currentTime, 'start time');
    noteFilterWrite({ t: at, type, freq, to, sweep, Q, stages });
    let head = null; let tail = null;
    // Kept and returned so a caller can modulate the whole cascade — an LFO into one
    // stage's `.detune` of a -48 chain would wobble a quarter of the slope. The existing
    // callers read `head`/`tail` and ignore it.
    const built = [];
    for (let k = 0; k < stages; k++) {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, at);
      if (swept) f.frequency.exponentialRampToValueAtTime(to, at + sweep);
      f.Q.value = k === 0 ? Q : 0.7071;
      if (tail) tail.connect(f); else head = f;
      tail = f;
      built.push(f);
    }
    return { head, tail, stages: built };
  }

  /**
   * The last few filter builds, oldest first — the evidence for the next instability.
   *
   * Chrome says "BiquadFilterNode: state is bad, probably due to unstable filter
   * caused by fast parameter automation" and names nothing: not the node, not the
   * preset, not the numbers. This is the record that fills that gap, dumped by the
   * desk's watchdog the moment a non-finite sample reaches the output — see
   * checkAudioHealth. It is a DIAGNOSTIC and deliberately not a clamp: a Q of 40 is
   * a real preset in this library (`dsKickHard`'s ring), so narrowing the range
   * would be a sound change nobody has approved, made on a guess about which write
   * is the guilty one. Name it first.
   */
  recentFilterWrites() {
    return filterWrites.slice();
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
  _playNoise(v, { time, gain, dry, wet, echo, monoGroup = null }) {
    if (!this.noiseBuf) return false;
    const ctx = this.ctx;
    const n = v.noise || {};
    const previous = monoGroup ? this._monoGroups.get(monoGroup) : null;
    if (previous) {
      if (previous.release) previous.release(time);
      else if (previous.slot && previous.pool && !previous.pool.gone) {
        try { previous.slot.synth.triggerRelease(time); } catch { /* already quiet */ }
      }
    }
    const level = gain * (n.gain ?? 1);
    const taps = v.taps || [0];
    const hum = v.humanize || {};
    const buf = this._bufFor(n, 0.09);
    const sources = [];
    const gains = [];
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
      sources.push(src); gains.push(g);
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
      sources.push(o); gains.push(og);
    }
    if (monoGroup) {
      this._monoGroups.set(monoGroup, {
        release: (at) => {
          for (const g of gains) {
            try {
              if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(at);
              else g.gain.cancelScheduledValues(at);
              g.gain.setTargetAtTime(0, at, 0.002);
            } catch { /* already quiet */ }
          }
          for (const src of sources) {
            try { src.stop(at + 0.01); } catch { /* already stopped */ }
          }
        },
      });
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
    // A Drum Synth tune is a master pitch offset, not another pitch envelope.  Keep it
    // outside the tap bend so +12 semitones doubles every pitched source while each tap
    // still keeps its authored detune relationship.  Zero is deliberately neutral for
    // every existing preset, which predates this optional key.
    const tune = 2 ** ((v.tune ?? 0) / 12);
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
      //
      // Which is why BOTH nodes hang off `drive`, not just the shaper: TONE is the DRIVE's
      // tone control and nothing else. With the shaper absent there is no fizz to tame, so
      // a tone filter there would be a whole-voice EQ wearing the drive's label — which is
      // exactly what it used to be, and what it sounded like with DRIVE at zero.
      const out = ctx.createGain();
      out.gain.value = gain * fade;
      out.connect(dry);
      if (echo && wet) out.connect(wet);
      let into = out;
      if (v.drive > 0) {
        if (v.tone) {
          const tf = ctx.createBiquadFilter();
          tf.type = v.tone.type || 'lowpass';
          tf.frequency.value = Math.max(20, (v.tone.freq ?? 8000) * tone);
          tf.Q.value = v.tone.Q ?? 0.7;
          tf.connect(into);
          into = tf;
        }
        const shaper = ctx.createWaveShaper();
        shaper.curve = this._driveCurve(v.drive, v.shape);
        shaper.connect(into);
        into = shaper;
      }

      let len = 0;
      if (o) {
        const osc = ctx.createOscillator();
        osc.type = o.type || 'sine';
        const from = (o.from ?? 190) * tune * bend;
        const to = (o.to ?? 52) * tune * bend;
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
        //
        // At an index of ZERO there is no modulator, the way `_playLayer` already reads
        // the same key: `env` floors its level at 1e-4, so a depth of nothing was still
        // an oscillator and a gain node per tap, swinging the carrier by a ten-thousandth
        // of a hertz. Identical output, built anyway — and it made "wind INDEX down"
        // mean something different here from what it means one synth over.
        if (o.fm && (o.fm.index ?? 1) > 0) {
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
        k.frequency.setValueAtTime(300 * tune * bend, t);
        k.frequency.exponentialRampToValueAtTime(180 * tune * bend, t + 0.04);
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
        f.frequency.setValueAtTime(Math.max(20, (r.freq ?? 400) * tune * bend), t);
        if (r.to != null) {
          f.frequency.exponentialRampToValueAtTime(Math.max(20, r.to * tune * bend), t + (r.sweep ?? (r.decay ?? 0.25)));
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
        const base = Math.max(20, (m.freq ?? 800) * tune * bend);
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
              Math.max(20, m.to * tune * bend * at), t + (m.sweep ?? mlen),
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
  _playAdditive(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', preview = false, hold = preview }) {
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
    // One LFO for the whole note-on, so a chord counts its held tones and stops it with
    // the last of them — the same bookkeeping `_playLayer` does, for the same reason.
    const sharedMods = { oscs: [], holds: 0 };
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
        // A drawbar stack under a finger is gate-driven, exactly as the organ it is modelled
        // on does — one envelope shared by every partial, so they let go together. Even a
        // sustain-zero setting is still a real ADSR gate: if the finger lifts during attack
        // or decay, Release starts from the level reached at that instant. The percussion
        // register below is deliberately NOT held: a Hammond's percussion is a circuit
        // constant that strikes once and is gone however long the key is down.
        const stackHolds = hold;
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
          // The PARTIAL's frequency, not the note's: each bar of the registration is its
          // own oscillator through its own gate, and a sub-octave bar needs a longer fade
          // out of silence than the one three octaves above it.
          const off = gateAdsr(g.gain, t, stackHolds ? t + HOLD_SECONDS : end,
            level, shape, stackHolds, partial);
          if (stackHolds) { heldParams.push({ param: g.gain, e: shape }); heldSources.push(o); }
          if (vibCents) vibCents.connect(o.detune);
          o.connect(g); g.connect(out);
          o.start(t); o.stop(off + 0.01);
          lastOff = Math.max(lastOff, off + 0.01);
        }
        if (stackHolds && heldParams.length) {
          const noteKey = `${laneKey}|${f.toFixed(2)}`;
          this._releasePreview(noteKey);
          sharedMods.holds += 1;
          this._heldNative.set(noteKey, { params: heldParams, sources: heldSources, shared: sharedMods });
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
    if (lfo && lastOff) { lfo.start(time); lfo.stop(lastOff); sharedMods.oscs.push(lfo); }
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
   * One output chain per hit — at the default placement every layer sums into the same
   * drive, which is much of what makes a stack read as one instrument. (PLACE at PRE is
   * the deliberate exception, and it costs exactly that: see `drivePre`.) Whether the
   * echo bus hears the voice is the LANE's decision alone: a per-layer send/dry flag
   * existed briefly and lost — a routing choice no synth offers, hiding on a synth panel.
   * `wet` is tapped after the shaper and after the chorus, as `_playDrum` taps it after
   * its own: the echo bus hears the instrument, not its guts. Per-note level after both
   * too, and for the same reason (`voiceGain` linearity).
   *
   * The stages the whole stack passes through, in order, every one of them optional and
   * every one absent by default:
   *
   *   layers → [drive] → [global filter] → [global VCA] → [drive] → [trem] → [chorus] → out
   *              PRE                                        POST
   *
   * with the drive built by one `driveInto` from whichever end PLACE names, and the
   * chorus always last because it is the box the finished voice goes through.
   *
   * The LFO is KEY-SYNCED — one oscillator per note-on, phase zero, faded in over
   * `delay`. Deliberate, not a bug: a free-running rack-level LFO is order-dependent
   * state a stem render would have to reproduce, and this file's whole discipline is
   * that nothing here survives the note. Its targets are `filter`, `level` and `pitch`;
   * pitch LFO movement is separate from `$vibrato`, so a patch can combine a slow pitch
   * sweep with the smaller, conventional vibrato control.
   *
   * `mode` is the native path's key policy: POLY makes one graph per note, LEGATO keeps
   * the previous graph alive and retargets its pitch without starting its envelopes again,
   * and MONO builds the new graph while fading the old one over 5 ms. Keyed with the
   * preview flag, like `_pool`, so a desk keypress cannot move the song's glide origin.
   *
   * Like every native path: one-shot nodes, never pooled, nothing memoised by voice id
   * — which is exactly why live edits are audible on the next note.
   */
  _retargetLayerLegato(prev, base, time, dur, v, hold = false) {
    const stopAt = time + Math.max(0.001, dur || 0.001);
    const releaseValues = (prev.envelopes || [])
      .map(({ e }) => e?.release ?? 0.015)
      .filter(Number.isFinite);
    const gateValues = (prev.gates || [])
      .map(({ tail = 0, fade = 0.004 }) => tail + fade)
      .filter(Number.isFinite);
    const release = Math.max(0, ...releaseValues, ...gateValues);
    const finalStop = stopAt + release + 0.01;
    const glide = Math.max(0.001, v.portamento || 0.001);
    for (const { pitches, ratio } of prev.pitchSets || []) {
      const target = base * ratio;
      for (const pitch of pitches) {
        try {
          if (pitch.cancelAndHoldAtTime) pitch.cancelAndHoldAtTime(time);
          else pitch.cancelScheduledValues(time);
          if (v.portamento > 0) pitchRamp(pitch, target, time, glide);
          else pitch.setValueAtTime(target, time);
        } catch { /* the old graph may already have ended */ }
      }
    }
    // ---- a HELD note stops here -------------------------------------------------
    //
    // The pitch moved and that is the whole of the handover: a key press has no length,
    // so there is no release to re-arm and no source to stop early. Everything below this
    // line is a note whose end was known before it started — and doing it to a held note
    // is what made LEGATO on the keyboard fail to sustain at all. `source.stop(finalStop)`
    // pulled every oscillator back to the nominal length of a note nobody had let go of,
    // so pressing a second key CUT THE SOUND a fifth of a second later. The note ends when
    // `_releasePreview` says it does, which is what the note-off is for.
    if (hold) {
      prev.freq = base;
      prev.gateUntil = Infinity;
      prev.stopAt = Infinity;
      return;
    }
    // Cancel the old note's release, hold its current level, and release the same gate
    // at the new note's end. This is the envelope distinction between LEGATO and MONO.
    for (const { param, e } of prev.envelopes || []) {
      try {
        if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(time);
        else { param.cancelScheduledValues(time); param.setValueAtTime(param.value, time); }
        const envelopeRelease = Math.max(0, e?.release ?? 0.015);
        const off = stopAt + envelopeRelease;
        if (envelopeRelease > 0) param.exponentialRampToValueAtTime(1e-4, off);
        param.linearRampToValueAtTime(0, off + 0.005);
      } catch { /* the old graph may already have ended */ }
    }
    // A THROUGH layer has no amp envelope of its own, but it still carries a short
    // anti-click gate. That gate was scheduled when the FIRST note was built. Moving
    // only the global envelope therefore left the layer closing at the first note's
    // original end: the legato pitch changed, then the sound entered release anyway.
    // Hold it open through the active note and, where a global VCA owns the release,
    // through that tail as well. It remains a gate rather than becoming a second ADSR.
    for (const { param, level, tail = 0, fade = 0.004 } of prev.gates || []) {
      try {
        if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(time);
        else { param.cancelScheduledValues(time); param.setValueAtTime(param.value, time); }
        const gateEnd = stopAt + Math.max(0, tail);
        param.setValueAtTime(Math.max(1e-4, level), gateEnd);
        param.linearRampToValueAtTime(0, gateEnd + Math.max(0.001, fade));
      } catch { /* the old graph may already have ended */ }
    }
    for (const source of prev.sources || []) {
      try { source.stop(finalStop); } catch { /* already stopped */ }
    }
    prev.freq = base;
    prev.gateUntil = stopAt;
    prev.stopAt = finalStop;
  }

  /**
   * Hand a held note's release record to the key that just took its gate.
   *
   * LEGATO on a keyboard is one note under two fingers: the graph belongs to whoever
   * pressed last, so the note-off that ends it has to be that key's. The record moves
   * rather than being duplicated — two keys able to release one graph would let go of it
   * twice, and the second call would be writing a release onto nodes already stopped.
   */
  _rekeyHeldNote(record, to) {
    const from = record?.gateKey;
    if (!from || from === to) return;
    const held = this._heldNative.get(from);
    if (!held) return;
    this._heldNative.delete(from);
    this._heldNative.set(to, held);
    record.gateKey = to;
  }

  _playLayer(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', preview = false, hold = preview, spb = null }) {
    const ctx = this.ctx;
    const L = v.layer;
    if (!L) return false;
    // `bypassed` is the editor's reversible OFF store. Normally dropSection removes the
    // live subtree as well, but the marker is authoritative: a draft can be copied or
    // rebound while a repaint is in flight, and an OFF section must never leak back into
    // the audio graph just because a stale live value was retained alongside its hold.
    const held = (key, section = null) => sectionBypassed(v, key, section);
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
      .filter(([key, s]) => s && !held(`layer.${key}`, s) && (s.gain ?? 1) > 0 && heard(key))
      .map(([key, spec]) => ({ key, spec }));
    if (!specs.length) return false;
    const all = Array.isArray(freq) ? freq : [freq];
    // A chord handed to a mono preset sounds its LAST note — the same answer the pool
    // gives (mono holds slot 0 and each chord tone restarts it), and what a hardware
    // mono synth does with one. Stacking all of them here would make MONO mean two
    // different things depending on which synth is behind the pill.
    const mode = v?.mode || keyMode(v);
    const mono = mode !== 'poly';
    const legato = mode === 'legato';
    const monoLast = mono ? all.filter((f) => f > 0).slice(-1) : null;
    const notes = monoLast && monoLast.length ? monoLast : all;
    const hum = v.humanize || {};
    const shift = VoiceRack.pitchShift(v) * detune;
    const nyquist = ctx.sampleRate * 0.5;
    // DEPTH is the switch. There is no `lfo.on` and there never was — an LFO at zero
    // modulates nothing, so it builds nothing, and the panel's DEPTH pot at its stop is
    // the whole of "off". (The editor used to wrap this in a section switch as well,
    // which was two ways to say one thing.)
    //
    // The target defaults rather than gating. It used to be a third condition, so an
    // `lfo` block carrying a depth and no target was silently inert — which is exactly
    // what winding DEPTH up on a preset that had never had an LFO produced, once the
    // section switch that used to seed the whole block went away: a pot that moved and
    // did nothing. `filter` is what the panel offers first and what `SECTION_DEFAULTS`
    // seeded, so it is what an unstated target means.
    const lfoTarget = ['filter', 'level', 'pitch'].includes(L.lfo?.target)
      ? L.lfo.target : 'filter';
    const lfoSpec = L.lfo && (L.lfo.depth ?? 0) > 0 ? { ...L.lfo, target: lfoTarget } : null;
    // The global stage: one filter and one VCA the whole stack passes through, after
    // the layers and before the drive. Both sections optional and BOTH ABSENT IS THE
    // DEFAULT — a preset with no `global` block builds not one extra node and sums its
    // layers straight into the chain exactly as it always did, which is what keeps
    // every shipped preset sample-identical. Either one present is the summed voice:
    // three layers arriving at one filter and one envelope, which is the difference
    // between a stack of sounds and an instrument.
    const gf = held('global.filter', v.global?.filter) ? null : (v.global?.filter || null);
    const gv = held('global.vca', v.global?.vca) ? null : (v.global?.vca || null);

    // ---- DRIVE PLACEMENT -----------------------------------------------------
    //
    // POST is the default and the only thing this path used to do: the whole stack
    // through the global filter and the global VCA, and THEN into the shaper. PRE puts
    // the shaper and its TONE filter in FRONT of that stage instead. Both are built by
    // `driveInto`; what the pill chooses is which end calls it.
    //
    // With NO global stage there is nothing to be pre or post OF, so the key is ignored
    // and the shaper stays exactly where it was. That is deliberate rather than a guard:
    // it means a preset carrying `drivePlace: 'pre'` and no `global` block renders the
    // same samples as the same preset without the key, so the pill can never quietly
    // become the difference between two takes of a patch that has no stage to move.
    const drivePre = v.drivePlace === 'pre' && !!(gf || gv);

    // ---- CHORUS 2 ------------------------------------------------------------
    //
    // ALWAYS POST — after the drive, after the tremolo, after everything. It is not a
    // colour inside the voice but the box the finished voice goes through, which is
    // exactly what it is on the Juno this is modelled on, and why it takes no placement
    // pill of its own: there is nowhere else for it to be.
    //
    // MIX is the switch, the same deal the LFO's DEPTH makes: a chorus at zero mix builds
    // nothing, so there is no `chorus.on` and there never will be. Every other value
    // falls back to the number the panel opens on, so winding MIX up on a preset that has
    // never had a chorus gives you a chorus rather than a pot that moves and does nothing.
    const choSpec = !held('chorus', v.chorus) && (v.chorus?.mix ?? 0) > 0 ? v.chorus : null;

    // ---- the shared modulators, one of each per note-on ----------------------
    // Vibrato exactly as `_playAdditive` builds it: the same key, the same semitones,
    // 100 cents per unit and no ceiling, the same onset delay — a preset's wobble means
    // one thing whichever synth plays it. Every oscillator of every layer takes it on
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
    // The modulators shared by every note in this note-on — the vibrato LFOs and the
    // routable one. A chord registers one held record PER TONE, so these cannot simply
    // be stopped with the first key released or the notes still down would lose their
    // wobble. Counted instead, and stopped when the last of them lets go. Filled in
    // after the notes are built, which is where these oscillators are started.
    const sharedMods = { oscs: [], holds: 0 };
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
      // Uncapped, as `_playGame` and `_playAdditive` are. The editor's pot travels to
      // twelve semitones and the clamp that used to sit here made the top eleven
      // twelfths of it inert — the same preset wobbling differently on two lanes,
      // which is exactly what the comment above says this path does not do.
      cents.gain.setValueAtTime(vib.depth * 100, time);
      lfo.connect(env); env.connect(cents);
      vibOscs.push(lfo);
      vibVoices.set(key, cents);
      return cents;
    };
    // The routable LFO. Unit-amplitude oscillator, onset fade, then one depth gain in
    // the units its destination takes: cents for a filter's `.detune` (3600 at full —
    // three octaves either side of centre), a bipolar modulation gain for tremolo.
    const LFO_FILTER_CENTS = 3600;
    const LFO_PITCH_CENTS = 1200;
    let lfoOsc = null; let lfoOut = null; let lfoSampleHold = false;
    if (lfoSpec) {
      lfoSampleHold = lfoSpec.type === 'samplehold';
      lfoOsc = lfoSampleHold ? ctx.createConstantSource() : ctx.createOscillator();
      if (lfoSampleHold) {
        // Sample-and-hold is a stepped random LFO: one deterministic value per period,
        // held until the next one. It is scheduled as ConstantSource automation rather
        // than an AudioWorklet so it remains available to the offline renderer and stems.
        lfoOsc.offset.setValueAtTime(hitRandom(time, 1907) * 2 - 1, time);
      } else {
        lfoOsc.type = nativeWave(lfoSpec.type, 'sine');
        const freeRate = Math.max(0.01, lfoSpec.rate ?? 4);
        const tempoSteps = LFO_TEMPO_STEPS[lfoSpec.division] ?? 4;
        const rate = lfoSpec.sync === 'tempo' && Number.isFinite(spb) && spb > 0
          ? 1 / (spb * tempoSteps) : freeRate;
        lfoOsc.frequency.setValueAtTime(rate, time);
      }
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, time);
      env.gain.linearRampToValueAtTime(1, time + Math.max(0.001, lfoSpec.delay || 0.001));
      lfoOut = ctx.createGain();
      const depth = Math.min(1, Math.max(0, Number(lfoSpec.depth) || 0));
      const amount = lfoSpec.target === 'filter' ? depth * LFO_FILTER_CENTS
        : lfoSpec.target === 'pitch' ? depth * LFO_PITCH_CENTS : depth;
      lfoOut.gain.setValueAtTime(amount, time);
      lfoOsc.connect(env); env.connect(lfoOut);
    }

    // ---- glide and choke ----------------------------------------------------
    const glideKey = `${laneKey}|${v.id}${preview ? '|p' : ''}`;
    this._last ||= new Map();
    const prev = mono ? this._last.get(glideKey) : null;
    // FINGERED, the pooled path's rule stated once more on the path that has to obey it:
    // a glide needs the previous note to be STILL GATED at this note-on. `_last` outlives
    // the note it describes — that is how MONO finds the note to choke — so an ungated
    // glide origin was not "the last note" but "the last note ever", and a preset glided
    // in from whatever this lane played bars of rest ago. Worst on a jump: the first note
    // after a loop wrap or a seek arrived from the other side of it.
    //
    // `gateUntil` is the gate and nothing else — not the release tail. A note whose
    // predecessor is still ringing out is not legato, it is a note after a rest with the
    // room still sounding, and gliding into it is a different instrument.
    //
    // And a FINGER is not a length: `gateKey` is a key still down, which outlasts the
    // nominal `gateUntil` a held preview was scheduled with. Both are "the note before
    // this one is still on", so both open the glide and both hand over the envelope.
    const gated = !!prev && prev.gateUntil > time;
    const fingered = !!prev && prev.gateKey != null;
    const overlap = gated || fingered;
    const glideFrom = overlap && glideTime(v) > 0 ? prev.freq : null;
    if (legato && overlap && notes.length) {
      const f = notes[0];
      const di = monoLast ? all.lastIndexOf(f) : 0;
      const noteDur = Array.isArray(dur) ? (dur[di] ?? dur[0]) : dur;
      this._retargetLayerLegato(prev, f * shift * vary((v.humanize || {}).pitch, time, 16), time, noteDur, v, hold);
      // The new key owns the note now — LAST NOTE PRIORITY, which is what a mono synth
      // does and what the retarget already did to the pitch. Without the hand-over the
      // release record stayed under the FIRST key: letting go of the key you are actually
      // holding did nothing, and letting go of the one you had left behind cut the note.
      if (hold) this._rekeyHeldNote(prev, `${laneKey}|${f.toFixed(2)}`);
      return true;
    }
    // The choke: a hardware mono synth cuts the note still ringing. On the OLD note's own
    // output gains — its envelopes are already written, so this is a cancel and a fast
    // fade rather than a fight over the same events.
    //
    // A CYCLE AND A HALF of the note being cut, not a flat 5ms. At 55Hz, 5ms is a quarter
    // of a cycle: the old note gets cut mid-swing, which is a transient of its own, and it
    // arrives at the same instant as the new note's onset with nothing left ringing to
    // cover it — two clicks at once, which is why mono was the worst case down there.
    // Above ~300Hz a cycle and a half is under 5ms and this is the fade it always was.
    // Capped at 30ms so a sub-bass note cannot smear into the note replacing it, and
    // never longer than the old note has left to run: being stopped mid-fade is the very
    // step this is here to avoid.
    if (mode === 'mono' && prev && prev.stopAt > time) {
      const fade = Math.min(
        0.03,
        Math.max(0.005, prev.freq > 0 ? 1.5 / prev.freq : 0),
        Math.max(0.001, prev.stopAt - time),
      );
      for (const o of prev.outs) {
        // `cancelAndHoldAtTime` is the whole point: `time` is up to a lookahead — a
        // quarter of a second — in the FUTURE, and `gain.value` is the value NOW. Pinning
        // the future gain to the present one steps a note still climbing its attack up or
        // down before the fade, which is the click. Holding takes the value the
        // automation would have reached, which is what "cut the note still ringing" means.
        if (o.gain.cancelAndHoldAtTime) o.gain.cancelAndHoldAtTime(time);
        else { o.gain.cancelScheduledValues(time); o.gain.setValueAtTime(o.gain.value, time); }
        o.gain.linearRampToValueAtTime(0, time + fade);
      }
    }

    const allOuts = [];
    const pitchSets = [];
    const legatoEnvelopes = [];
    const legatoGates = [];
    const legatoSources = [];
    let lastBase = 0;
    // The chorus modulator, declared out here for the same reason the vibrato and LFO
    // oscillators are: it is built inside `chainFor`, and nothing can be started until
    // `lastOff` is known.
    let chorusOsc = null;
    let gateUntil = 0;
    // Which KEY holds that gate open, when a finger does. A sequenced note has none and
    // its gate simply ends at `gateUntil`; a held one ends when the key comes up, which
    // is what `_releasePreview` closes. Only the last tone of a chord can own it, which
    // is exactly the tone a non-poly mode keeps.
    let gateKey = null;
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

      // ---- the drive, wherever PLACE put it ---------------------------------
      //
      // One builder, called from one of two places, so PRE and POST are provably the
      // same shaper with the same curve and the same tone filter rather than two
      // spellings that drifted. It returns the new head of whatever it was handed.
      //
      // TONE is the DRIVE's tone control, so both nodes hang off `drive` together — see
      // the same pairing in `_playDrum`. With no shaper there is no fizz to tame, and a
      // tone filter left standing on its own would be a whole-voice EQ wearing the
      // drive's label. The layer and Global Filter sections are where a voice's
      // brightness is set; this one only ever shapes what the drive added. That holds in
      // BOTH placements: at PRE the pair moves together, or TONE would become a second
      // cutoff in front of the Global Filter wearing the drive's name.
      const driveInto = (dest, mul) => {
        if (!(v.drive > 0)) return dest;
        let into = dest;
        if (v.tone) {
          const tf = ctx.createBiquadFilter();
          tf.type = v.tone.type || 'lowpass';
          tf.frequency.value = Math.max(20, (v.tone.freq ?? 8000) * mul);
          tf.Q.value = v.tone.Q ?? 0.7;
          tf.connect(into); into = tf;
        }
        const shaper = ctx.createWaveShaper();
        shaper.curve = this._driveCurve(v.drive, v.shape);
        shaper.connect(into); into = shaper;
        return into;
      };

      // One chain per note, built on demand: shaper → tone → trem → chorus → out. A note
      // of nothing but rests builds none of it.
      let chain = null;
      const chainFor = () => {
        if (chain) return chain;
        const out = ctx.createGain();
        out.gain.value = gain * fade;
        out.connect(dry);
        if (echo && wet) out.connect(wet);
        allOuts.push(out);
        let into = out;
        if (choSpec) {
          // LAST, after the tremolo and after everything the note's own shaping does —
          // a Juno's chorus is the stage AFTER the VCA, not another colour inside the
          // voice. It sits before `out` rather than after it so the echo send, which
          // taps `out`, hears the chorused instrument: the same rule the shaper follows.
          //
          // One per NOTE-ON, shared by every tone in the chord, because that is what the
          // hardware is — one pair of delay lines the whole keyboard runs through. Per
          // note it would be three choruses beating against each other.
          const c = buildChorus(ctx, choSpec, t, into);
          chorusOsc = c.osc;
          into = c.input;
        }
        if (lfoSpec && lfoSpec.target === 'level') {
          // Proper bipolar tremolo around the authored level: depth 0.5 means a
          // gain swing from .5 to 1.5, rather than only a shallow downward pull.
          // In BOTH chains, from the one LFO.
          const trem = ctx.createGain();
          trem.gain.setValueAtTime(1, t);
          lfoOut.connect(trem.gain);
          trem.connect(into); into = trem;
        }
        // The POST drive, which is where it has always been and where it stays unless
        // PLACE says otherwise — see `drivePre` and `driveInto`.
        if (!drivePre) into = driveInto(into, toneMul);
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
        gateUntil = Math.max(gateUntil, gEnd);
        // ---- held notes -------------------------------------------------------
        //
        // A HELD note is played by a FINGER, so it has no length until the finger says
        // so. Every MRDR VCA is therefore gate-driven, including sustain-zero envelopes:
        // they may decay to silence while the key remains down, but releasing during attack
        // or decay must still begin Release from the current level. A layer using `through`
        // has no local VCA and is held only when the shared global VCA holds it.
        //
        // A previewed note that is NOT held — the bench's pattern player, which knows each
        // note's length before it sounds — takes the ordinary gate at `gEnd` instead, so a
        // sustaining patch releases on the step rather than ringing to `HOLD_SECONDS`.
        const holdEnd = t + HOLD_SECONDS;
        const heldParams = [];
        const heldSources = [];
        // What a live edit can still move on a note that is already SOUNDING. Only params
        // that were set once rather than automated: a cutoff is written at note-on and
        // sits there, so it can be walked under your hand; an envelope is a trajectory
        // already booked, and rewriting it mid-flight fights what it has scheduled.
        //
        // The specs are held by REFERENCE, and that is the trick — the panel edits
        // `VOICES[id]` in place, so the object recorded here IS the one the pot moves, and
        // re-reading it later gives the current value with no lookup. See `refresh`.
        const heldLive = [];
        let stage = null;
        // When the global VCA ends, for the layers that have handed their shaping to it.
        let vcaOff = 0;
        let heldVca = null;
        const stageFor = () => {
          if (stage) return stage;
          // Built from the OUTPUT backwards, so at POST the signal reads filter → VCA →
          // drive. The VCA sits before the shaper because the shaper then hears an
          // enveloped note, which is most of why drive sounds like playing rather than
          // like a setting — and, with the curve normalised to full scale, why DRIVE
          // doubles as a compressor there and flattens what the VCA just drew.
          //
          // At PRE the pair is added LAST, so it ends up FIRST: layers → drive → filter
          // → VCA. That is the other instrument — the filter cleans up the shaper's fizz
          // instead of the TONE pot doing it afterwards, a cutoff sweep is heard on a
          // spectrum the drive made rich rather than one it re-fills downstream, and the
          // envelope survives intact because nothing squashes it after it is drawn.
          let head = chainFor().into;
          if (gv) {
            const vg = ctx.createGain();
            // Peak 1: the level lives on the layers and on the note's own gain. A third
            // control called LEVEL on one signal path is how two of them end up wrong.
            const vcaHolds = hold;
            const off = gateAdsr(vg.gain, t, vcaHolds ? holdEnd : gEnd, 1, gv, vcaHolds, base);
            if (!vcaHolds) legatoEnvelopes.push({ param: vg.gain, e: gv });
            if (vcaHolds) heldParams.push({ param: vg.gain, e: gv });
            // The modulators have to outlive this tail — a global release longer than
            // every layer's would otherwise have its LFO stopped out from under it.
            // The oscillators still stop at their OWN layer's off: a VCA can only shape
            // what is playing, and running them to the global tail would pay for silence.
            lastOff = Math.max(lastOff, off);
            vcaOff = off;
            vg.connect(head); head = vg;
            if (vcaHolds) heldVca = vg;
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
            heldLive.push({ chain, spec: gf, mul: track * toneMul });
            head = chain.head;
          }
          // PRE, and therefore per NOTE rather than per note-on — the global stage is
          // built per note so KEY FOLLOW can read this note's own frequency, and anything
          // in front of it inherits that. It is the real cost of the switch and worth
          // saying out loud: at POST a chord's three tones sum into ONE shaper and
          // intermodulate, which is much of what makes a stack read as one instrument;
          // at PRE each tone distorts alone and the chord comes out cleaner and thinner.
          // A placement pill buys a different sound, not a tidier version of the same one.
          if (drivePre) head = driveInto(head, toneMul);
          stage = { head, off: vcaOff };
          return stage;
        };

        // eslint-disable-next-line no-loop-func
        const registerHold = () => {
          if (hold && heldParams.length) {
            const noteKey = `${laneKey}|${f.toFixed(2)}`;
            // The same key pressed again restarts rather than stacking — the pooled path's
            // own rule, applied here so both behave alike under a trill.
            this._releasePreview(noteKey);
            sharedMods.holds += 1;
            gateKey = noteKey;
            this._heldNative.set(noteKey, {
              params: heldParams, sources: heldSources, shared: sharedMods,
              live: heldLive, voiceId: v.id, glideKey,
            });
            return;
          }
          // A GATED preview — the bench's auto-play, which knows each note's length before
          // it sounds. There is nothing to release and no note-off coming, so it is not a
          // held note; but it IS the note you are listening to while you drag a cutoff, and
          // a panel that only moved notes with a finger on them meant auditioning under a
          // figure went dead under the hand. Registered for that alone: the filters, and
          // when they are over.
          if (preview) this._registerLiveNote(v.id, heldLive, Math.max(gEnd, lastOff));
        };

        for (const { key: layerKey, spec } of specs) {
          // ---- DELAY: when this layer enters ---------------------------------
          //
          // The layer's whole schedule moves, which is the difference between a delay and
          // a slow attack. An attack that opens over 100 ms is a layer already on its way
          // in from the downbeat; this is silence and then the attack the layer was given,
          // intact — the brass bloom, the sub that lands behind the transient, the bell
          // partial that appears after the strike rather than fading up through it.
          //
          // `humanize.entry` is NOT this. It staggers unison voices by a few milliseconds
          // and moves only `src.start`, leaving the envelope where it was, so a large
          // value there clips the attack instead of delaying it. One is a humaniser, the
          // other is a control, and they sum.
          //
          // Seconds rather than a fraction of the note: `len` already says note-relative,
          // and a bloom that got faster because the part got busier is not one.
          const lDelay = Math.min(0.5, Math.max(0, spec.delay ?? 0));
          const lt = t + lDelay;
          // The per-layer length: this layer's own note, as a fraction (or multiple)
          // of the drawn one. bass80s' octave tick lives and dies inside the note the
          // sub is still holding — that is the sound, not an approximation of it.
          //
          // Measured from the layer's OWN start, so a delayed layer keeps the shape it was
          // given and runs past the others rather than having its tail eaten. `lastOff`
          // grows with it below, which is what carries the later end to the global VCA's
          // tail and to the mono choke.
          const end = lt + Math.max(0.001, (noteDur || 0.001) * (spec.len ?? 1));
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
          // Osc 1 is the hard-sync master. A synced slave is one periodic waveform at
          // Osc 1's fundamental; its own interval/detune/unison spread decides how many
          // slave cycles fit before every master reset. Noise has no phase to reset.
          const syncSlaves = v.sync === '1+2+3' ? ['osc2', 'osc3']
            : v.sync === '1+2' ? ['osc2'] : v.sync === '1+3' ? ['osc3'] : [];
          const syncMaster = L.osc1;
          const hardSynced = !isNoise && syncMaster && syncSlaves.includes(layerKey);
          // Where this layer sums: the global stage when the preset has one, the note-on
          // chain when it does not. The null path is the old line unchanged.
          const into = (gf || gv) ? stageFor().head : chainFor().into;

          // The layer's own gain, enveloped once and shared by its unison voices.
          const g = ctx.createGain();
          // ---- whose envelope shapes this layer ----------------------------
          //
          // `vca: 'through'` takes the layer's own amp OUT: its oscillators sum at their
          // LEVEL and nothing else, and the global VCA downstream is what shapes them.
          // That is the classic three-oscillator architecture — three VCOs into a mixer,
          // one VCF, one VCA — which this synth could describe in every respect except
          // this one, because a per-layer envelope was compulsory.
          //
          // What is left here is a GATE, not an envelope: the level is held flat and taken
          // to zero over 4 ms at the end, which exists only so a stopped oscillator does
          // not click. With a global VCA the gate closes when the VCA has finished, so it
          // is inaudible under the release; with no global stage at all it closes at the
          // note's own end, which is a modular's VCO straight to the output — a raw gate,
          // and what asking for one should sound like.
          const through = spec.vca === 'through';
          const layerHolds = !through && hold;
          let off;
          if (through) {
            // The gate opens when the LAYER starts, not when the note does — a delayed
            // layer handed to the global VCA is silent until it enters, then joins the
            // envelope already in progress, which is what a late VCO into a shared VCA
            // does. It is held at zero first so the delay is silence rather than level.
            const gateEnd = Math.max(lt + 0.002, stage?.off || end);
            const lvl = Math.max(1e-4, spec.gain ?? 1);
            if (lDelay > 0) g.gain.setValueAtTime(0, t);
            g.gain.setValueAtTime(lvl, lt);
            g.gain.setValueAtTime(lvl, gateEnd);
            g.gain.linearRampToValueAtTime(0, gateEnd + 0.004);
            if (!hold) {
              const tail = gv ? Math.max(0, gv.release ?? 0.015) + 0.005 : 0;
              legatoGates.push({ param: g.gain, level: lvl, tail, fade: 0.004 });
            }
            off = gateEnd + 0.006;
          } else {
            if (lDelay > 0) g.gain.setValueAtTime(0, t);
            // `target`, not `base`: a sub layer an octave down is the lowest thing in the
            // stack and the one whose gate has the least of a cycle to work with.
            off = gateAdsr(g.gain, lt, layerHolds ? holdEnd : end,
              spec.gain ?? 1, spec, layerHolds, target);
            if (!hold) legatoEnvelopes.push({ param: g.gain, e: spec });
            if (layerHolds) heldParams.push({ param: g.gain, e: spec });
          }
          lastOff = Math.max(lastOff, off);

          // The filter, when the layer has one — per layer, not per unison voice: a
          // fat stack through one filter is a synth voice, through five is a chorus
          // of synths, and the engine voice being recreated had one.
          let dest = g;
          if (spec.filter && !held(`layer.${layerKey}.filter`, spec.filter)) {
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
              lt, track * toneMul, 'lowpass', 1150,
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
            filterEnv(chain.stages, fl.env, lt, end);
            heldLive.push({ chain, spec: fl, mul: track * toneMul });
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
          // This layer's own modulators. They are not in `sources` — nothing downstream
          // of them is audible on its own — but a HELD preview note has to be able to
          // pull their stops back with everything else, or a released key leaves them
          // running silently to the 30-second safety stop.
          const layerMods = [];

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
          const pwm = !hardSynced && spec.type === 'pulse'
            && spec.pwm && (spec.pwm.depth ?? 0) > 0
            ? spec.pwm : null;
          const wCentre = Math.min(0.95, Math.max(0.05, spec.width ?? 0.5));
          // ---- the duty is SECONDS, and a glide moves what a second is worth --------
          //
          // The pulse is `saw(t) − saw(t − Δ)`, so the duty the ear hears is `Δ · f(t)`,
          // not Δ. Setting Δ once from the destination pitch made every glided note start
          // at the WRONG width and slide into the right one: a whole tone is a 12% error
          // for the length of the portamento, and an octave drop takes `bestPwmGrowlBass`
          // to a duty of 1.000 — where the delay is exactly one period, the two saws
          // cancel, and the layer drops out for the first thirty milliseconds of the note.
          //
          // Holding the duty still means Δ(t) = width / f(t). `pitchRamp` glides the pitch
          // exponentially, and the reciprocal of an exponential ramp is an exponential
          // ramp between the reciprocal endpoints — so this is the exact inverse, not an
          // approximation of one, and it costs a ramp rather than an AudioWorklet.
          //
          // Vibrato and FM still move the duty, because they arrive as connections to
          // `.detune` rather than as automation anything here can read. They are ±1.2% at
          // the depths this library uses, against an octave here.
          const glideEnd = t + Math.max(0.001, v.portamento || 0.001);
          // The delay line is built with 0.25s of room, so a reciprocal off a very low
          // starting note is clamped rather than silently pinned by the node.
          const secsAt = (hz) => Math.min(0.249, wCentre / Math.max(1, hz));
          const startHz = glideFrom ? Math.max(1, glideFrom * ratio) : target;
          let pwmSecs = null;
          if (pwm) {
            const lfo = ctx.createOscillator();
            lfo.type = nativeWave(pwm.type, 'sine');
            lfo.frequency.setValueAtTime(Math.max(0.01, pwm.rate ?? 0.4), lt);
            const env = ctx.createGain();
            env.gain.setValueAtTime(0, lt);
            env.gain.linearRampToValueAtTime(1, lt + Math.max(0.001, pwm.delay || 0.001));
            // How far the duty may swing before it would leave the range a pulse HAS: at
            // a 20% centre it can fall no further than 15 points, and asking for more is
            // asking for a duty of zero, which is silence rather than a wider sound.
            const room = Math.min(wCentre - 0.05, 0.95 - wCentre);
            const swing = Math.min(room, Math.min(1, pwm.depth) * 0.45);
            pwmSecs = ctx.createGain();
            // The SWING is seconds-per-duty too, so it tracks the glide by the same
            // reciprocal — otherwise the centre would hold still while the modulation
            // around it breathed wider and narrower on every glided note.
            // A width sitting on either limit leaves no room to swing at all, and an
            // exponential ramp cannot end on the zero that gives — it stays a flat zero.
            pwmSecs.gain.setValueAtTime(swing / Math.max(1, startHz), t);
            if (glideFrom && swing > 0) {
              pwmSecs.gain.exponentialRampToValueAtTime(swing / Math.max(1, target), glideEnd);
            }
            lfo.connect(env); env.connect(pwmSecs);
            lfo.start(lt); lfo.stop(off + 0.01);
            layerMods.push(lfo);
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
            const sourceEnds = new Map();
            const sourceStarts = new Map();
            const grainStarts = new Map();
            let o;
            if (isNoise) {
              o = ctx.createBufferSource();
              // Looped: the buffer is shorter than a held note. Which buffer follows
              // `_bufFor`'s rule and its 5% margin — a layer that outlasts the short
              // one gets the long one, so an eight-second pad does not drop the same
              // seam at the same half-second offset sixteen times over. Short blips are
              // untouched, and the band still takes the edge off whichever seam is left.
              const long = (off - lt) > (this.noiseBuf.duration || 0.5) * 1.05;
              o.buffer = this._noise(spec.color, long);
              o.loop = true;
              const bp = ctx.createBiquadFilter();
              bp.type = 'bandpass';
              bp.Q.setValueAtTime(NOISE_Q, lt);
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
              line.delayTime.setValueAtTime(secsAt(startHz), lt);
              if (glideFrom) line.delayTime.exponentialRampToValueAtTime(secsAt(target), glideEnd);
              pwmSecs.connect(line.delayTime);
              out = sum; sources.push(a, b);
              pitches.push(a.frequency, b.frequency); dets.push(a.detune, b.detune);
            } else {
              // A static sync table is enough when the slave has no pitch envelope. When
              // it does, refresh the table in short, crossfaded grains. Each grain is one
              // master-frequency oscillator whose table contains the slave ratio sampled
              // at that point in the envelope. This keeps the reset spectrum moving
              // while staying native and OfflineAudioContext-renderable.
              const syncBend = hardSynced && spec.pitch
                && (spec.pitch.semitones ?? 0) !== 0;
              const masterRatio = Math.max(0.01, syncMaster.ratio ?? 1);
              const slaveCents = (spec.detune ?? 0)
                + (count > 1 ? (spec.spread ?? 20) * (u / (count - 1) - 0.5) : 0);
              if (syncBend) {
                out = ctx.createGain();
                const grainSeconds = 0.032;
                const grainCount = Math.max(1, Math.ceil((end - lt) / grainSeconds));
                const span = (end - lt) / grainCount;
                const crossfade = Math.min(0.004, span * 0.25);
                for (let grain = 0; grain < grainCount; grain++) {
                  const start = lt + grain * span;
                  const stop = Math.min(end, start + span);
                  const middle = start + (stop - start) * 0.5;
                  const bend = pitchEnvValue(spec.pitch, middle, lt, end);
                  const relative = (ratio / masterRatio)
                    * (2 ** ((slaveCents + bend) / 1200));
                  const part = ctx.createOscillator();
                  part.setPeriodicWave(hardSyncTable(ctx, spec.type, relative, wCentre));
                  const level = ctx.createGain();
                  level.gain.setValueAtTime(grain === 0 ? 1 : 0, start);
                  if (grain > 0) level.gain.linearRampToValueAtTime(1, start + crossfade);
                  if (grain < grainCount - 1) {
                    level.gain.setValueAtTime(1, stop - crossfade);
                    level.gain.linearRampToValueAtTime(0, stop);
                  }
                  part.connect(level); level.connect(out);
                  sources.push(part);
                  pitches.push(part.frequency);
                  dets.push(part.detune);
                  grainStarts.set(part.frequency, start);
                  sourceStarts.set(part, start);
                  sourceEnds.set(part, stop + 0.006);
                }
              } else {
                o = ctx.createOscillator();
                // `pulse` is the fifth waveform: a table rather than a type, at whatever
                // duty the layer asks for. Everything downstream — detune, unison, the
                // pitch envelope, FM, the filter — is identical to an oscillator's,
                // because it IS one.
                if (hardSynced) {
                  const relative = (ratio / masterRatio) * (2 ** (slaveCents / 1200));
                  o.setPeriodicWave(hardSyncTable(ctx, spec.type, relative, wCentre));
                } else if (spec.type === 'pulse') o.setPeriodicWave(pulseTable(ctx, wCentre));
                else o.type = nativeWave(spec.type, 'square');
                out = o; sources.push(o);
                pitches.push(o.frequency); dets.push(o.detune);
              }
            }
            const cents = hardSynced ? (syncMaster.detune ?? 0) : (spec.detune ?? 0)
              + (count > 1 ? (spec.spread ?? 20) * (u / (count - 1) - 0.5) : 0);
            // The static offset is the pitch envelope's BASE when there is one, because
            // both live on `.detune` and an envelope scheduled from zero would cancel a
            // DETUNE written before it. Dynamic sync puts the slave bend into each
            // grain's table, so detune is reserved for master pitch and vibrato.
            if (!hardSynced && spec.pitch && (spec.pitch.semitones ?? 0) !== 0) {
              pitchEnv(dets, spec.pitch, lt, end, cents);
            } else if (cents) for (const d of dets) d.setValueAtTime(cents, lt);
            const vibCents = vibFor(u);
            if (vibCents) for (const d of dets) vibCents.connect(d);
            if (lfoSpec?.target === 'pitch') for (const d of dets) lfoOut.connect(d);

            // Pitch and glide no longer compete. The envelope is cents on `.detune` and
            // the glide is hertz on `.frequency`, so a preset can do both: arrive from
            // the previous note AND bend on the way, which is a portamento lead with a
            // scoop and was unreachable while the two shared one param.
            for (const pitch of pitches) {
              const playedRatio = hardSynced ? Math.max(0.01, syncMaster.ratio ?? 1) : ratio;
              const grainStart = grainStarts.get(pitch);
              if (grainStart != null) {
                pitch.setValueAtTime(base * playedRatio, grainStart);
                continue;
              }
              if (glideFrom) {
                // Written from the NOTE's start rather than the layer's, and that is not
                // an oversight: a portamento is one gesture the whole note makes, not
                // something each layer restarts on arrival. A param's automation runs
                // whether or not a source is playing it, so a delayed layer starts on the
                // pitch the glide has already reached and carries on with it — which is
                // what a late VCO patched to the same glide would do.
                //
                // A glide stays 'exp' — constant semitones per second is what a
                // portamento IS.
                pitch.setValueAtTime(Math.max(1, glideFrom * playedRatio), t);
                pitchRamp(pitch, base * playedRatio, t, Math.max(0.001, v.portamento));
              } else {
                pitch.setValueAtTime(base * playedRatio, t);
              }
            }
            pitchSets.push({ pitches, ratio: hardSynced ? (syncMaster.ratio ?? 1) : ratio });
            legatoSources.push(...sources);

            // One modulator for the whole unison stack, mirroring `_playDrum`'s
            // operator: pitch fixed at the carrier's STARTING frequency, depth in
            // hertz as a multiple of it. Built with the first voice, fanned into the
            // rest — five modulators would beat against each other.
            if (!hardSynced && spec.fm && (spec.fm.index ?? 1) > 0) {
              if (!fmSpread) {
                const mod = ctx.createOscillator();
                mod.type = nativeWave(spec.fm.type, 'sine');
                mod.frequency.setValueAtTime(target * (spec.fm.ratio ?? 1.4), lt);
                fmSpread = ctx.createGain();
                // Its own envelope through the same helper — a long decay is the
                // modulation swelling across the note, which is what brass is.
                adsr(fmSpread.gain, lt, end, target * (spec.fm.index ?? 1), {
                  attack: spec.fm.attack, decay: spec.fm.decay, sustain: 0, release: 0,
                });
                mod.connect(fmSpread);
                mod.start(lt); mod.stop(off + 0.01);
                layerMods.push(mod);
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
              pn.pan.setValueAtTime((u / (count - 1) - 0.5) * 2 * width, lt);
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
            for (const src of sources) {
              const ownStart = sourceStarts.get(src);
              src.start(ownStart ?? (lt + late));
              const ownEnd = sourceEnds.get(src);
              src.stop(ownEnd ?? (off + 0.01));
            }
            // A bypassed layer is held by the GLOBAL VCA, so its sources have to be let go
            // when that is — otherwise a key-up would release the envelope and leave the
            // oscillators running underneath it.
            if (layerHolds || (through && heldVca)) heldSources.push(...sources);
          }
          // Once per layer rather than per unison voice: the PWM LFO is the layer's, and
          // the FM operator is one modulator fanned across the whole stack.
          if (layerHolds || (through && heldVca)) heldSources.push(...layerMods);
        }
        registerHold();
      });
    }

    // `adsr` returns ABSOLUTE times, so these are used as they are — adding `time`
    // would double-count and leave modulator nodes running seconds past the note.
    if (mono && lastBase > 0) {
      this._last.set(glideKey, {
        freq: lastBase, outs: allOuts, pitchSets, envelopes: legatoEnvelopes,
        gates: legatoGates, sources: legatoSources, gateUntil, gateKey, stopAt: lastOff,
      });
    }
    if (lastOff) for (const l of vibOscs) { l.start(time); l.stop(lastOff + 0.01); }
    if (lfoOsc && lastOff) {
      if (lfoSampleHold) {
        const freeRate = Math.max(0.01, lfoSpec.rate ?? 4);
        const tempoSteps = LFO_TEMPO_STEPS[lfoSpec.division] ?? 4;
        const rate = lfoSpec.sync === 'tempo' && Number.isFinite(spb) && spb > 0
          ? 1 / (spb * tempoSteps) : freeRate;
        const period = 1 / rate;
        // A true instantaneous S&H step makes a filter or gain parameter jump. Keep
        // the held values, but slew between them for a small fraction of each period.
        const slew = Math.min(0.02, period * 0.2);
        let held = hitRandom(time, 1907) * 2 - 1;
        for (let at = time + period, i = 1; at < lastOff; at += period, i++) {
          const next = hitRandom(at, 1907 + i) * 2 - 1;
          lfoOsc.offset.setValueAtTime(held, at);
          lfoOsc.offset.linearRampToValueAtTime(next, at + slew);
          held = next;
        }
      }
      lfoOsc.start(time); lfoOsc.stop(lastOff + 0.01);
    }
    if (chorusOsc && lastOff) {
      // A hair past the last envelope, because the delay lines are still draining when it
      // ends: stop the modulator ON the tail and the last few milliseconds of a chorused
      // release freeze at whatever offset the LFO happened to be holding.
      chorusOsc.start(time); chorusOsc.stop(lastOff + CHORUS_TAIL_S);
    }
    if (lastOff) {
      sharedMods.oscs.push(...vibOscs);
      if (lfoOsc) sharedMods.oscs.push(lfoOsc);
      if (chorusOsc) sharedMods.oscs.push(chorusOsc);
    }
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
    // wall speed, so a timer would fire in the wrong place if it fired at all.
    //
    // It must not dispose HERE either, which is what it used to do. Offline, "now" is
    // SCHEDULING time and the walk runs bars ahead of the render clock, so disposing on
    // the spot tore down synths that notes were already booked on — those notes never
    // sounded, and a lane carrying per-bar gain trims (each trim is a bus of its own,
    // and a new bus is a new graph to `_pool`) lost whole bars it should have played.
    // A render is bounded and the whole graph goes with the context, so the pool is
    // simply set aside instead and let ring.
    if (typeof this.ctx.startRendering === 'function') { this._retiredOffline.push(pool); return; }
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
    // ---- the tick ----------------------------------------------------------
    //
    // `set` writes every option the instant it is called, on synths that are SOUNDING.
    // A number moving is inaudible — a cutoff walking a few hertz per drag step is the
    // whole point of live editing — but a STRING is a different waveform, a different
    // filter type, a different curve, and swapping one of those mid-cycle steps the
    // signal from wherever it was to wherever the new shape starts. That step is a
    // click, and on a saw at full level it is a loud one.
    //
    // So: mute the output, change it inside the silence, and bring it back — and do the
    // change SYNCHRONOUSLY, which is the part that matters. Web Audio renders in 128-sample
    // quanta, so a mute scheduled at `currentTime` and a `set` called immediately after it
    // both land in the same block: the new shape's first sample is already silent. Nothing
    // is deferred, so "an edit lands on the synth that is playing" stays literally true and
    // the panel's own tests can still read the value back on the next line.
    //
    // 12 ms of silence and 18 ms back up. Only for shape changes: a drag of a numeric pot
    // takes the direct path and stays perfectly smooth, or every drag would stutter through
    // thirty dips a second.
    const shifted = shapeChanged(pool.spec?.opts, spec.opts);
    // A render has nobody listening and every ramp in it would be baked into the file,
    // so offline takes the plain path: the value it is given, at the sample it is given.
    const offline = typeof this.ctx.startRendering === 'function';
    const glide = (param, value) => {
      if (offline) { param.value = value; return; }
      if (param.value === value) return;      // a pot held against its stop
      // From the CONTEXT's own clock, not Tone's `now()`. Tone offsets everything it
      // schedules by its lookahead — a tenth of a second — which is right for a note
      // being booked ahead of time and wrong for an edit that is meant to be the answer
      // to the hand moving: the glide would not begin until long after the pot had
      // stopped. This is the clock the dip below uses, for the same reason.
      param.rampTo(value, SMOOTH_SECONDS, this.ctx.currentTime);
    };
    const write = () => {
      for (const { synth, vib } of pool.slots) {
        const bag = JSON.parse(JSON.stringify(spec.opts));
        // Every live AudioParam comes out of the bag first and is glided below — see
        // SMOOTH_PARAMS. What is left is the numbers and strings nothing is reading
        // until the next note, which `set` may write as hard as it likes.
        const smooth = offline ? [] : liftSmoothParams(synth, bag);
        synth.set(bag);
        for (const { param, value } of smooth) glide(param, value);
        // `set` only writes the keys it is given, and `buildSpec` omits a glide of
        // zero — so dragging GLIDE back down has to be said explicitly or the last
        // non-zero value would stay on the synth for good.
        if (typeof synth.portamento === 'number') synth.portamento = spec.opts.portamento ?? 0;
        if (vib && spec.vibrato) {
          // The two that are heard while they move: a rate step is a wobble that jumps
          // phase-rate mid-cycle, and a depth step is a pitch jump the size of the
          // change. `type` is a waveform, which is a shape change and dips instead.
          glide(vib.frequency, spec.vibrato.rate);
          glide(vib.depth, spec.vibrato.depth);
          vib.type = spec.vibrato.type;
        }
      }
    };
    try {
      // An offline render never edits a preset mid-play and has nobody listening, so it
      // takes the plain path — and a dip there would be a level move baked into a WAV.
      const live = shifted && !offline;
      const dipped = [];
      if (live) {
        const now = this.ctx.currentTime;
        for (const { out } of pool.slots) {
          if (!out?.gain) continue;
          dipped.push({ gain: out.gain, level: out.gain.value, now });
          out.gain.cancelScheduledValues(now);
          out.gain.setValueAtTime(0, now);
        }
      }
      write();
      for (const { gain, level, now } of dipped) {
        gain.setValueAtTime(0, now + 0.012);
        gain.linearRampToValueAtTime(level, now + 0.03);
      }
      return true;
    } catch {
      // A value Tone would not take. Rare — the panel's ranges are its ranges — but a
      // rebuilt pool is always a valid answer, so this is a fallback rather than a bug.
      return false;
    }
  }

  /**
   * Take a pool down without a click: fade its output, then dispose behind the fade.
   *
   * `_disposePool` on its own is right when the pool is already silent — a retirement
   * that has waited out its own tail, a context being torn down. It is wrong the moment
   * something is still sounding through it, which is exactly when a preview is stopped.
   */
  _fadeAndDispose(pool) {
    if (pool.gone || typeof this.ctx.startRendering === 'function') {
      this._disposePool(pool);
      return;
    }
    const now = this.ctx.currentTime;
    for (const { out } of pool.slots) {
      if (!out?.gain) continue;
      try {
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + STOP_FADE);
      } catch { /* a param that has gone with its context */ }
    }
    const timer = setTimeout(() => {
      this._retired.delete(timer);
      this._disposePool(pool);
    }, Math.ceil(STOP_FADE * 1000) + 5);
    // Booked in `_retired` so `dispose()` still accounts for it — a rack torn down
    // inside the fade must not leave the timer holding the last reference to a synth.
    this._retired.set(timer, pool);
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
    // The note cache is keyed on this number, so bumping it is the whole of "forget
    // what this preset used to sound like" — the stale buffers simply stop being
    // reachable and fall off the end of the LRU. Every edit the panel makes comes
    // through here, which is why this is the one line that has to exist for a cached
    // voice to be editable at all. See `_cacheEntry`.
    this._specRev ||= new Map();
    this._specRev.set(voiceId, (this._specRev.get(voiceId) || 0) + 1);
    this._invalidateCacheEntries(voiceId);
    // ---- the native paths ---------------------------------------------------
    //
    // A pooled synth is an OBJECT that stands there between notes, so an edit can be
    // pushed onto it. A native voice is not: every node is built per note from the values
    // as they were at note-on, and the note you are hearing was built from the old ones.
    // Which is why, until this, dragging a cutoff on a MRDR-3 did nothing until you
    // played the next note, while the same drag on a MonoSynth moved the note under your
    // hand — the same panel behaving two ways for a reason no player can see.
    //
    // What CAN be moved is what was set once and left: the filter cutoffs and their
    // resonance. The envelopes cannot — they are already-scheduled trajectories, and a
    // second writer on a booked AudioParam is a fight. So the cutoffs walk live, and
    // everything else lands on the next note, which is what it always did.
    //
    // Ramped rather than set: `setTargetAtTime` over 8 ms turns a filter jump into a
    // slide, which is the difference between a sweep and a tick.
    for (const held of this._heldNative.values()) {
      if (held.voiceId !== voiceId) continue;
      this._walkLiveFilters(held.live);
    }
    // ...and the notes with no finger on them. A figure playing under the panel is the
    // other way a MRDR-3 is auditioned while it is edited, and it is the way that leaves
    // both hands free — so a cutoff has to walk under it exactly as it does under a key.
    this._sweepLiveNotes();
    for (const live of this._liveNotes) {
      if (live.voiceId !== voiceId) continue;
      this._walkLiveFilters(live.live);
    }
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

  /** Remove queued and completed cache work for one changed voice. */
  _invalidateCacheEntries(voiceId) {
    purgeNoteCacheEntries(this._cacheState, voiceId);
  }

  /** Public invalidation door for monitoring changes such as layer solo. */
  invalidateNoteCache(voiceId) {
    if (!voiceId) return;
    this._specRev ||= this._cacheState.revisions;
    this._specRev.set(voiceId, (this._specRev.get(voiceId) || 0) + 1);
    this._invalidateCacheEntries(voiceId);
  }

  setNoteCachePlaybackActive(active) {
    setNoteCachePlaybackActive(this._cacheState, active);
  }

  setNoteCacheState(state) {
    if (!state || state === this._cacheState) return;
    this._cacheState = state;
    this._noteCache = state.entries;
    this._specRev = state.revisions;
  }

  /**
   * What the cache holds and what it still owes, in one object.
   *
   * THE LIFETIME TOTALS ARE SPREAD FIRST and the live readings written over them. The
   * two families are named apart now — `queuedTotal` against `queued` — so nothing
   * should collide, but this ordering is what makes a future collision harmless
   * instead of silent: a counter can never overwrite the measurement of the moment.
   * `queued` is the BACKLOG, jobs still waiting to render, and it falls to zero when
   * the cache is warm. Anyone asking "is there work left" wants this one.
   */
  noteCacheHealth() {
    const state = this._cacheState;
    let buffers = 0;
    for (const entry of state.entries.values()) if (entry.buffer) buffers++;
    return {
      ...state.stats,
      enabled: !!this.noteCache,
      playbackActive: !!state.playbackActive,
      entries: state.entries.size,
      buffers,
      bytes: state.bytes,
      queued: state.queue.length,
      rendering: state.rendering,
    };
  }

  runtimeHealth() {
    this._sweepLiveNotes();
    let poolSlots = 0;
    for (const pool of this.pools.values()) poolSlots += pool.slots?.length || 0;
    return {
      pools: this.pools.size,
      poolSlots,
      retiredPools: this._retired.size + this._retiredOffline.length,
      liveNotes: this._liveNotes.length,
      heldNative: this._heldNative.size,
      activePreviews: this._activePreviews.size,
      cachedSources: this._cachedPlayback.size,
    };
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
    // Out of the books at once — nothing may find these again — but taken down
    // GENTLY: a Tone synth disposed mid-note has its nodes pulled out from under a
    // signal that was still moving, which is a click as surely as a hard `stop()` is.
    // See `_fadeAndDispose`.
    // Snapshotted BEFORE the live pools are taken down, because taking one down books
    // its own timer in `_retired` — walking the map afterwards would find the pool that
    // is already fading and start it fading again.
    const waiting = [...this._retired];
    for (const [key, pool] of [...this.pools]) {
      if (!pool.preview) continue;
      this.pools.delete(key);
      this._fadeAndDispose(pool);
    }
    for (const [timer, pool] of waiting) {
      if (!pool.preview) continue;
      clearTimeout(timer);
      this._retired.delete(timer);
      this._fadeAndDispose(pool);
    }
    this._activePreviews.clear();
    // A held native note is an oscillator running at whatever level its envelope had
    // reached, so `stop()` at `now` is a step to silence mid-waveform — a click, and on
    // a low note a thump. Take the envelope down first and stop behind it. This is the
    // same shape as `_releasePreview` and deliberately shorter: this is a stop rather
    // than a note-off, and it may not wait for a ten-second release.
    const now = this.ctx.currentTime;
    const off = now + STOP_FADE;
    for (const held of this._heldNative.values()) {
      for (const h of held.params) {
        try {
          h.param.cancelScheduledValues(now);
          h.param.setValueAtTime(Math.max(1e-4, h.param.value), now);
          h.param.linearRampToValueAtTime(0, off);
        } catch { /* gone with the note */ }
      }
      for (const src of held.sources) { try { src.stop(off); } catch { /* ignore */ } }
      // Everything stops here, so the shared modulators go without counting.
      if (held.shared) {
        for (const m of held.shared.oscs) { try { m.stop(off); } catch { /* ignore */ } }
        held.shared.holds = 0;
      }
    }
    this._heldNative.clear();
    // Every finger is off, whether or not a note-off arrived. `gateKey` is what says a key
    // is still down, and a stop that left one set would hand the next key a glide out of a
    // note this call has just silenced. The pooled slots go with their pools above; the
    // native records outlive them, so they are said here.
    for (const record of this._last?.values() || []) {
      record.gateKey = null;
      record.gateUntil = Math.min(record.gateUntil, now);
    }
    // The gated notes end by themselves and are fading with the pools above; what goes
    // here is only the RECORD of them, so a stopped bench cannot leave a later edit
    // walking filters on nodes already on their way out.
    this._liveNotes = [];
  }

  /**
   * Remember a sounding note that nothing will come to release — a gated preview.
   *
   * Only what a live edit can still move, and only until the note is over. There is no
   * key to delete it, so `until` IS the deletion — and the sweep happens on the way IN
   * rather than only on the way out. A figure nobody is editing would otherwise pin a
   * note's worth of filter nodes per step for as long as it runs, which is a leak with a
   * pattern player holding the pump on it.
   */
  _registerLiveNote(voiceId, live, until) {
    if (!live?.length || !(until > 0)) return;
    this._sweepLiveNotes();
    this._liveNotes.push({ voiceId, live, until });
  }

  /** Drop the notes that have finished. What keeps the list the length of a chord. */
  _sweepLiveNotes() {
    if (!this._liveNotes.length) return;
    const now = this.ctx?.currentTime ?? 0;
    this._liveNotes = this._liveNotes.filter((n) => n.until > now);
  }

  /**
   * Walk one note's filters onto what the preset says NOW.
   *
   * The cutoffs and their resonance are the two things written once at note-on and left
   * standing, so they are the two a drag can still move on a note already sounding.
   * Ramped over 8 ms rather than set, which is the difference between a sweep and a tick.
   */
  _walkLiveFilters(live) {
    if (!live?.length) return;
    const now = this.ctx.currentTime;
    for (const { chain, spec, mul } of live) {
      if (!spec) continue;
      const freq = Math.max(20, (spec.freq ?? 1150) * mul);
      for (const st of chain.stages) {
        try { st.frequency.setTargetAtTime(freq, now, 0.008); } catch { /* gone with the note */ }
      }
      // Resonance is the FIRST stage's alone — the ones behind it carry the slope at a
      // flat Q and would multiply the peak if they resonated too. The same rule
      // `_filterChain` builds by.
      const q = chain.stages[0]?.Q;
      if (q && spec.Q != null) {
        try { q.setTargetAtTime(spec.Q, now, 0.008); } catch { /* ditto */ }
      }
    }
  }

  /** Release a previewed note — the other half of triggerAttack above. */
  releasePreview(laneKey, freq) {
    const noteKey = `${laneKey}|${freq.toFixed(2)}`;
    this._releasePreview(noteKey);
  }

  _releasePreview(noteKey) {
    const at = this.ctx.currentTime;
    const entry = this._activePreviews.get(noteKey);
    if (entry) {
      try { entry.slot.synth.triggerRelease(at); } catch { /* ignore */ }
      // A KEY COMING UP ENDS THE GATE, which is the whole of what the fingered glide test
      // reads: press C, let go, press E after a pause, and the E starts on its own pitch
      // rather than sliding out of a note nobody is holding. Without this a held note's
      // gate ran its nominal length into the future whether or not a finger was still
      // down. Only the key that opened the gate can close it, so a trill played with two
      // keys overlapping keeps gliding.
      if (entry.slot.gateKey === noteKey) { entry.slot.activeUntil = at; entry.slot.gateKey = null; }
      this._activePreviews.delete(noteKey);
    }
    const held = this._heldNative.get(noteKey);
    if (held) {
      // The same close, on the native path's own record of the gate.
      const record = held.glideKey ? this._last?.get(held.glideKey) : null;
      if (record && record.gateKey === noteKey) {
        record.gateUntil = Math.min(record.gateUntil, at);
        record.gateKey = null;
      }
      let stopAt = at;
      for (const h of held.params) {
        try { stopAt = Math.max(stopAt, releaseNow(h.param, at, h.e)); } catch { /* ignore */ }
      }
      // Re-scheduled, not stopped twice: the last `stop()` before a source has ended is
      // the one that takes effect, so this pulls the far-future stop back to the tail.
      for (const src of held.sources) { try { src.stop(stopAt + 0.01); } catch { /* ignore */ } }
      // The note-on's shared modulators go when its LAST tone does — a chord releases
      // one key at a time and the rest are still wobbling.
      const shared = held.shared;
      if (shared && (shared.holds -= 1) <= 0) {
        for (const m of shared.oscs) { try { m.stop(stopAt + 0.01); } catch { /* ignore */ } }
      }
      this._heldNative.delete(noteKey);
    }
  }

  dispose() {
    for (const [timer, pool] of this._retired) { clearTimeout(timer); this._disposePool(pool); }
    this._retired.clear();
    for (const pool of this._retiredOffline) this._disposePool(pool);
    this._retiredOffline.length = 0;
    for (const pool of this.pools.values()) this._disposePool(pool);
    this.pools.clear();
    this._monoGroups.clear();
    this._activePreviews.clear();
    for (const active of this._cachedPlayback) {
      try { active.src.stop(); } catch { /* already stopped */ }
      try { active.src.disconnect(); } catch { /* context may already be gone */ }
      try { active.gain.disconnect(); } catch { /* ditto */ }
    }
    this._cachedPlayback.clear();
    this._heldNative.clear();
    this._liveNotes = [];
    // The glide origins. The nodes they point at belong to the dying context; keeping
    // the map would glide the next song's first note from the last song's last one.
    if (this._last) this._last.clear();
  }
}
