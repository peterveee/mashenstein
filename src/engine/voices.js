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
//   MembraneSynth 0.991 · MetalSynth 0.442 · NoiseSynth 0.974      — all fine, and all
//                     three RETIRED since: the two drum classes are KLNG8's `osc` and
//                     `metal` sections stated by Tone, and NoiseSynth was never offered
//                     (see below). Kept in the sweep because the next person to reach
//                     for one should know it was measured, not overlooked.
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
import * as FAMILY from './synth-families.js';
import { VOICES } from '../data/voices.js';
import { isTngr2Table } from './tngr2/families.js';
import {
  isMrdrVoice, MRDR3_NATIVE, MRDR3_AW, mrdrComparisonVoice,
} from './mrdr3/identity.js';
import {
  mrdr3Lane, mrdr3LaneNow, mrdr3NoteOn, mrdr3NoteOff, syncMrdr3Patch, canHostMrdr3,
  mrdr3PanicAll, releaseIdleMrdr3Lanes,
} from './mrdr3/controller.js';
import { mrdr3GateAdsrEvents } from './mrdr3/env.js';
import {
  tngr2Lane, tngr2LaneNow, tngr2NoteOn, tngr2NoteOff, releaseTngr2Context,
  tngr2ControllerHealth, canHostTngr2, renderTngr2Lane, tngr2PatchForVoice, tngr2VibratoOf,
  syncTngr2Patch, tngr2EffectsOf,
} from './tngr2/controller.js';

/**
 * The allowlist. A catalogue entry's `synth` is looked up here and nowhere else, so
 * an unknown or blacklisted name is a voice that does not build rather than a
 * `Tone[whatever]` that might be anything.
 *
 * Everything listed has been measured rendering offline (see the sweep above), and
 * everything listed is pitched. The two Tone drum classes were here too, and are not
 * any more: a MembraneSynth is one oscillator swept down into a body and a MetalSynth
 * is six squares at inharmonic ratios, which are `osc` and `metal` on a KLNG8 preset —
 * the same two circuits with their numbers exposed instead of welded shut. Keeping both
 * was two ways to build one drum, and the Tone way could not follow a note anyway.
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
/**
 * How many detuned copies of one oscillator any preset may ask for.
 *
 * One ceiling for all three synth families, because unison is the one control that
 * multiplies NODES rather than shaping them: a layer at 5 is five OscillatorNodes per
 * note per layer, and a three-layer poly chord reaches thirty before a filter is built.
 * TNGR-2 has stopped at four since it was written (see `src/engine/tngr2/schema.js`);
 * MRDR-3 stopped at five and Tone's `oscillator.count` stopped nowhere at all, which is
 * two different answers to one question. This is the answer.
 *
 * Applied where presets are BUILT rather than where they are written, so a song, an
 * imported bank or a saved user patch carrying a bigger number is capped on the way in
 * rather than trusted. Shipped presets were brought down to it as well, so the number on
 * disk says what is heard — see `bestMegaSawLead` and `tpAlienChorus`.
 */
export const MAX_UNISON = 4;

/**
 * MRDR-3's two realtime quality modes — work/local/mrdr3-realtime-performance-plan.md §7.
 *
 * MRDR-3 is native Web Audio nodes, so there is no precision flag to turn down: the only
 * honest way to make it cheaper is to build FEWER NODES, and the only honest way to offer
 * that is to say so. `full` is the authored sound and the default everywhere, including
 * every offline bounce — a fresh rack starts here, so a render is Full unless something
 * deliberately says otherwise. `performance` is the trade, and it is opt-in from the desk.
 *
 * What performance changes, and nothing else: unison stacks cap at three real voices, and
 * a -48 dB filter is built as two stages rather than four. Layers are never dropped, PWM
 * is never disabled, envelopes are never altered and no note is ever skipped — those would
 * be a different preset, not a cheaper rendering of this one.
 */
export const MRDR_QUALITY = Object.freeze({ FULL: 'full', PERFORMANCE: 'performance' });
const PERFORMANCE_UNISON = 3;
const PERFORMANCE_MAX_FILTER_STAGES = 2;

const clampUnison = (n, dflt = 1) => Math.max(1, Math.min(MAX_UNISON, Math.round(Number(n) || dflt)));

const VOICING_WORDS = ['single', 'fat', 'am', 'fm'];

function scrubOscTypes(node) {
  if (!node || typeof node !== 'object') return;
  for (const [k, val] of Object.entries(node)) {
    if (k === 'type' && typeof val === 'string' && VOICING_WORDS.includes(val)) delete node[k];
    else scrubOscTypes(val);
  }
}

/*
 * Floor every amp envelope's SUSTAIN at -120dB, because zero is a denormal trap.
 *
 * A Tone envelope releasing toward literal 0 approaches it asymptotically, and once the
 * gain passes below ~1e-38 every multiply downstream of it — the oscillator through the
 * gain, the filter after that — is denormal arithmetic, which stalls the render thread.
 * Measured on tpPizz (sustain 0, the pluck shape): 21.7 ms per audio second for a line
 * that costs 5.6 with any nonzero floor — a 4x tax for the last, silent approach to
 * zero. Thirty-five pooled presets carried the shape when this was measured.
 *
 * 1e-6 is -120dB: below anything a limiter, a meter or an ear will ever see (the null
 * test's own tolerance sits 40dB above it), and thirty-two orders of magnitude above
 * where denormals begin. Recursive, for any class that nests its options. The FILTER
 * envelope is left alone — its sustain scales a frequency, and frequencies do not
 * denormal.
 */
function floorEnvelopeSustain(node) {
  if (!node || typeof node !== 'object') return;
  for (const [k, val] of Object.entries(node)) {
    if (k === 'envelope' && val && typeof val === 'object'
      && typeof val.sustain === 'number' && val.sustain < 1e-6) {
      val.sustain = 1e-6;
    }
    if (val && typeof val === 'object') floorEnvelopeSustain(val);
  }
}

/**
 * Bring a Tone preset's unison down to `MAX_UNISON`.
 *
 * Tone spells unison as `count` on a Fat* voicing and takes whatever it is handed —
 * `tpAlienChorus` shipped at ten, which is ten OscillatorNodes and ten Gains per slot,
 * times the notes in a chord. Only a key literally named `oscillator` is read: the
 * native paths have `count`s of their own that mean something else entirely (a metal
 * hat's inharmonic partials, an organ's drawbars) and none of them lives in `options`.
 *
 * Recursive, for a class that nests its options one level down.
 */
function clampFatCount(node) {
  if (!node || typeof node !== 'object') return;
  for (const [k, val] of Object.entries(node)) {
    if (k === 'oscillator' && val && typeof val === 'object' && typeof val.count === 'number') {
      val.count = clampUnison(val.count);
    }
    clampFatCount(val);
  }
}

/**
 * The 808's six inharmonic partials, as ratios.
 *
 * Its hats and cymbals are six square oscillators at these intervals through a
 * highpass, and the ratios are the whole trick: they are close enough together to beat
 * and far enough from whole numbers that the ear hears METAL rather than a chord. Tone's
 * MetalSynth used the same set and hid it, which is most of why it is gone: a preset
 * here can override them, and that is the difference between one cymbal and a family.
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
// Bounded like the phase-wave cache further down, but larger: each of these costs 1024
// samples by 96 harmonics to rebuild, so a miss here is worth avoiding in a way a phase
// rotation is not. Oldest out first, which is insertion order because that is what a Map
// keeps. The cap bounds memory only — the same key rebuilds the same wave.
const SYNC_TABLE_CACHE = 512;
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
  // Bounded like the phase-wave cache below, and for a sharper reason: a syncBend note
  // asks for a new ratio every 32 ms grain, so a single held bend mints dozens of these
  // and every distinct note LENGTH mints a fresh set. Uncapped, the map only ever grew.
  if (perCtx.size >= SYNC_TABLE_CACHE) perCtx.delete(perCtx.keys().next().value);
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
// Drive transfer curves, keyed by shape and the pot rounded to a percent. A hundred per
// shape is the whole dial, so this only ever bites when several shapes have been swept.
const DRIVE_CURVE_CACHE = 64;
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

/** A stable integer seed from a preset id — for TNGR-2's per-patch phase seeding. */
function hashSeed(text) {
  let h = 2166136261;
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 8) & 0x7fffffff;
}

const NOISE_Q = 2;

// Where KNDO-5's fall across the note LANDS, as a fraction of that note's own peak —
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

/*
 * MRDR-3's ensemble jitter — humanize (entry/gain/pitch/filter) and vibrato SPREAD —
 * is OFF, engine-wide, as of 2026-08-19. Peter's call, and the reasoning is worth
 * keeping with the switch:
 *
 * The jitter itself costs almost nothing to compute. What it costs is CACHEABILITY:
 * a note whose sound depends on WHEN it is scheduled cannot be rendered once and
 * replayed, so every note on a humanised preset is synthesised live, every time —
 * measured on barber-96, its three string lanes were the dearest voices on the song
 * for exactly this reason. Spread vibrato also defeats the PeriodicWave cache (every
 * unison voice of every note minted its own phase-rotated wave). "Not sure that the
 * minor difference in quality would ever be worth it" — so it is a switch, not a
 * deletion: preset data is untouched, drums and taps keep their own humanise (theirs
 * costs nothing — the drum path is never cached), and one line brings it back.
 *
 * What OFF removes is only the PER-OCCURRENCE variation — the part that priced every
 * note as a fresh render. The ensemble texture inside a note SURVIVES: the unison
 * entry stagger and the scattered vibrato phases are re-seeded from a fixed time
 * instead of the note's time, so every occurrence is the same section, not a solo.
 * (Zeroing the spread outright was tried first and measured: unison voices summed
 * coherently and barber-96's peak jumped 0.594 -> 0.861 — a different instrument, not
 * a smaller nuance.) The whole-note gain/pitch/filter wobbles ARE the per-occurrence
 * variation and read as exactly 1.
 *
 * Every render — desk, bounce, game — agrees, which keeps stems summing to the mix
 * and the null test meaningful.
 */
let MRDR_ENSEMBLE_JITTER = false;
export function setMrdrEnsembleJitter(on) { MRDR_ENSEMBLE_JITTER = !!on; }
/** `vary`, but exactly 1 while the ensemble jitter is off. */
const ensembleVary = (amount, time, salt) => (MRDR_ENSEMBLE_JITTER ? vary(amount, time, salt) : 1);
// The seed the frozen ensemble draws from: any fixed value works; zero reads best.
const ENSEMBLE_FIXED_TIME = 0;

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
  // With the ensemble jitter off (see MRDR_ENSEMBLE_JITTER) the humanize block and the
  // vibrato spread are never read, so a preset carrying them no longer varies with
  // time — which is what makes the string section cacheable.
  const hum = (MRDR_ENSEMBLE_JITTER && v?.humanize) || {};
  if ((hum.gain ?? 0) > 0 || (hum.pitch ?? 0) > 0
    || (hum.filter ?? 0) > 0 || (hum.entry ?? 0) > 0) return true;
  // (With jitter off, entry stagger and spread phases are seeded from a fixed time —
  // present in the sound, identical per occurrence, so they do not vary.)
  // Spread is what scatters the ensemble; a vibrato without it is one locked LFO
  // started at phase zero on the note, which is the same wobble every time.
  if (MRDR_ENSEMBLE_JITTER
    && (v?.vibrato?.depth ?? 0) > 0 && (v.vibrato.spread ?? 0) > 0) return true;
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
 * at note-off. MRDR-3 and WNDR-9 are melodic instruments, so their note length is
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
/**
 * Apply a built envelope to an AudioParam.
 *
 * The whole of the native adapter §3.2 asks for. The SHAPE now lives once, in
 * src/engine/mrdr3/env.js, and both backends run it: this writes the events to an
 * AudioParam in seconds, and the worklet core writes the identical events to a
 * ParamTimeline in frames. Neither owns the arithmetic, so envelope shape cannot become a
 * difference between them — which is what takes it off the ear-approval list.
 */
function applyEnvelopeEvents(param, events) {
  for (const ev of events) {
    if (ev.k === 'set') param.setValueAtTime(ev.v, ev.t);
    else if (ev.k === 'lin') param.linearRampToValueAtTime(ev.v, ev.t);
    else if (ev.k === 'exp') param.exponentialRampToValueAtTime(ev.v, ev.t);
    else if (ev.k === 'cancel') param.cancelScheduledValues(ev.t);
  }
}

function gateAdsr(param, t, end, peak, e = {}, sustaining = false, freq = 0) {
  const built = mrdr3GateAdsrEvents(t, end, peak, e, sustaining, freq);
  // An AudioParam throws on a non-finite value, and this runs inside the scheduling
  // pass — one bad number from a malformed preset would kill not just this note but
  // every note after it, for as long as the song is up. Skipping the envelope leaves
  // the note silent (its gain never leaves zero) and the song playing, which is the
  // right way round.
  //
  // Zero, not `t`: the return is an absolute END TIME that callers feed to
  // `Math.max(lastOff, …)` and then to `stop()`, so handing back the bad number
  // would carry it straight into the next throw. Zero is the sentinel those callers
  // already test for (`if (lastOff)`), so a skipped envelope reads as "nothing was
  // scheduled", which is exactly what happened.
  //
  // The BUILDER returns null rather than warning, because the two hosts want different
  // things from a bad number — a worklet has no console worth shouting at and no
  // AudioParam to protect.
  if (!built) {
    console.warn('[voices] skipping an envelope with non-finite numbers', { t, end, peak });
    return 0;
  }
  applyEnvelopeEvents(param, built.events);
  return built.off;
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
/**
 * One stage of a CENTS envelope, in one of two shapes.
 *
 * `lin` is a straight line in cents, which is the shape this envelope has always had and
 * stays the default — every preset written before curves existed reads back unchanged.
 * Straight in cents is a constant number of semitones per second, so a fall is even all
 * the way down: the siren, the arcade swoop, the glide.
 *
 * `exp` is the other one the ear knows: fastest at the start, settling into the target.
 * It is written with `setTargetAtTime` rather than an exponential RAMP because a cents
 * envelope PASSES THROUGH ZERO — the note's own pitch is 0 cents — and
 * `exponentialRampToValueAtTime` can neither reach zero nor leave it. `setTargetAtTime`
 * approaches asymptotically, so the value is pinned at the stage's end with an explicit
 * `setValueAtTime`; without that pin the next stage would start from wherever the
 * approach happened to have got to.
 *
 * This IS the drum's `snap` — same call, same quarter-of-the-span time constant (see
 * `pitchRamp`) — which is the analogue drum machine's pitch fall and the difference
 * between a kick that clicks and one that goes boing. `pitchRamp` needs three names
 * because it writes HERTZ, where an exponential ramp and a set-target are genuinely
 * different curves; on cents they are the same one, so there are two here and not three.
 *
 * A caution worth knowing when reading both panels: linear in cents is EXPONENTIAL in
 * hertz, so this function's `lin` draws the same trajectory KLNG8's RATE CURVE calls
 * `exp`. The words are opposite because the two controls measure different quantities.
 */
function centsRamp(param, to, from, at, shape) {
  if (shape === 'exp' && at > from) {
    param.setTargetAtTime(to, from, Math.max(0.0005, (at - from) / 4));
    param.setValueAtTime(to, at);
  } else param.linearRampToValueAtTime(to, at);
}

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
    if (a > 0) { p.setValueAtTime(base, t); centsRamp(p, base + cents, t, peakAt, e.attackCurve); }
    else p.setValueAtTime(base + cents, t);
    centsRamp(p, base + cents * s, peakAt, decayEnd, e.decayCurve);
    if (decayEnd < end) p.setValueAtTime(base + cents * s, end);
    centsRamp(p, base, end, end + Math.max(0.001, e.release ?? 0.015), e.releaseCurve);
  }
}

/** TNGR-2's long envelopes must keep their authored time instead of fitting into a note. */
function gateCentsEnv(params, cents, e = {}, t, end, { base = 0, dfltAttack = 0.01 } = {}) {
  if (!cents) return;
  const attack = Math.max(0, Number(e.attack ?? dfltAttack) || 0);
  const decay = Math.max(0, Number(e.decay) || 0);
  const sustain = Math.min(1, Math.max(0, Number(e.sustain) || 0));
  const release = Math.max(0.001, Number(e.release) || 0.015);
  const valueAt = (at) => {
    const elapsed = Math.max(0, at - t);
    if (attack > 0 && elapsed < attack) return cents * elapsed / attack;
    if (decay > 0 && elapsed < attack + decay) {
      return cents * (1 + (sustain - 1) * ((elapsed - attack) / decay));
    }
    return cents * sustain;
  };
  const attackEnd = t + attack;
  const decayEnd = attackEnd + decay;
  for (const param of params) {
    if (attack > 0) {
      param.setValueAtTime(base, t);
      param.linearRampToValueAtTime(base + cents, attackEnd);
    } else param.setValueAtTime(base + cents, t);
    if (decay > 0) param.linearRampToValueAtTime(base + cents * sustain, decayEnd);
    else param.setValueAtTime(base + cents * sustain, attackEnd);
    // A short played note may end halfway through a slow pad attack. Pin the value the
    // authored curve has actually reached, then release from there; do not compress the
    // whole attack into the gate and turn every chord into a repeated swell.
    param.cancelScheduledValues(end);
    param.setValueAtTime(base + valueAt(end), end);
    param.linearRampToValueAtTime(base, end + release);
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
/*
 * Re-sized 2026-08-19, the day the string section became cacheable and the old caps
 * were caught THRASHING live. 64MB was measured against a library whose expensive
 * presets could not cache at all; barber-96's newly-eligible strings are stereo
 * buffers averaging ~136KB, its full key space wants ~250MB, and the desk hit the old
 * cap on lap 3 and treadmilled from there — every render evicting an older buffer,
 * every evicted key re-missing and re-queueing (the Loop CSV shows misses +1,450 and
 * stale +1,200 per lap from lap 3 onward, with the queue pinned at ~1,375). A cache at
 * its cap is not a smaller cache, it is a machine for converting renders into
 * evictions. 320MB of Float32 buffers is real memory, but it is the desk's memory on a
 * desk machine, spent on exactly the thing the desk exists to do; entries rise with it
 * so the byte cap is the one that binds.
 */
const NOTE_CACHE_ENTRIES = 4096;
const NOTE_CACHE_BYTES = 320 * 1024 * 1024;
// A render creates a complete throwaway graph and asks the browser to run it. One at a
// time is deliberate: the live AudioContext and an OfflineAudioContext are both asking
// the same device for work, so two background renders are a poor trade for a cache hit.
const NOTE_RENDER_JOBS = 1;
// Raised with the cache caps above and for the same reason: the plan pre-selects the
// heavy repeats, and a plan budget under a fifth of the cache would leave the strings
// it now exists to cover to the opportunistic path.
const NOTE_CACHE_PLAN_BYTES = 192 * 1024 * 1024;
const MRDR_PLAN_HEAVY = 12;
const MRDR_PLAN_REPEAT = 12;
const MRDR_PLAN_DENSE_BAR = 24;

/** Heuristic topology cost used only to rank cache candidates, never as a sound value. */
function estimateMrdrEventCost(v, notes, dur) {
  // NATIVE ONLY (§10): the planner prices building a node graph per note, which is
  // exactly what an AW lane does not do. It must never be asked about one.
  if (!v || v.synth !== MRDR3_NATIVE) return 0;
  const L = v.layer || {};
  const solo = null; // preparation runs against resolved voice data; live solo invalidates separately
  const active = ['osc1', 'osc2', 'osc3'].filter((key) => {
    const s = L[key];
    return s && (s.gain ?? 1) > 0 && !sectionBypassed(v, `layer.${key}`, s)
      && (!solo || solo.has(key));
  });
  const toneCount = Math.max(1, (Array.isArray(notes) ? notes : [notes]).filter((f) => f > 0).length);
  const mode = v.mode || keyMode(v);
  const voices = mode === 'poly' ? toneCount : Math.min(1, toneCount);
  let topology = 0;
  for (const key of active) {
    const s = L[key];
    const unison = clampUnison(s.unison);
    const pwm = s.type === 'pulse' && s.pwm && (s.pwm.depth ?? 0) > 0;
    const syncBend = v.sync && s.pitch && (s.pitch.semitones ?? 0) !== 0;
    const sourceCount = unison * (pwm ? 2 : 1);
    topology += sourceCount;
    if (s.filter && !sectionBypassed(v, `layer.${key}.filter`, s.filter)) {
      const slope = Number(s.filter.slope) || 12;
      topology += Math.max(1, Math.round(slope / 12)) * 0.6;
    }
    if (s.stereo > 0 && unison > 1) topology += unison * 0.2;
    if (s.fm && (s.fm.index ?? 1) > 0) topology += 0.25;
    if (pwm) topology += 0.25;
    if (syncBend) topology += Math.ceil((Number(s.len) || 1) / 0.032) * 0.25;
  }
  if (v.global?.filter && !sectionBypassed(v, 'global.filter', v.global.filter)) {
    topology += Math.max(1, Math.round((Number(v.global.filter.slope) || 12) / 12)) * 0.6;
  }
  if (v.global?.vca && !sectionBypassed(v, 'global.vca', v.global.vca)) topology += 0.2;
  if (v.lfo && (v.lfo.depth ?? 0) > 0) topology += 0.25;
  if (v.vibrato && (v.vibrato.depth ?? 0) > 0) topology += 0.25;
  const lengths = Array.isArray(dur) ? dur : [dur];
  const longest = Math.max(0.1, ...lengths.filter(Number.isFinite));
  const seconds = Math.min(30, Math.max(0.1, layerNoteSeconds(v, longest)));
  return topology * voices * seconds;
}

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
    // The deadline is handed through: the trickle below only works during playback
    // when the browser says there is real headroom in this frame.
    const id = requestIdleCallback((deadline) => fn(deadline), { timeout: 400 });
    return () => { try { cancelIdleCallback(id); } catch { /* browser owns it */ } };
  }
  const id = setTimeout(() => fn(null), 0);
  return () => clearTimeout(id);
}

/**
 * The same, for work that cannot wait for a gap.
 *
 * ---- why the idle callback is skipped rather than trusted ---------------------------
 *
 * `requestIdleCallback` is the right instrument for BACKGROUND warming, where a render
 * postponed costs nothing. Measured on this desk it is close to useless for a repair: the
 * desk draws every frame, so the callback almost always arrives via its own 400ms
 * timeout — which `trickleAllowed` then accepts, because a timed-out callback is still
 * the scheduler saying "now is as quiet as it gets". The gate therefore contributes
 * almost no filtering and 400ms of latency per job.
 *
 * That is affordable at one job per 600ms. It is not affordable for an edit repair:
 * measured, an edit queued 113 urgent jobs and only 38 ever started, and another queued
 * 29 and started 6 — roughly two and a half opportunities a second against a backlog that
 * needs tens. The notes that never got a buffer were played live, which is the load that
 * overloaded the audio thread in the first place.
 *
 * So urgent work asks immediately and lets the CLOCK BRAKE do the filtering. That is the
 * guard that was always doing the real work (see `trickleAllowed`), it is measured rather
 * than advisory, and it still refuses every job while the audio thread is in trouble.
 * The synthesised deadline says `didTimeout` because that is exactly what this is: the
 * same verdict the browser's own callback hands over, without the wait for it.
 */
function whenSoon(fn) {
  const id = setTimeout(() => fn({ didTimeout: true }), 0);
  return () => clearTimeout(id);
}

/*
 * The preparation TRICKLE — how the cache warms while the song plays.
 *
 * "Never during playback" was the original rule, and it was right when plans were
 * small: pre-warm covered a song in seconds and the gate kept every OfflineAudioContext
 * render away from the live audio thread. It stopped being right the day the string
 * section became cacheable: a plan can now be a hundred renders deep, playback pauses
 * preparation COMPLETELY, and a looping song therefore never warms — measured live,
 * barber-96 looped six laps at AUDIO STRUGGLING with its plan frozen at 6 of 122 and
 * its 92 warm buffers replaying beautifully while everything else re-synthesised
 * every lap. Stopping to let it drain did not survive either: the desk rebuilds its
 * context, and the cache is context-bound.
 *
 * So playback still wins — it just no longer wins by forbidding work, it wins by three
 * independent brakes any one of which halts the trickle:
 *
 *   HEADROOM  a render is launched only from an idle callback whose deadline still
 *             carries TRICKLE_MIN_IDLE_MS — the browser saying this frame has room.
 *   COOLDOWN  at most one render per TRICKLE_GAP_MS, one in flight ever, and nothing
 *             for the first TRICKLE_WARMUP_MS after the transport starts.
 *   THE CLOCK the probe this project always reaches for first: ctx.currentTime against
 *             the wall clock. The moment the audio thread runs the loop slower than
 *             TRICKLE_MIN_CLOCK realtime, the trickle holds until it recovers — an
 *             offline render thread competes with the realtime one for cores, and the
 *             clock is the honest report of who is losing.
 */
const TRICKLE_GAP_MS = 600;
const TRICKLE_MIN_IDLE_MS = 10;
const TRICKLE_WARMUP_MS = 3000;
const TRICKLE_MIN_CLOCK = 0.98;
/*
 * The drowning threshold — the fix for a deadlock the first live session found.
 *
 * The clock brake as first shipped held the trickle whenever the loop ran under 0.98x
 * realtime. Measured on the desk, a COLD barber-96 runs at ~0.7x: the song could not
 * warm because it was struggling, and it struggled because it was cold — lap 1 managed
 * eight renders in six minutes, all in the seconds the clock briefly recovered.
 *
 * Protecting audio that is already failing by withholding the only cure is the brake
 * pressed to the floor of a car that is already in the ditch. So the hold applies only
 * in the borderline band, where audio is genuinely at risk of being tipped: healthy
 * (>= MIN) renders, drowning (< DROWNING) renders — because it cannot get meaningfully
 * worse and warming is the way out — and only the band between them holds.
 *
 * ---- AND WHY IT IS NOW GATED ON `everHealthy` --------------------------------------
 *
 * "It cannot get meaningfully worse" was measured on a song that had NEVER been warm,
 * and for that case it is right: the machine has not yet shown it can play this song, so
 * the only way to find out is to warm it.
 *
 * It is wrong for the opposite case, which a later session measured. A song that has been
 * playing cleanly and is then EDITED has its buffers purged mid-flight: the cache goes
 * cold while the transport is running, the backlog jumps to a hundred notes, and the
 * offline renders that drain it compete with live playback for the same CPU. The clock
 * falls into the drowning band, the escape lets the trickle keep going, and the clock
 * falls further — measured at 0.698 then 0.650, ending in silence. It can get worse, and
 * it did.
 *
 * The two cases are told apart by one fact: has this playback ever seen a healthy clock?
 * If it has, the machine has already proved it can render this song live, so a collapse
 * is load rather than coldness — and the cure is to stop adding load, not to add more.
 * If it has not, the deadlock above is real and the escape stands.
 */
const TRICKLE_DROWNING_CLOCK = 0.9;
const TRICKLE_PROBE_MS = 250;
// How soon a REFUSED pump re-asks while the urgent window is open. See the note in
// pumpCache: the refusal reasons are unchanged, only how long the queue waits to put the
// question again.
const TRICKLE_URGENT_RETRY_MS = 100;
// How long an edit's recovery stays urgent. A deadline rather than a flag, so however the
// edits arrive the window closes on its own and the desk returns to ordinary trickle
// behaviour. Long enough to cover the measured render times (24-138ms a job) for a couple
// of bars of one voice; short enough that a drag does not hold the brakes off for ever.
const URGENT_CACHE_WINDOW_MS = 4000;
// And how much each COMPLETED urgent job extends it by, while urgent work remains. Short,
// because it is renewed by progress rather than granted up front: a repair that stalls
// stops extending within a second and the desk returns to ordinary trickle behaviour.
const URGENT_CACHE_EXTEND_MS = 1000;

export function trickleAllowed(state, deadline) {
  // A paused transport has no audible playback to protect: every brake below exists
  // for the sake of sound that is currently not sounding. Full speed (still one render
  // at a time, still launched from idle callbacks so the UI breathes).
  if (state.transportRunning === false) return true;
  const now = performance.now();
  // ---- THE URGENT WINDOW -------------------------------------------------------
  //
  // An edit purges the buffers of the voice being edited, and every distinct note of it
  // then plays LIVE until its render lands. That is how an edit is heard immediately, and
  // it is also how a warm song becomes a cold one without stopping — measured at 139
  // outstanding keys and an audio clock of 0.204 while the main thread sat idle.
  //
  // So for a few seconds after an edit the two COOLDOWN brakes come off: the warm-up
  // grace, which exists to let a song settle after pressing play, and the one-render-per-
  // 600ms gap, which exists to keep background warming out of the way. Neither is about
  // the danger here, and both are what let the backlog outrun the repair.
  //
  // What does NOT come off is the idle gate or the clock brake below. If the audio thread
  // is already collapsing, rendering harder is what made it collapse (see the everHealthy
  // note above), and the answer is the auto-stop rather than more work. Urgency reorders
  // and unblocks; it never overrules the measurement.
  const urgent = now < (state.urgentUntil || 0);
  if (!urgent) {
    if (now - (state.playbackSince || 0) < TRICKLE_WARMUP_MS) return false;
    if (now - (state.lastRenderDone || 0) < TRICKLE_GAP_MS) return false;
  }
  // Headroom, honestly assessed. A quiet page hands idle callbacks real deadlines and
  // the threshold means something. The DESK never does: it draws meters at 60fps, so
  // the callback almost always arrives via its 400ms timeout with timeRemaining() at
  // zero — and requiring 10ms of genuine idle meant the trickle starved on exactly the
  // machine it was built for (measured: nine renders in a whole session, all from
  // before play). A timed-out callback is still the scheduler saying "now is as quiet
  // as it gets", so it is accepted; the COOLDOWN and the CLOCK below are the guards
  // that actually defend playback, and construction is a few milliseconds per 600.
  const idleOk = deadline && (deadline.didTimeout === true
    || (typeof deadline.timeRemaining === 'function'
      && deadline.timeRemaining() >= TRICKLE_MIN_IDLE_MS));
  if (!idleOk) return false;
  // The clock probe. Sampled across idle callbacks; the verdict holds between samples.
  // A MISSING clock fails OPEN: the cooldown still throttles to one render per 600ms,
  // and the measured cost of failing closed was a desk that could never warm at all.
  const ctx = state.liveCtx;
  if (!ctx || !Number.isFinite(ctx.currentTime)) return true;
  const probe = state.clockProbe;
  if (!probe) {
    state.clockProbe = { at: now, ctxTime: ctx.currentTime };
    return false;                       // no baseline yet — measure first, render later
  }
  if (now - probe.at >= TRICKLE_PROBE_MS) {
    const ratio = (ctx.currentTime - probe.ctxTime) / ((now - probe.at) / 1000);
    const healthy = ratio >= TRICKLE_MIN_CLOCK;
    if (healthy) state.everHealthy = true;
    // The escape is for a song that has never played cleanly. Once one has, a later
    // collapse is load, and rendering through it is what made it a collapse.
    state.clockOk = healthy || (!state.everHealthy && ratio < TRICKLE_DROWNING_CLOCK);
    state.clockProbe = { at: now, ctxTime: ctx.currentTime };
  }
  return !!state.clockOk;
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
    // Has the clock been at full speed at any point in THIS playback? See the drowning
    // note above — it is what separates "never warmed" from "was fine until it wasn't".
    everHealthy: false,
    // ---- the edit-recovery window ------------------------------------------------
    //
    // `urgentUntil` is a wall-clock deadline, not a flag: it expires on its own, so a
    // burst can never become a permanent mode however the edits arrive. `urgentTagging`
    // is set only for the duration of the urgent WALK, so the jobs it creates can be
    // told apart from the ordinary scheduler misses that happen to land in the same
    // window — otherwise the counters would credit the repair with work it did not do.
    urgentUntil: 0,
    urgentTagging: false,
    idlePending: false,
    cancelIdle: null,
    generation: 0,
    plan: {
      id: 0, candidates: 0, selected: 0, completed: 0, failed: 0,
      skippedCheap: 0, skippedBudget: 0, selectedBytes: 0, totalBenefit: 0,
      selectedBenefit: 0, pending: 0,
    },
    // LIFETIME TOTALS, and every name here carries `Total` when a live field of the
    // same idea exists. `queuedTotal` used to be `queued`, which collided with the
    // live backlog in the health object below and silently won the spread: every
    // reader that asked "how much is left to render" was handed "how many jobs has
    // this session ever made", a number that only goes up. The pre-roll's
    // drained-yet? test was the casualty.
    stats: {
      hits: 0, misses: 0, queuedTotal: 0, started: 0, completed: 0,
      // Queued, started and finished BY THE URGENT WALK. Three numbers rather than one
      // because they fail differently: queued but never started is the idle gate or the
      // clock brake refusing, started but never finishing is a render too slow for the
      // window, and neither is visible in a single "urgent happened" boolean.
      urgentQueued: 0, urgentStarted: 0, urgentCompleted: 0,
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
  if (!state || state.rendering >= NOTE_RENDER_JOBS
    || state.idlePending || !state.queue.length) return;
  // Urgent work does not queue behind a gap that may be 400ms away — see `whenSoon`.
  const wait = performance.now() < (state.urgentUntil || 0) ? whenSoon : whenIdle;
  state.idlePending = true;
  state.cancelIdle = wait((deadline) => {
    state.idlePending = false;
    state.cancelIdle = null;
    // During playback the trickle's three brakes decide; refused is not cancelled —
    // the retry keeps the queue moving toward the next idle slice with headroom.
    if (state.playbackActive && !trickleAllowed(state, deadline)) {
      clearTimeout(state.trickleRetry);
      // A refusal during the urgent window re-asks QUICKLY. The reasons for refusing are
      // unchanged — the idle gate and the clock brake still decide — but waiting a full
      // 600ms before asking again wastes most of a window that only lasts a few seconds.
      // Measured: idle callbacks on this desk mostly arrive via their own 400ms timeout,
      // so the re-ask cadence is a real share of the throughput rather than a detail.
      const wait = performance.now() < (state.urgentUntil || 0)
        ? TRICKLE_URGENT_RETRY_MS : TRICKLE_GAP_MS;
      state.trickleRetry = setTimeout(() => pumpCache(state), wait);
      return;
    }
    let job = null;
    while (state.queue.length && !job) {
      const candidate = state.queue.shift();
      if (cacheEntryCurrent(state, candidate)) job = candidate;
      else state.stats.stale++;
    }
    if (!job) { pumpCache(state); return; }
    state.rendering++;
    state.stats.started++;
    if (job.urgent) state.stats.urgentStarted++;
    // ---- HOW LONG ONE CACHE RENDER ACTUALLY BLOCKS -------------------------------
    //
    // `startRendering()` runs the DSP off the main thread, so the assumption has always
    // been that a render is cheap here. What is NOT off the main thread is building the
    // node graph for the note first — every oscillator, filter and envelope of a preset
    // that may carry three layers of four unison voices — and neither is trimming and
    // keeping the buffer afterwards. Both happen in this task.
    //
    // Worth measuring rather than assuming, because it is the one piece of work an EDIT
    // creates: a tweak purges that voice's buffers, and the desk re-renders them while
    // the song is playing. "It plays smoothly until I touch something" is exactly the
    // shape that would have.
    const jobStart = performance.now();
    Promise.resolve().then(() => job.run()).catch((error) => {
      state.stats.failed++;
      console.warn('[voices] note cache job failed', error?.message || error);
    }).finally(() => {
      if (job.planId && state.plan?.id === job.planId) {
        state.plan.completed++;
        if (job.entry?.failed) state.plan.failed++;
        state.plan.pending = Math.max(0, state.plan.pending - 1);
      }
      if (job.urgent) {
        state.stats.urgentCompleted++;
        // ---- THE WINDOW LASTS AS LONG AS THE REPAIR --------------------------------
        //
        // A fixed four seconds was a guess, and the counters said what it was worth:
        // 113 urgent jobs queued and 38 started, 29 queued and 6 started. The window
        // expired with most of the repair undone, and every note it did not reach was
        // played live — which is the load that overloaded the audio thread to begin
        // with.
        //
        // So progress extends it. Each urgent job that FINISHES buys the next one its
        // window, and the moment there is no urgent work left the extension stops and
        // the window closes on its own. It cannot become a permanent mode: it is
        // bounded by the queue emptying, and every job still has to pass the clock
        // brake, which refuses the lot while the audio thread is in trouble.
        if (state.queue.some((queued) => queued.urgent)) {
          state.urgentUntil = Math.max(state.urgentUntil || 0,
            performance.now() + URGENT_CACHE_EXTEND_MS);
        }
      }
      state.rendering = Math.max(0, state.rendering - 1);
      state.lastRenderDone = performance.now();
      const jobMs = state.lastRenderDone - jobStart;
      state.stats.renderMsMax = Math.max(state.stats.renderMsMax || 0, jobMs);
      state.stats.renderMsTotal = (state.stats.renderMsTotal || 0) + jobMs;
      if (state.playbackActive) state.stats.trickled = (state.stats.trickled || 0) + 1;
      pumpCache(state);
    });
  });
}

/*
 * Whether the TRANSPORT is actually rolling — a different fact from playbackActive,
 * which means "a bank is loaded" and stays true on pause. The distinction earns its
 * keep in one specific moment: a song too heavy to play cold, where the user does the
 * obviously right thing and PAUSES to let the cache catch up. With only the trickle's
 * cadence available that pause built ~1.7 renders a second against a 400-note backlog —
 * it never caught up, and the pause read as useless (measured live, smw, 2026-08-20).
 * With the transport known to be stopped, the pump runs at full speed instead: the
 * cooldown and the clock brake exist to protect AUDIBLE playback, and a paused
 * transport has none to protect.
 */
export function setNoteCacheTransportRunning(state, running) {
  if (!state) return;
  const was = state.transportRunning;
  state.transportRunning = !!running;
  if (was && !state.transportRunning) pumpCache(state);   // pausing = start catching up
}

export function setNoteCachePlaybackActive(state, active) {
  if (!state) return;
  const was = state.playbackActive;
  state.playbackActive = !!active;
  if (state.playbackActive && !was) {
    state.playbackSince = performance.now();
    state.clockProbe = null;
    state.clockOk = false;
    // Each playback earns its own verdict: a song that played cleanly yesterday says
    // nothing about a machine that is busy now.
    state.everHealthy = false;
  }
  // Either direction pumps now: stopping drains freely, starting arms the trickle.
  pumpCache(state);
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
  state.plan = {
    id: state.plan?.id || 0, candidates: 0, selected: 0, completed: 0, failed: 0,
    skippedCheap: 0, skippedBudget: 0, selectedBytes: 0, totalBenefit: 0,
    selectedBenefit: 0, pending: 0,
  };
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
function layerNoteSeconds(v, dur, { includeChorus = true } = {}) {
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
  // Full song renders include the chorus delay drain. Pre-chorus note-cache renders pass
  // includeChorus:false because the standing lane stage owns that tail at replay.
  if (includeChorus && (v?.chorus?.mix ?? 0) > 0) end += CHORUS_TAIL_S;
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
 * How long an MRDR-3 AW lane may go unplayed before a rack teardown really releases it.
 *
 * A lane is a persistent worklet node, and building one clones the table pyramid and the
 * noise set into the processor — so a lane kept is a crack avoided and a lane kept for
 * ever is a node idling on a one-core budget. Thirty seconds separates them cleanly: the
 * desk re-banks on a stop, a voice change or an apply, and none of those takes half a
 * minute, so a lane the song is still using is never this old. See
 * `releaseIdleMrdr3Lanes`.
 */
const MRDR3_LANE_IDLE_SECONDS = 30;

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
// The live lane keeps this oscillator free-running so successive notes do not restart
// their modulation phase. Offline renders still start each lane stage from a deterministic
// transport origin, so repeated renders and stems remain reproducible.
const CHORUS_BASE_S = 0.0055;
const CHORUS_SWING_S = 0.004;
// How far past the last envelope the modulator has to keep running for the delay lines to
// drain under a still-moving LFO rather than a frozen one.
const CHORUS_TAIL_S = 0.1;
// How long a retired MRDR lane stage stays connected after the last note booked through
// it was due to end. The stage only routes — the sources stop themselves — so this needs
// to cover the longest release still travelling through it, not the note itself. See
// `prune`, which is the one place a stage is taken out of service while the song plays.
const MRDR_STAGE_DRAIN_MS = 4000;

function rampParam(param, value, at, seconds = 0.015) {
  if (!param) return;
  const t = Number.isFinite(at) ? at : 0;
  try {
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else if (param.cancelScheduledValues) param.cancelScheduledValues(t);
    if (param.linearRampToValueAtTime) param.linearRampToValueAtTime(value, t + seconds);
    else param.setValueAtTime(value, t);
  } catch {
    try { param.setValueAtTime(value, t); } catch { /* context may be closing */ }
  }
}

/** Build only the wet part of the MRDR Juno chorus. The lane owns the dry branch. */
function buildChorusLeg(ctx, spec, t, stage) {
  const rate = Math.min(8, Math.max(0.05, spec.rate ?? 0.8));
  const depth = Math.min(1, Math.max(0, spec.depth ?? 0.5));
  const width = Math.min(1, Math.max(0, spec.width ?? 1));
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(rate, t);
  const sides = [];
  for (const side of [-1, 1]) {
    const delay = ctx.createDelay(0.05);
    delay.delayTime.setValueAtTime(CHORUS_BASE_S, t);
    const swing = ctx.createGain();
    swing.gain.setValueAtTime(side * depth * CHORUS_SWING_S, t);
    osc.connect(swing); swing.connect(delay.delayTime);
    const level = ctx.createGain();
    level.gain.setValueAtTime(0, t);
    stage.input.connect(delay);
    let tail = delay;
    if (width > 0 && ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(side * width, t);
      delay.connect(pan); tail = pan;
      sides.push({ delay, swing, level, pan, side });
    } else sides.push({ delay, swing, level, pan: null, side });
    tail.connect(level); level.connect(stage.output);
  }
  osc.start(t);
  return { osc, sides, spec: { ...spec }, stopped: false };
}

function disconnectChorusLeg(leg) {
  if (!leg) return;
  for (const side of leg.sides || []) {
    for (const node of [side.delay, side.swing, side.level, side.pan]) {
      try { node?.disconnect(); } catch { /* already disconnected */ }
    }
  }
  try { leg.osc?.disconnect(); } catch { /* already disconnected */ }
}

function mrdrDryFingerprint(v) {
  // NATIVE ONLY (§10): a cache fingerprint for a lane that never caches.
  if (!v || v.synth !== MRDR3_NATIVE) return '';
  return JSON.stringify(v, (key, value) => key === 'chorus' ? undefined : value);
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

/**
 * The pooled Tone classes, keyed by the name a preset can still be stored under.
 *
 * Nothing here is reached by NAME any more. All four are the two halves of two merged
 * engines — `CRLS-1` picks between `Synth` and `MonoSynth`, `RMND-2` between `FMSynth`
 * and `AMSynth` — and `synthClassFor` chooses from the preset's own structure before this
 * table is consulted. They stay listed because this is the allowlist: a class that is not
 * here is one the offline render was never swept for. See the note at the top of this
 * file about `PluckSynth` and `PolySynth` rendering silence.
 */
const SYNTHS = {
  Synth: Tone.Synth,
  MonoSynth: Tone.MonoSynth,
  FMSynth: Tone.FMSynth,
  AMSynth: Tone.AMSynth,
};

/**
 * CRLS-1 — the single-oscillator subtractive engine, which Tone happens to ship as two.
 *
 * `Tone.Synth` is an oscillator into an amplitude envelope. `Tone.MonoSynth` is the SAME
 * oscillator into the SAME envelope with a filter and a filter envelope between them —
 * the same `OmniOscillator`, the same `AmplitudeEnvelope`, the same chain order. So with
 * the filter taken out they are not merely similar, they are identical, and one engine
 * with a filter switch is an honest description rather than a simplification: nothing
 * changes its sound crossing the seam, because in the audio there is no seam.
 *
 * Keeping both classes is what makes the switch worth having. A MonoSynth is TWICE a
 * Synth measured on matched presets, and up to 3.7x with a steep slope
 * (work/local/bench-synth-classes.mjs) — the filter is nowhere near free, so a preset
 * that does not sweep must not pay for a filter it never moves.
 *
 * ---- the switch is the preset's own STRUCTURE, not a flag beside it ---------
 *
 * A preset that carries a filter has one; a preset that does not, does not. The
 * catalogue was already written that way — every MonoSynth preset carries `filter` AND
 * `filterEnvelope`, every Synth preset carries neither, with nothing in between — so the
 * merge renames and changes nothing else. No new key means no way for a preset to
 * disagree with itself about whether its own filter is there.
 *
 * `Synth` and `MonoSynth` stay readable forever: songs and user presets carry them by
 * the hundred, and a name is not worth a migration. `keyMode` still reads the `mono`
 * boolean it replaced for the same reason.
 */
export const CRLS1 = FAMILY.CRLS1;

/**
 * KNDO-5 — the chip channel, named for Koji Kondo.
 *
 * Same engine `GameSynth` always was: one oscillator, or the seeded buffer through a
 * bandpass that tracks the note, into an AR gain. The `-5` is the four `NATIVE_WAVES`
 * plus that noise channel, which is also what the NES APU had — measured first, nod
 * second. See docs/synth-naming.md for why this name and not the alternatives.
 *
 * `GameSynth` stays readable forever, exactly as `Synth` and `MonoSynth` do: ten song
 * files carry it inside serialised `voiceParams`, user presets carry it in local
 * storage, and a name is not worth a migration.
 */
export const KNDO5 = FAMILY.KNDO5;

/**
 * RMND-2 — the modulation engine, named for Raymond Scott.
 *
 * A carrier and one modulator, differing only in WHICH parameter of the carrier the
 * modulator reaches: its frequency (`Tone.FMSynth`) or its amplitude (`Tone.AMSynth`).
 * Everything else is the same object — the same two oscillators, the same amplitude
 * envelope, the same modulation envelope shaping the modulator on its way in. So this is
 * the `CRLS-1` argument again with the destination as the switch rather than the filter,
 * and the `-2` survives it untouched: a carrier plus a modulator is two whichever
 * parameter it lands on. See docs/synth-naming.md.
 *
 * ---- the switch is the preset's own STRUCTURE, not a flag beside it ---------
 *
 * `modulationIndex` is how far the modulator bends the carrier's FREQUENCY, in multiples
 * of that frequency. Amplitude modulation has no such number — Tone.AMSynth does not read
 * one and could not use it — so a preset carrying an index is bending frequency and a
 * preset without one is bending amplitude. The catalogue was already written that way:
 * all 32 FM presets carry a top-level `modulationIndex`, all 10 AM presets carry none,
 * with nothing in between. No new key means no way for a preset to disagree with itself
 * about which kind of modulation it is.
 *
 * Read at the TOP level of `options` on purpose. `oscillator.modulationIndex` is a
 * different number that belongs to Tone's `fm*`/`am*` oscillator types, and a CRLS-1
 * preset built on `fmsquare5` carries one — see `tpBassGuitar` in src/data/voices.js. A
 * looser check would read that preset as an FM carrier it is not.
 *
 * `FMSynth` and `AMSynth` stay readable forever, exactly as `Synth`, `MonoSynth` and
 * `GameSynth` do: song files carry them inside serialised `voiceParams` and user presets
 * carry them in local storage. A name is not worth a migration.
 */
export const RMND2 = FAMILY.RMND2;

/**
 * WNDR-9 — the drawbar organ, named for Klaus Wunderlich.
 *
 * Nine drawbars, which is the number, and the reason for the name: Wunderlich's art was
 * registration — building orchestral voices out of a drawbar stack and multitracking
 * them — so the man and the architecture are the same fact. `stretch` and `damp` are
 * what stop it being only an organ: an inharmonic stack that decays from the top is a
 * bell, a gong, a struck bar. See docs/synth-naming.md.
 *
 * `AdditiveSynth` stays readable forever, as every retired spelling does — ten song
 * files carry it inside serialised `voiceParams`, and a name is not worth a migration.
 */
export const WNDR9 = FAMILY.WNDR9;

/**
 * The renamed engines live in `./synth-families.js`, a module with no imports of its own.
 *
 * They moved there because THREE files need the map and only one of them can afford to
 * load the rack to get it: this file builds Tone classes from it, src/data/voices-in-play
 * filters the preset picker by it, and tools/lib/synth-display prints from it. Written
 * out three times, the copies drifted — the picker's knew about CRLS-1 and not about
 * KNDO-5 or RMND-2, so a lane still carrying `GameSynth` or `FMSynth` was offered no
 * preset to switch to, because every preset in the catalogue had been renamed out from
 * under a comparison made on the raw string.
 *
 * Re-exported here so callers still ask this file about an engine. Anything comparing a
 * preset's `synth` against a family goes through `synthFamily`, so a stored preset
 * written under the old name is the same instrument rather than an unknown one — which
 * is what would otherwise reach `SYNTHS[]`, come back undefined, and look exactly like a
 * preset doing nothing.
 */
export const synthFamily = FAMILY.synthFamily;

/**
 * Which Tone class a preset actually builds, or undefined if it is not a pooled one.
 *
 * Takes the options rather than the voice because the two callers hold different shapes
 * of the same thing: `play` and the live-edit walk hold a catalogue entry, `_addSlot`
 * holds the built spec. One reader, so a pool can never be built from a different class
 * than the gate that let it through.
 */
const synthClassFor = (synth, options) => {
  const family = synthFamily(synth);
  if (family === CRLS1) {
    return options && (options.filter || options.filterEnvelope) ? Tone.MonoSynth : Tone.Synth;
  }
  // Top-level only — `oscillator.modulationIndex` is Tone's oscillator-level number and
  // means something else entirely. See the note on RMND-2.
  if (family === RMND2) {
    return options && options.modulationIndex !== undefined ? Tone.FMSynth : Tone.AMSynth;
  }
  return SYNTHS[synth];
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

/**
 * THE KEYS STILL DOWN on one sounding instrument, oldest first.
 *
 * A held note is the one kind the rack does not know the length of, and a MONO or LEGATO
 * preset answers several of them with ONE instrument. Which note that instrument plays is
 * LAST NOTE PRIORITY — the key pressed most recently — and the two consequences are the
 * whole of why this list exists:
 *
 *   · a key that is not the one speaking comes up in SILENCE. Nothing is released,
 *     because the note it opened belongs to somebody else now. Without this, letting go
 *     of the first of three fingers stopped the sound the other two were holding.
 *   · the key that IS speaking hands the note back rather than ending it. Letting go
 *     never STARTS a note, so the hand-over moves the pitch and leaves the envelope
 *     where it stands — which is what every mono synth with a keyboard on it does.
 *
 * Kept on the thing that sounds — a pooled slot, a native glide record — so both
 * synthesis paths say it once rather than each inventing its own answer.
 */
const fingerDown = (host, key, hz) => {
  const fingers = (host.fingers ||= []);
  // The same key pressed again is one finger, not two. A channelised MIDI controller and
  // the on-screen keys can both be holding it, and only one of them may have to let go.
  const already = fingers.findIndex((x) => x.key === key);
  if (already >= 0) fingers.splice(already, 1);
  fingers.push({ key, hz });
};

/**
 * A key came up. Says who owns the instrument NOW and whether the key that left was the
 * one speaking — the two facts a note-off has to have before it can decide to do nothing.
 *
 * A host with no list at all is a note nobody is tracking: it answers "you were the last
 * one", which is the behaviour every caller had before this existed.
 */
const fingerUp = (host, key) => {
  const fingers = host?.fingers;
  if (!fingers || !fingers.length) return { next: null, wasOwner: true };
  const at = fingers.findIndex((x) => x.key === key);
  if (at >= 0) fingers.splice(at, 1);
  return { next: fingers[fingers.length - 1] || null, wasOwner: at === fingers.length };
};

/**
 * Take the release Tone has already booked off an envelope, keeping the level it has
 * reached. The LEGATO contract in one call — a note taken over must not be closed by the
 * note-off the note before it scheduled.
 *
 * Every branch of every class it is asked about: `envelope`/`filterEnvelope` on the
 * Monophonic classes, which own theirs.
 */
const cancelToneEnvelopes = (synth, t) => {
  const cancel = (node) => {
    if (node?.cancel) node.cancel(t);
    else if (node?.gain?.cancel) node.gain.cancel(t);
  };
  cancel(synth?.envelope);
  cancel(synth?.filterEnvelope);
  cancel(synth?.voice0?.envelope);
  cancel(synth?.voice0?.filterEnvelope);
  cancel(synth?.voice1?.envelope);
  cancel(synth?.voice1?.filterEnvelope);
};

/**
 * How many instruments one preview pool may grow to.
 *
 * A HELD note does not give its slot back when the next key goes down — the finger is
 * still on it — so a keyboard needs a slot per key where a sequencer can share a couple
 * round robin. Ten fingers and a sustain pedal is the shape to fit; past it the round
 * robin takes the oldest slot back, which is the answer a real synth gives too.
 */
const HELD_VOICES = 16;

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
    // The trickle's clock probe needs the LIVE context, and it must not depend on WHICH
    // code path built the rack: the desk's rack is created by prepareNoteCache on the
    // prep flow but by scheduleStep on a plain press of play, and only the former ever
    // called setNoteCacheState — so whether a session could warm while playing was a
    // coin-flip on how it started (measured: one session trickled 250 renders a lap,
    // the next, byte-identical code, trickled three). Set here, at the one place every
    // rack passes through.
    if (typeof ctx?.startRendering !== 'function') this._cacheState.liveCtx = ctx;
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
    // MRDR's preset-internal chorus is a lane insert, not a note effect. The stage is
    // deliberately owned here rather than by Mixer: the preset chooses its settings,
    // while the ordinary channel strip remains downstream and reusable by every voice.
    // WNDR-9 uses the same map and the same stage — it is the one insert this
    // family of native paths shares, and it keeps its MRDR name because that is where it
    // was built and what `runtimeHealth` has always called it.
    this._mrdrLaneStages = new Map();
    this._mrdrDryFingerprints = new Map();
    // Tail cleanup is a live Mixer optimisation and is opt-in. Offline racks, cache
    // render racks and game playback remain exact by default.
    this.allowMrdrTailCulling = false;
    // Full unless the desk says otherwise, which is what makes every bounce Full by
    // construction: a render builds a fresh rack and never touches this. See MRDR_QUALITY.
    this.mrdrQuality = MRDR_QUALITY.FULL;
    this._mrdrTailStats = {
      eligible: 0, skipped: 0, culled: 0, potentialSeconds: 0, baselineSeconds: 0, savedSeconds: 0,
      skipReasons: Object.create(null),
    };
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
    clampFatCount(opts);
    floorEnvelopeSustain(opts);
    // Each Duo oscillator card owns where that voice sits — INTERVAL in whole semitones
    // and DETUNE in cents, the same pair every other oscillator card on the desk carries.
    // Neither is a Tone option; both are translated into the shared detune and the
    // harmonicity ratio here, at the engine boundary, and leave no editor-only key
    // behind for Tone to see. There is no Ratio control any more: the ratio IS the
    // interval between the two voices, and stating it twice was how the panel ended up
    // with a pot that fought the pitch pots it sat above.
    // Glide is a constructor option on every Tone synth. It only becomes audible in a
    // non-poly key mode because those modes keep one note on one instance.
    if (v.portamento) opts.portamento = v.portamento;
    return {
      synth: v.synth,
      opts,
      // Depth is capped at 1 on THIS path alone, and it is Tone's cap rather than ours:
      // `Tone.Vibrato.depth` is a NormalRange param, so a 0–12 setting from the pot would
      // be rejected outright and take the note with it. DuoSynth used to be excluded here
      // because it carried Tone's own LFO across its two internal voices and a second
      // modulator on the same pitch was one authority too many; it is retired, and the
      // rack-wide wrapper is now the only answer every pooled class gets.
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
   * The longest release anywhere in the options bag — a nested class has two envelopes and
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

  /** Return the persistent MRDR route for one lane/scope and update its destinations. */
  _ensureMrdrLaneStage(laneKey, voiceId, v, {
    dry, wet, echo = true, time = 0, preview = false, scope = null,
  } = {}) {
    const lane = laneKey || `voice:${voiceId}`;
    const stageKey = `${scope || (preview ? 'preview' : 'song')}|${lane}`;
    let stage = this._mrdrLaneStages.get(stageKey);
    if (!stage) {
      const input = this.ctx.createGain();
      const direct = this.ctx.createGain();
      const output = this.ctx.createGain();
      input.connect(direct); direct.connect(output);
      stage = {
        key: stageKey, laneKey: lane, voiceId, scope: scope || (preview ? 'preview' : 'song'),
        input, direct, output, dry: null, wet: null, echo: false, chorus: null,
        retiredChorus: new Set(), lastTime: time, disposed: false,
      };
      this._mrdrLaneStages.set(stageKey, stage);
      direct.gain.setValueAtTime(1, time);
    }
    stage.voiceId = voiceId;
    stage.lastTime = Math.max(stage.lastTime || 0, Number.isFinite(time) ? time : 0);
    if (stage.dry !== dry || stage.wet !== wet || stage.echo !== !!echo) {
      try { stage.output.disconnect(); } catch { /* first connection or dead context */ }
      stage.dry = dry || null;
      stage.wet = wet || null;
      stage.echo = !!echo;
      if (stage.dry) stage.output.connect(stage.dry);
      if (stage.echo && stage.wet) stage.output.connect(stage.wet);
    }
    this._updateMrdrLaneStage(stage, v?.chorus, time);
    return stage;
  }

  _retireMrdrChorus(stage, at) {
    const leg = stage?.chorus;
    if (!leg || leg.stopped) return;
    stage.chorus = null;
    leg.stopped = true;
    for (const side of leg.sides || []) rampParam(side.level.gain, 0, at);
    try { leg.osc.stop(at + CHORUS_TAIL_S); } catch { /* already stopped */ }
    const dispose = () => {
      disconnectChorusLeg(leg);
      stage.retiredChorus?.delete(leg);
    };
    stage.retiredChorus?.add(leg);
    if (typeof this.ctx.startRendering === 'function') dispose();
    else {
      const now = Number.isFinite(this.ctx.currentTime) ? this.ctx.currentTime : at;
      setTimeout(dispose, Math.max(0, (at + CHORUS_TAIL_S - now) * 1000) + 40);
    }
  }

  _updateMrdrLaneStage(stage, spec, at = 0) {
    if (!stage || stage.disposed) return;
    const time = Number.isFinite(at) ? at : 0;
    const mix = Math.min(1, Math.max(0, Number(spec?.mix) || 0));
    if (!(mix > 0)) {
      rampParam(stage.direct.gain, 1, time);
      this._retireMrdrChorus(stage, time);
      return;
    }
    const leg = stage.chorus && !stage.chorus.stopped
      ? stage.chorus : (stage.chorus = buildChorusLeg(this.ctx, spec, time, stage));
    const rate = Math.min(8, Math.max(0.05, spec.rate ?? 0.8));
    const depth = Math.min(1, Math.max(0, spec.depth ?? 0.5));
    const width = Math.min(1, Math.max(0, spec.width ?? 1));
    const wetLevel = Math.sin((mix * Math.PI) / 2) / Math.SQRT2;
    rampParam(stage.direct.gain, Math.cos((mix * Math.PI) / 2), time);
    for (const side of leg.sides || []) {
      rampParam(side.level.gain, wetLevel, time);
      rampParam(side.swing.gain, side.side * depth * CHORUS_SWING_S, time);
      if (side.pan) rampParam(side.pan.pan, side.side * width, time);
    }
    rampParam(leg.osc.frequency, rate, time);
    leg.spec = { ...spec };
  }

  setMrdrTailCulling(enabled) {
    this.allowMrdrTailCulling = !!enabled;
  }

  /**
   * Choose MRDR-3's realtime quality — see MRDR_QUALITY.
   *
   * Takes effect on the NEXT note-on. A note already sounding finishes under the mode it
   * was built in, because the alternative is replacing a live graph mid-note, which is a
   * click for the sake of a saving that arrives a beat later anyway.
   *
   * The note cache follows the mode rather than overriding it: a cached note costs the
   * same to replay whichever way it was rendered, so rendering it Full would be free CPU —
   * but it would also make the same preset sound one way from the cache and another way
   * live, which is worse than either mode consistently. The key carries the mode so the
   * two never mix.
   */
  setMrdrQuality(mode) {
    const next = mode === MRDR_QUALITY.PERFORMANCE
      ? MRDR_QUALITY.PERFORMANCE : MRDR_QUALITY.FULL;
    if (next === this.mrdrQuality) return this.mrdrQuality;
    this.mrdrQuality = next;
    return next;
  }

  /** How many unison voices a layer may build under the current mode. */
  _unisonCap() {
    return this.mrdrQuality === MRDR_QUALITY.PERFORMANCE ? PERFORMANCE_UNISON : MAX_UNISON;
  }

  /** How many biquads a MRDR-3 filter slope may become under the current mode. */
  _filterStageCap() {
    return this.mrdrQuality === MRDR_QUALITY.PERFORMANCE ? PERFORMANCE_MAX_FILTER_STAGES : 4;
  }

  _recordMrdrTailOpportunity(v, { notes, dur, time, preview, hold, mode }) {
    const stats = this._mrdrTailStats;
    const skip = (reason) => {
      stats.skipped++;
      stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + 1;
    };
    if (!this.allowMrdrTailCulling) { skip('policy_off'); return null; }
    if (preview || hold || mode !== 'poly') { skip('interactive_or_nonpoly'); return null; }
    if (v.drive > 0) { skip('nonlinear_drive'); return null; }
    if (v.layer?.lfo?.target === 'level' && (v.layer.lfo.depth ?? 0) > 0) {
      skip('unbounded_level_lfo'); return null;
    }
    const layers = ['osc1', 'osc2', 'osc3'].map((key) => v.layer?.[key])
      .filter((s) => s && (s.gain ?? 1) > 0 && s.vca !== 'through');
    if (!layers.length) { skip('no_eligible_layers'); return null; }
    if (layers.some((s) => (s.release ?? 0.015) < 0.5 || s.releaseCurve === 'lin')) {
      skip('short_or_linear_release'); return null;
    }
    if (layers.some((s) => (s.filter?.Q ?? 0) > 1)
      || (v.global?.filter?.Q ?? 0) > 1) {
      skip('resonant_filter'); return null;
    }
    const longest = Math.max(0.1, ...(Array.isArray(dur) ? dur : [dur]).filter(Number.isFinite));
    let authoredEnd = time + longest;
    for (const s of layers) {
      const delay = Math.min(0.5, Math.max(0, s.delay ?? 0));
      authoredEnd = Math.max(authoredEnd, time + delay + longest * (s.len ?? 1));
    }
    const longestRelease = Math.max(...layers.map((s) => s.release ?? 0.015));
    const releaseEnd = authoredEnd + longestRelease;
    // gateAdsr already reaches the -100 dB floor in its final 5 ms linear segment;
    // source.stop carries another 5 ms of safety. There is normally no material tail
    // to reclaim. Keep the measured opportunity explicit and refuse anything under 50 ms.
    const predictedSilent = releaseEnd + 0.005;
    const scheduledStop = releaseEnd + 0.01;
    const potential = Math.max(0, scheduledStop - predictedSilent);
    stats.baselineSeconds += Math.max(0, scheduledStop - time);
    stats.potentialSeconds += potential;
    if (potential < 0.05) { skip('below_50ms_gate'); return null; }
    if (potential / Math.max(0.001, scheduledStop - time) < 0.1) {
      skip('below_10_percent_gate'); return null;
    }
    stats.eligible++;
    return { cullAt: predictedSilent, fadeAt: Math.max(time, predictedSilent - STOP_FADE), saved: potential };
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
  play(laneKey, voiceId, freq, {
    time, dur, gain, detune = 1, dry, wet, echo = true, preview = false,
    hold = preview, spb = null, laneEffects = true, choke = null,
  }) {
    // The comparison override, in front of dispatch and nowhere else (§9.2). With nothing
    // forced this returns the voice unchanged, which is the shipping path.
    //
    // ---- AND IT IS A LIVE CONTROL, ON A LIVE CONTEXT ONLY ----------------------
    //
    // MRDR-3 AW has no offline path: notes go to a lane's port, and port delivery is not
    // ordered against `startRendering()` — the reason TNGR-2 collects its offline notes
    // instead (see `_collectTngr2`). So on an OfflineAudioContext the override cannot
    // produce a rendering of the AW instrument. It produces SILENCE, and everything
    // downstream believes it.
    //
    // The note cache is where that was expensive. It renders eligible notes on a throwaway
    // OfflineAudioContext per note; the entries are gated on the NATIVE identity in
    // `prepareNoteCache`, but the render itself comes through here, so with the desk in AW
    // mode every one of those renders asked for a worklet lane on a context that would
    // never see a second note. That built the 407 ms table pyramid on the MAIN THREAD, per
    // cached note, and the buffer it cached was silence nothing would ever play — AW
    // playback does not consult the cache at all. The audible result is not a quiet lane:
    // it is the note scheduler starved for a quarter of a second while the transport runs,
    // which is a crack. `dropoutsDelta 1` with `clockMin 1.00` in the desk's diagnostics.
    //
    // So an offline render is the NATIVE instrument, and it is not silent about it: the
    // A/B this override exists for happens live, where the comparison is real, and a
    // bounce taken in AW mode renders `_playLayer` rather than a gap. Until §6's offline
    // lane is wired into the rack, those are the only two honest options and this is the
    // one that makes a sound.
    const offline = typeof this.ctx?.startRendering === 'function';
    const v = offline ? VOICES[voiceId] : mrdrComparisonVoice(VOICES[voiceId]);
    // Which voices steal from each other, and who gets to say so.
    //
    // `choke` is the ARRANGEMENT's answer — a channel number the song put this LANE on
    // for this bar (see BAR_MAPS in src/data/arrangements.js). It wins, because it is
    // the specific statement: somebody decided, in this song, at this bar, that these
    // lanes share a voice.
    //
    // `v.monoGroup` is the KIT's answer, written into a preset so a kit built to have
    // one percussion channel arrives that way without every song that uses it having to
    // say so. The arcade Game Boy kit is the one in the tree.
    //
    // Both end up as a key into the same map, so a group can span the drum path and the
    // pooled Tone path, and either kind can release the other. The `preview` suffix
    // keeps the desk's audition bench out of the song's groups: a hat previewed on the
    // keyboard must not cut the hat the transport is playing.
    const group = choke ? `lane:${choke}` : (v?.monoGroup ? `kit:${v.monoGroup}` : null);
    const monoGroup = group ? `${group}|${preview ? 'preview' : 'live'}` : null;
    if (v && v.kind === 'drum') {
      return this._playDrum(v, {
        time, gain, dry, wet, echo, monoGroup, laneKey, voiceId, preview,
      });
    }
    if (v && synthFamily(v.synth) === KNDO5) {
      // A HELD note plays the full one-shot envelope — the decay needs room to
      // reach silence, and the preset's `dur` is a sequencer default, not a
      // sound-design parameter. 4 s is enough for any exponential ramp to hit -80 dB.
      // A gated preview keeps its length, which is what makes a pattern a pattern.
      return this._playGame(v, { freq, time, dur: hold ? 4 : dur, gain, detune, dry, wet, echo, laneKey, preview, hold });
    }
    // Before the allowlist, not after: `SYNTHS` holds Tone classes, so a native synth that
    // reached that line would find nothing under its name and return false, which looks
    // exactly like a preset that does nothing.
    if (v && synthFamily(v.synth) === WNDR9) {
      return this._playAdditive(v, {
        freq, time, dur, gain, detune, dry, wet, echo, laneKey, preview, hold, laneEffects,
      });
    }
    if (v && v.synth === 'TNGR-2') {
      // TNGR-2 is its AudioWorklet and nothing else. Live, notes go to the lane's
      // persistent node; offline, they are collected for `flushTngr2Offline`. There is no
      // second synthesis path to fall back to — see `_playTngr2Node` for what happens
      // when a lane has no node, and `warmTngr2Lane` for the warning when it cannot.
      return this._playTngr2Node(v, {
        freq, time, dur, gain, detune, dry, wet, echo, laneKey, preview, hold, spb,
      });
    }
    // RENDERER DISPATCH — the one deliberate exact-identity branch (§9.1). Which
    // backend plays is written in the lane; there is no `auto` whose answer could
    // change under a library update.
    if (v && v.synth === MRDR3_NATIVE) {
      // Rendered once, replayed after that — when this preset is the kind that can be.
      // The gate and the replay both refuse everything they are unsure of, and then
      // this is the line it always was. See `_cacheableLayer`.
      if (this.noteCache
        && this._cacheableLayer(v, v.mode || keyMode(v), preview, hold)
        && this._playCachedLayer(v, voiceId, Array.isArray(freq) ? freq : [freq],
          { time, dur, gain, detune, dry, wet, echo, laneKey, preview, laneEffects })) {
        return true;
      }
      return this._playLayer(v, {
        freq, time, dur, gain, detune, dry, wet, echo, laneKey, preview, hold, spb, laneEffects,
      });
    }
    if (v && v.synth === MRDR3_AW) {
      // The OTHER exact-identity branch (§9.1). MRDR-3 AW is its worklet and nothing
      // else: no cache to consult, and no second synthesis path to fall back to — which
      // is the point. See `_playMrdr3Aw` for a lane with no node yet, and
      // `warmMrdr3Lane` for the warning when it cannot have one.
      return this._playMrdr3Aw(v, {
        freq, time, dur, gain, detune, dry, wet, echo, laneKey, hold,
      });
    }
    if (!v || !synthClassFor(v.synth, v.options)) return false;
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
    // A POLY pool sized for a chord is sized for a SEQUENCER, where every note has a
    // length and a slot comes back a beat later. A keyboard hands them out and never
    // returns them: the third key pressed used to land on the first key's slot and take
    // the note out from under a finger that was still down — and then letting go of that
    // finger released the key that had stolen it. Grown to the fingers actually down
    // instead, so a chord under three fingers is three notes. See HELD_VOICES.
    if (hold && !mono) {
      const down = pool.slots.reduce((n, s) => n + (s.fingers?.length ? 1 : 0), 0);
      const want = Math.min(HELD_VOICES, down + notes.length);
      while (pool.slots.length < want) this._addSlot(pool, dry, wet, echo);
    }
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
        const slot = mono ? pool.slots[0] : this._slotFor(pool, hold);
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
        // while it schedules, and the classes own their own pitch writers — so a second
        // writer on that param is a fight. Restored in the `finally`, which keeps the pool's
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
        const hz = f * detune * VoiceRack.pitchShift(v);
        const carriesGlide = typeof slot.synth.portamento === 'number';
        if (carriesGlide) slot.synth.portamento = overlap ? glide : 0;
        try {
          if (hold) {
            // A held note uses triggerAttack so a later note-off can release it.
            // Release any previous note at this (lane, freq) first — the same key
            // pressed again restarts rather than stacking.
            this._releasePreview(noteKey);
            // LEGATO UNDER A FINGER is the same sentence as LEGATO under the sequencer,
            // and it has to be said twice because a keyboard reaches this branch and the
            // one below it never sees a held note: a key pressed while another is still
            // DOWN takes the note over rather than striking it again. Without it LEGATO
            // on the keys was MONO with a different name on the pill — which is the one
            // place a player can actually hear the difference between them.
            if (legato && slot.fingers?.length) {
              cancelToneEnvelopes(slot.synth, t);
              slot.synth.setNote(hz, t);
            } else {
              slot.synth.triggerAttack(hz, t, 1);
            }
            this._activePreviews.set(noteKey, { slot, at: t });
            // Which keys are down on this one instrument, so that a note-off can tell
            // whether it is the one speaking. See `fingerDown`.
            fingerDown(slot, noteKey, hz);
            // `gated` rather than `overlap`: this branch re-arms a release at the new
            // note's end, and doing that to a note whose KEY IS STILL DOWN would stop a
            // sound the finger is still asking for. A held predecessor is handled by the
            // branch above, which is where a held note belongs.
          } else if (legato && gated) {
            // A later note owns the same gate. Cancel the previous note's scheduled
            // release before moving the pitch, otherwise the old note-off would close
            // the new note halfway through it. Tone's envelope cancel leaves its
            // current level in place, which is the legato contract.
            cancelToneEnvelopes(slot.synth, t);
            slot.synth.setNote(hz, t);
            slot.synth.triggerRelease(t + noteDur);
          } else {
            slot.synth.triggerAttackRelease(hz, noteDur, t);
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

  /**
   * The keys still down on one TNGR-2 lane, kept per LANE because that is what a
   * non-poly lane's single voice belongs to. One object shared by every held note on it,
   * so a note-off can ask the question without having to take the lane key apart again.
   */
  _tngr2Fingers(laneKey) {
    this._tngr2Held ||= new Map();
    let host = this._tngr2Held.get(laneKey);
    if (!host) { host = { fingers: [] }; this._tngr2Held.set(laneKey, host); }
    return host;
  }

  /**
   * Prepare a lane's worklet node ahead of the notes that will use it.
   *
   * Called when a song loads or a lane's voice changes — never from the scheduler, which
   * cannot await. TNGR-2 has no second synthesis path, so a lane that cannot be built is
   * a lane that will be silent; that case is reported once, loudly, rather than left to
   * be found as a missing part in a mix.
   */
  async warmTngr2Lane(v, laneKey) {
    if (!v || v.synth !== 'TNGR-2') return false;
    if (!canHostTngr2(this.ctx)) {
      // The cause is almost always an insecure origin: AudioWorklet needs https or
      // localhost, so the LAN dev URL (http://MBP14.local:8001) and file:// have no
      // `audioWorklet` at all. The deployed game is https and unaffected.
      if (!this._tngr2Warned) {
        this._tngr2Warned = true;
        console.error('TNGR-2 cannot play: AudioWorklet needs a secure context '
          + '(https or localhost). This page is ' + (globalThis.location?.origin || '?')
          + ' — TNGR-2 lanes will be silent here.');
      }
      return false;
    }
    try {
      const lane = await tngr2Lane(this.ctx, laneKey, {
        // The VOICE's patch, not just its tngr2 block: key mode, glide and vibrato are
        // shared controls stored on the voice. See `tngr2PatchForVoice`.
        stored: tngr2PatchForVoice(v), seed: hashSeed(v.id || laneKey),
        vibrato: tngr2VibratoOf(v), effects: tngr2EffectsOf(v),
      });
      // Routing happens at the first note, not here: the dry/wet buses belong to the
      // scheduling call, not to the lane. See `_playTngr2Node`.
      return !!lane;
    } catch (err) {
      console.error(`TNGR-2: lane ${laneKey} failed to build — ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Book a note for an OFFLINE render instead of playing it.
   *
   * An offline context is scheduled in full and then rendered in one go, so the whole
   * schedule is known before the first sample — which is exactly the delivery the port
   * cannot do. Notes are gathered per lane here, and `flushTngr2Offline` builds one node
   * per lane with the schedule in `processorOptions` just before `startRendering()`.
   */
  _collectTngr2(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', hold = false }) {
    const notes = Array.isArray(freq) ? freq : [freq];
    const shift = VoiceRack.pitchShift(v) * detune;
    const amp = Math.max(0, Number(gain) || 0);
    if (!(amp > 0) || !notes.some((n) => n > 0)) return false;
    const rate = this.ctx.sampleRate;
    const key = `${laneKey}|${v.id || ''}`;
    this._tngr2Offline ||= new Map();
    let booking = this._tngr2Offline.get(key);
    if (!booking) {
      // THE EVENT ID COUNTER OUTLIVES THE BOOKING.
      //
      // An event id is a note's identity inside the processor: a note-off names the
      // note-on it ends. The bookings are emptied at every flush — the schedule is handed
      // over a stretch at a time — so a counter living on the booking restarted at 1 for
      // each stretch, and the second stretch's notes wore the first stretch's names. A
      // note-off then ended a note that had already finished while the note it was meant
      // for played on: one French Horn note sustained for the rest of the song.
      this._tngr2OfflineIds ||= new Map();
      booking = {
        voice: v, laneKey, dry, wet: echo ? wet : null, events: [],
        next: this._tngr2OfflineIds.get(key) || 1,
      };
      this._tngr2Offline.set(key, booking);
    }
    const durationAt = (index) => {
      const raw = Array.isArray(dur) ? (dur[index] ?? dur[0]) : dur;
      return Math.max(0.001, Number(raw) || 0.001);
    };
    let made = false;
    notes.forEach((note, index) => {
      if (!(note > 0)) return;
      const hz = note * shift;
      if (!Number.isFinite(hz) || !(hz > 0)) return;
      const eventId = booking.next++;
      booking.events.push({
        type: 'noteOn', frame: Math.max(0, Math.round(time * rate)), eventId,
        hz, velocity: Math.min(1, amp),
      });
      if (!hold) {
        booking.events.push({
          type: 'noteOff', eventId,
          frame: Math.max(0, Math.round((time + durationAt(index)) * rate)),
        });
      }
      made = true;
    });
    // Kept where the next stretch of this lane will find it, whatever happens to the
    // booking it was counting in.
    this._tngr2OfflineIds.set(key, booking.next);
    return made;
  }

  /**
   * Build the offline lanes booked during scheduling. Call once, before `startRendering`.
   *
   * Nothing has been rendered at this point — an OfflineAudioContext does not start until
   * it is asked — so a node created here is in place for the first sample. Returns the
   * number of lanes it built, which is zero for a song with no TNGR-2 on it.
   */
  /**
   * Build the offline lanes for whatever has been collected — and CALLABLE AGAIN.
   *
   * The bounce walks the schedule just in time: the graph stands a few seconds ahead of
   * the render head and no further, because an offline graph built whole processes every
   * node for the whole song. So the schedule is not complete when the render starts, and a
   * lane built once from the first few seconds of it plays the first few seconds and then
   * nothing — which is a part missing from a bounce with no error to say so.
   *
   * A lane the second call already knows is not rebuilt. Its notes are POSTED, exactly as
   * the live path posts them, and the schedule stays one node per lane: the voice
   * allocator sees the song as one stream, so a chord steals the same way in a stem as in
   * the mix. The cushion is what makes it safe — events posted from a checkpoint are for
   * a time at least a horizon ahead, which is the same lookahead the live path runs on,
   * rather than the zero cushion that made port delivery unreliable before
   * `startRendering` (docs/TNGR-2-completion-spec.md §3, finding b).
   */
  async flushTngr2Offline() {
    const booked = this._tngr2Offline;
    if (!booked || !booked.size) return 0;
    this._tngr2Offline = new Map();
    this._tngr2OfflineLanes ||= new Map();
    // Lanes belong to the CONTEXT that built them. A page that bounces twice reuses the
    // rack, and a node from the last render is not a node this one can post to.
    for (const [key, entry] of this._tngr2OfflineLanes) {
      if (entry.context !== this.ctx) this._tngr2OfflineLanes.delete(key);
    }
    let built = 0;
    for (const booking of booked.values()) {
      try {
        const already = this._tngr2OfflineLanes.get(booking.laneKey);
        if (already) {
          // Posted as collected: these events already carry absolute FRAMES, which is what
          // the processor reads. Routing them through `tngr2NoteOn` would convert a frame
          // number as though it were seconds and land every note hours into the render.
          for (const event of booking.events) already.node.port.postMessage(event);
          continue;
        }
        const node = await renderTngr2Lane(this.ctx, {
          stored: tngr2PatchForVoice(booking.voice),
          vibrato: tngr2VibratoOf(booking.voice),
          effects: tngr2EffectsOf(booking.voice),
          events: booking.events,
          seed: hashSeed(booking.voice.id || booking.laneKey),
          destination: booking.dry || this.ctx.destination,
        });
        if (booking.wet) node.connect(booking.wet);
        this._tngr2OfflineLanes.set(booking.laneKey, { node, context: this.ctx });
        built++;
      } catch (err) {
        // A lane that cannot be built is a lane that renders silence. Say so rather than
        // leaving a gap in the mix that looks like an arrangement decision.
        console.warn(`TNGR-2: offline lane ${booking.laneKey} failed — ${err?.message || err}`);
      }
    }
    return built;
  }

  /**
   * What a lane sends to the mix: its node, or its node through a chorus.
   *
   * CHORUS is a lane effect, not a voice one — one stereo pair for everything the lane
   * plays, and from the same `buildChorusLeg` the native MRDR path uses, so all three are
   * provably running ONE chorus rather than several that resemble each other. Named for
   * the job rather than for TNGR-2 because MRDR-3 AW now calls it too, which is what §7
   * means by keeping the chorus outside the core and shared between backends. The
   * drive is NOT here: it lives in the core, because PLACE is about the voice filter.
   *
   * At mix zero there is no chorus at all — the engine builds nothing, which is what
   * makes MIX the switch and why the three pots behind it grey out.
   */
  _workletChorusOutput(lane, v, time) {
    const spec = v.chorus;
    // No CHORUS control on this voice at all: the lane's node IS its output, and it costs
    // nothing. A voice that HAS the control gets the stage whether or not it is turned
    // up, so winding MIX off zero is a value moving rather than a chain being rebuilt.
    if (!spec || typeof spec !== 'object') return lane.node;
    const stage = {
      input: this.ctx.createGain(), direct: this.ctx.createGain(), output: this.ctx.createGain(),
    };
    lane.node.connect(stage.input);
    stage.input.connect(stage.direct);
    stage.direct.connect(stage.output);
    lane.stage = stage;
    this._updateTngr2Chorus(lane, spec, time);
    return stage.output;
  }

  /**
   * Move a lane's CHORUS to new settings without rebuilding anything.
   *
   * This is _updateMrdrLaneStage for TNGR-2, deliberately the same shape: they are the
   * same four controls off the same shared Effects card, and MRDR-3 has always ramped
   * them where they stand.
   *
   * TNGR-2 used to rebuild instead — the chain was keyed on a JSON of the whole chorus
   * block, so ANY of the four moving tore the lane's node off its output at the next
   * note-on and built a fresh stage, fresh delay lines and a fresh LFO. Dragging a knob
   * therefore cost that on every note: a click as the node was unrouted, an LFO phase
   * jump, the delay lines' contents thrown away — and a chorus leg left running for each
   * one, because only the output gain was ever disconnected. Ramping is inaudible, and
   * the leg the lane already has is the one that keeps playing.
   *
   * Equal power between dry and wet, the same law the layer stage uses, so winding MIX up
   * moves the sound rather than making it louder.
   */
  _updateTngr2Chorus(lane, spec, time) {
    const stage = lane?.stage;
    if (!stage) return;
    const mix = Math.min(1, Math.max(0, Number(spec?.mix) || 0));
    if (!(mix > 0)) {
      // All dry. The leg stays built and silent rather than being torn down: it is one
      // oscillator and two delays, and keeping it is what lets MIX come back up without
      // a rebuild — which is the whole point of this method.
      rampParam(stage.direct.gain, 1, time);
      for (const side of lane.chorus?.sides || []) rampParam(side.level.gain, 0, time);
      return;
    }
    const leg = lane.chorus && !lane.chorus.stopped
      ? lane.chorus : (lane.chorus = buildChorusLeg(this.ctx, spec, time, stage));
    const rate = Math.min(8, Math.max(0.05, spec.rate ?? 0.8));
    const depth = Math.min(1, Math.max(0, spec.depth ?? 0.5));
    const width = Math.min(1, Math.max(0, spec.width ?? 1));
    const wetLevel = Math.sin((mix * Math.PI) / 2) / Math.SQRT2;
    rampParam(stage.direct.gain, Math.cos((mix * Math.PI) / 2), time);
    for (const side of leg.sides || []) {
      rampParam(side.level.gain, wetLevel, time);
      rampParam(side.swing.gain, side.side * depth * CHORUS_SWING_S, time);
      if (side.pan) rampParam(side.pan.pan, side.side * width, time);
    }
    rampParam(leg.osc.frequency, rate, time);
    leg.spec = { ...spec };
  }

  /**
   * Hold a note until its lane exists, then play it.
   *
   * The lane is built once per key — a second note arriving while the first is still
   * waiting joins the queue rather than starting another build. If the build fails there
   * is nothing to fall back to, so the queue is dropped and `warmTngr2Lane` has already
   * said why.
   */
  _queueTngr2(v, laneKey, note) {
    const key = laneKey;
    this._tngr2Pending ||= new Map();
    let pending = this._tngr2Pending.get(key);
    if (!pending) {
      pending = { notes: [], building: false };
      this._tngr2Pending.set(key, pending);
    }
    pending.notes.push(note);
    // A KEY IS DOWN ON A LANE THAT DOES NOT EXIST YET.
    //
    // A held note has no note-off of its own — lifting the key is what ends it — and a
    // queued note has no lane and no event id for a note-off to name. So what goes in the
    // books is the QUEUED NOTE ITSELF: lifting the key marks it cancelled and the flush
    // below drops it, exactly as releasing a live one posts its note-off.
    //
    // Without this, a note-off inside the build window had nothing to find, and every key
    // pressed while the lane warmed came back sounding the moment it resolved, with no
    // finger on it and nothing left that could ever release it. On a glide across the
    // board that is the whole glide, stuck — which is what this is here for.
    if (note.hold) {
      for (const one of (Array.isArray(note.freq) ? note.freq : [note.freq])) {
        if (!(one > 0)) continue;
        const noteKey = `${laneKey}|${one.toFixed(2)}`;
        this._releasePreview(noteKey);
        this._heldNative.set(noteKey, { tngr2Queued: note, at: note.time });
      }
    }
    if (pending.building) return true;
    pending.building = true;
    this.warmTngr2Lane(v, laneKey).then((ok) => {
      const waiting = pending.notes.splice(0);
      this._tngr2Pending.delete(key);
      if (!ok) return;
      // A cancelled note is one whose key came up before the lane arrived. Playing it now
      // would be a note nobody is holding, at a time that has already passed.
      for (const held of waiting) {
        if (held.cancelled) continue;
        this._playTngr2Node(v, { ...held, laneKey });
      }
    }).catch(() => { this._tngr2Pending.delete(key); });
    return true;
  }

  /**
   * Play a note through a lane's persistent worklet node.
   *
   * Offline, the notes are COLLECTED rather than posted, and handed to a node built at
   * the end of the scheduling pass — see `_collectTngr2` and `flushTngr2Offline`. Port
   * delivery is not ordered against `startRendering()`, so posting here would render
   * silence about as often as not (docs/TNGR-2-completion-spec.md §3, finding b).
   */
  _playTngr2Node(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', hold = false }) {
    if (typeof this.ctx?.startRendering === 'function') {
      return this._collectTngr2(v, {
        freq, time, dur, gain, detune, dry, wet, echo, laneKey, hold,
      });
    }
    // Keyed on the LANE alone. A lane is a lane whatever preset is sitting on it, which
    // is what §5 means by one node per {context, lane} — and keying on the preset as well
    // would strand the old node, still connected, every time the sound changed.
    const lane = tngr2LaneNow(this.ctx, laneKey);
    // A lane that has not been built yet builds itself, and this note waits for it.
    //
    // Registering a worklet module is asynchronous and a scheduling pass is not, so the
    // first note on a lane cannot have a node to talk to. It is not dropped: notes are
    // scheduled a quarter-second ahead, so they are queued here and posted the moment the
    // lane resolves, which is comfortably inside that window — and they carry absolute
    // times, so arriving late costs nothing. Without this the first note of every lane
    // would be silent, and with no lane ever warmed, EVERY note would be.
    if (!lane) return this._queueTngr2(v, laneKey, {
      freq, time, dur, gain, detune, dry, wet, echo, hold,
    }, v);
    // The preset as it is NOW — an edit or a preset change since the node was built.
    syncTngr2Patch(lane, tngr2PatchForVoice(v), {
      seed: hashSeed(v.id || laneKey), vibrato: tngr2VibratoOf(v), effects: tngr2EffectsOf(v),
    });
    const notes = Array.isArray(freq) ? freq : [freq];
    const shift = VoiceRack.pitchShift(v) * detune;
    const amp = Math.max(0, Number(gain) || 0);
    if (!(amp > 0) || !notes.some((n) => n > 0)) return false;
    // The lane's output chain, rebuilt when its CHORUS changes. Built once and left
    // alone, turning the chorus up did nothing at all until the song was reloaded —
    // the one effect that is native nodes rather than a number in the patch.
    const chorusKey = JSON.stringify(v.chorus || null);
    // Nothing to attach to means nothing is decided — see the long note on the MRDR-3
    // lane below. A worklet node connected to nothing is not rendered at all, and marking
    // the lane connected anyway is what makes that permanent.
    const canAttach = !!dry || !!(echo && wet);
    if (canAttach && !lane.connected) {
      const out = this._workletChorusOutput(lane, v, time);
      if (dry) out.connect(dry);
      if (echo && wet) out.connect(wet);
      lane.out = out;
      lane.chorusKey = chorusKey;
      lane.connected = true;
    } else if (lane.connected && lane.chorusKey !== chorusKey) {
      if (lane.stage) {
        // Values, ramped where they stand — see _updateTngr2Chorus.
        this._updateTngr2Chorus(lane, v.chorus || {}, time);
        lane.chorusKey = chorusKey;
      } else if (canAttach) {
        // The lane was connected straight through because the voice had no CHORUS block
        // when it was built, and now it has one. That is a chain that has to exist rather
        // than a value that has to move, so it is built once, here, and never again.
        try { lane.node.disconnect(); } catch { /* nothing attached yet */ }
        try { lane.out?.disconnect(); } catch { /* ditto */ }
        const out = this._workletChorusOutput(lane, v, time);
        if (dry) out.connect(dry);
        if (echo && wet) out.connect(wet);
        lane.out = out;
        lane.chorusKey = chorusKey;
      }
      // No destination and no stage: leave the key UNCHANGED so the rebuild is retried
      // on the next note rather than skipped for ever.
    }
    const durationAt = (index) => {
      const raw = Array.isArray(dur) ? (dur[index] ?? dur[0]) : dur;
      return Math.max(0.001, Number(raw) || 0.001);
    };
    let made = false;
    notes.forEach((note, index) => {
      if (!(note > 0)) return;
      const hz = note * shift;
      if (!Number.isFinite(hz) || !(hz > 0)) return;
      // The event id is the note's identity: it is what a note-off refers to, and TWO
      // NOTES ON A LANE MAY NEVER SHARE ONE. A note-off releases a voice carrying its id,
      // so a shared id means one note-off releasing a voice that was already let go while
      // the other note is never released at all — a tone that sustains until the desk is
      // reloaded. It does not need to be an unlikely accident either: the id used to be
      // `ms * 131 + round(hz) * 17 + index`, a LINEAR combination, so any two notes with
      // 131*dms == 17*dhz shared one — a C4 and a C3 seventeen milliseconds apart, among
      // others — and a part that plays the same note twice at once shared one exactly.
      //
      // A counter cannot collide at all, which is the only guarantee worth having here,
      // and it is what the offline path has always used — see `_collectTngr2`. The id was
      // hashed from time and pitch to keep a stem and its mix identical; a per-lane
      // counter keeps that too, because soloing a lane does not change which notes that
      // lane plays or the order it plays them in.
      const eventId = (lane.nextEventId = (lane.nextEventId || 0) + 1);
      tngr2NoteOn(lane, { at: time, hz, velocity: Math.min(1, amp), eventId });
      if (!hold) {
        tngr2NoteOff(lane, { at: time + durationAt(index), eventId });
      } else {
        // A HELD note has no note-off of its own — a key is down, and only lifting it
        // ends the note. So the lane and the event id are written down under the same
        // key `_releasePreview` and `stopPreview` look under, exactly as the pooled and
        // native paths write down their nodes. Without this there is nothing in the
        // books to release and a swept keyboard leaves a note sounding for ever.
        const noteKey = `${laneKey}|${note.toFixed(2)}`;
        this._releasePreview(noteKey);
        // WHEN this note-on lands, and how far ahead of now that was.
        //
        // A preview is scheduled AHEAD: `previewNote` stamps it at currentTime + 0.02 so
        // it lands clear of whatever the sequencer has already queued. The note-off has
        // to be given the SAME lead, or a key held for less than it — which an on-screen
        // keyboard does easily — sends a note-off stamped BEFORE the note-on it ends. The
        // core applies events in frame order, so that one finds no voice to release and
        // the note-on behind it sounds for ever. Carrying the lead across also makes the
        // note as long as the key was actually down, rather than clamping a fast tap to
        // nothing. See `_releasePreview` and `stopPreview`.
        const lead = Math.max(0, time - this.ctx.currentTime);
        // ONE INSTRUMENT, SEVERAL FINGERS — see `fingerDown`. A non-poly lane answers
        // every key on it through ONE voice inside the processor, so the same last-note
        // priority the pooled and native paths keep has to be kept here too, or letting
        // go of the key that is speaking ends a note two other fingers are still on. In
        // POLY every key has a voice of its own and its note-off is simply its own.
        const fingers = (v?.mode || keyMode(v)) !== 'poly' ? this._tngr2Fingers(laneKey) : null;
        this._heldNative.set(noteKey, { tngr2: { lane, eventId, at: time, lead, fingers } });
        if (fingers) fingerDown(fingers, noteKey, hz);
        // The backstop, booked NOW so that nothing has to remember to book it later: a
        // held note is the one kind that has no ending of its own, and every way of
        // ending it — a key coming up, a pointer cancelled, the tab hidden, a MIDI
        // note-off — is something that can fail to arrive. This is the same
        // HOLD_SECONDS the rack's own held voices stop at, and it costs one queued
        // event. Whichever note-off lands first releases the note; the other finds
        // nothing and does nothing.
        tngr2NoteOff(lane, { at: time + HOLD_SECONDS, eventId });
      }
      made = true;
    });
    return made;
  }

  /**
   * MRDR-3 AW: notes to a lane's persistent node.
   *
   * Mirrors `_playTngr2Node`, because the problem is the same one and was solved once. A
   * lane is keyed on the LANE alone — a lane is a lane whatever preset sits on it — and
   * keying on the preset as well would strand the old node, still connected, every time
   * the sound changed.
   */
  _playMrdr3Aw(v, { freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '', hold = false }) {
    const lane = mrdr3LaneNow(this.ctx, laneKey);
    // A lane that has not been built yet builds itself, and this note waits for it.
    //
    // Registering a worklet module is asynchronous and a scheduling pass is not, so the
    // first note on a lane cannot have a node to talk to. It is not dropped: notes are
    // scheduled a quarter-second ahead and carry absolute times, so arriving late costs
    // nothing. Without this the first note of every lane would be silent.
    if (!lane) return this._queueMrdr3(v, laneKey, { freq, time, dur, gain, detune, dry, wet, echo, hold });
    // The preset as it is NOW — an edit or a preset change since the node was built.
    syncMrdr3Patch(lane, v);
    const notes = Array.isArray(freq) ? freq : [freq];
    const shift = VoiceRack.pitchShift(v) * detune;
    const amp = Math.max(0, Number(gain) || 0);
    if (!(amp > 0) || !notes.some((n) => n > 0)) return false;
    // The lane's output chain, rebuilt only when its CHORUS changes — the one effect that
    // is native nodes rather than a number in the patch (§7).
    const chorusKey = JSON.stringify(v.chorus || null);
    // ---- A LANE IS NOT "CONNECTED" IF NOTHING RECEIVED IT ------------------------
    //
    // This block used to tear the lane down first and then set `connected = true`
    // whether or not `dry` or `wet` turned out to exist. One note booked while its
    // destination was momentarily absent therefore left the node wired to NOTHING and
    // the lane marked as wired, so this branch never ran again — `connected` was true
    // and the chorus key matched — and the lane was silent for the rest of the session.
    //
    // A DISCONNECTED AudioWorkletNode IS NOT RENDERED. Nothing pulls it, so `process()`
    // stops being called, which is why the failure has the signature it does rather than
    // looking like a crash: the port still answers, so health reports arrive and say
    // nothing is wrong; `schedule()` still queues, so the backlog climbs without bound;
    // and `late`, `steals` and `groups` freeze at whatever they were, because `applyDue`
    // only runs inside `process`. Measured on barber-7-copy: queued 122 -> 599 over two
    // minutes with late stuck at 38, steals at 55 and groups at 4, faults zero.
    //
    // So: do not rebuild at all unless there is somewhere to attach to. A lane that is
    // already playing keeps its working connection, and one that is not tries again on
    // the next note instead of being marked done.
    // ---- AND "CONNECTED" HAS TO SAY WHAT IT IS CONNECTED TO ---------------------
    //
    // A boolean cannot: the lane's destination is not fixed for the session. A gate is
    // cut and rebuilt when the song is re-banked, a strip is replaced when the desk
    // heals a dead output, and a lane wired to the node that USED to be there is wired
    // to nothing at all — which, for a worklet, is not quiet, it is unrendered. So the
    // pair is written down and compared, the same rule `_pool` already follows: a
    // different dry/wet is a different graph.
    //
    // Re-pointing is not the same as rebuilding. The chorus leg is delay lines and an
    // LFO with a phase, so when only the destination has moved the existing output is
    // moved with it and the stage is left alone.
    const wetDest = echo && wet ? wet : null;
    const dryDest = dry || null;
    const canAttach = !!dryDest || !!wetDest;
    if (canAttach && (!lane.connected || lane.chorusKey !== chorusKey)) {
      if (lane.connected) {
        try { lane.node.disconnect(); } catch { /* nothing attached yet */ }
        try { lane.out?.disconnect(); } catch { /* ditto */ }
      }
      const out = this._workletChorusOutput(lane, v, time);
      if (dryDest) out.connect(dryDest);
      if (wetDest) out.connect(wetDest);
      lane.out = out;
      lane.chorusKey = chorusKey;
      lane.connected = true;
      lane.dryDest = dryDest;
      lane.wetDest = wetDest;
    } else if (canAttach && lane.connected
      && (lane.dryDest !== dryDest || lane.wetDest !== wetDest)) {
      // Whatever piled up while nothing was pulling this node is owed to a moment that
      // has been and gone, and the core drops it on its own — see the stale-event note
      // in `applyDue`. It is NOT panicked from here: a panic clears the whole queue at
      // the frame it lands on, including the note this call is about to book behind it,
      // so recovering the lane that way would cost the note that proved it recovered.
      try { lane.out?.disconnect(); } catch { /* the old destination may be gone */ }
      if (dryDest) lane.out.connect(dryDest);
      if (wetDest) lane.out.connect(wetDest);
      lane.dryDest = dryDest;
      lane.wetDest = wetDest;
    }
    const hzs = notes.filter((n) => n > 0).map((n) => n * shift).filter((n) => Number.isFinite(n) && n > 0);
    if (!hzs.length) return false;
    const durOf = (i) => {
      const raw = Array.isArray(dur) ? (dur[i] ?? dur[0]) : dur;
      return Math.max(0.001, Number(raw) || 0.001);
    };
    // A CHORD IS ONE EVENT with one id — that is how its tones reach the same shaper.
    //
    // A PER-LANE COUNTER, for the reason TNGR-2 already learned the hard way: an id
    // hashed from the time and the pitch is a linear combination, so two notes can wear
    // the same name, and then one note-off releases a voice that was already let go
    // while the other note is never released at all. See the note in the TNGR-2 booking
    // above, and tests/tngr2-queue.js, which greps this file for the old expression.
    // The hash was there to keep a stem and its mix identical; a counter keeps that too,
    // because soloing a lane changes neither which notes it plays nor their order.
    const eventId = (lane.nextEventId = (lane.nextEventId || 0) + 1);
    mrdr3NoteOn(lane, {
      at: time, hz: hzs, velocity: Math.min(1, amp), eventId,
      durSeconds: hold ? HOLD_SECONDS : hzs.map((_, i) => durOf(i)),
    });
    if (hold) {
      // A HELD note has no note-off of its own — a key is down. Written down under the
      // same key `_releasePreview` looks under, or a swept keyboard leaves a note sounding.
      const noteKey = `${laneKey}|${notes[0].toFixed(2)}`;
      this._releasePreview(noteKey);
      this._heldNative.set(noteKey, { mrdr3: { lane, eventId }, at: time });
    }
    return true;
  }

  /** Build a lane for a voice, and say plainly when the context cannot host one. */
  async warmMrdr3Lane(v, laneKey) {
    if (!v || v.synth !== MRDR3_AW) return false;
    if (!canHostMrdr3(this.ctx)) {
      // Almost always an insecure origin: AudioWorklet needs https or localhost, so the
      // LAN dev URL and file:// have no `audioWorklet` at all. The deployed game is https.
      if (!this._mrdrAwWarned) {
        this._mrdrAwWarned = true;
        console.error('MRDR-3 AW cannot play: AudioWorklet needs a secure context '
          + `(https or localhost). This page is ${globalThis.location?.origin || '?'} — `
          + 'AW lanes will be silent here.');
      }
      return false;
    }
    try {
      const lane = await mrdr3Lane(this.ctx, laneKey, { voice: v, voices: VOICES });
      return !!lane;
    } catch (err) {
      console.warn(`MRDR-3 AW: lane ${laneKey} could not be built — ${err?.message || err}`);
      return false;
    }
  }

  /** Hold a note until its lane exists, then play it. One build per key, not per note. */
  _queueMrdr3(v, laneKey, note) {
    this._mrdrAwQueue ||= new Map();
    let queue = this._mrdrAwQueue.get(laneKey);
    if (queue) { queue.notes.push(note); return true; }
    queue = { notes: [note], voice: v };
    this._mrdrAwQueue.set(laneKey, queue);
    this.warmMrdr3Lane(v, laneKey).then((ok) => {
      this._mrdrAwQueue.delete(laneKey);
      if (!ok) return;                      // warmMrdr3Lane has already said why
      for (const queued of queue.notes) {
        this._playMrdr3Aw(v, { ...queued, laneKey });
      }
    });
    return true;
  }

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
    // than playing silence — the same answer `_playDrum` gives.
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
      // measured from. Stated in the panel as a KNDO-5 row for that reason.
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
    // ---- DRIVE, and where it sits ---------------------------------------------
    //
    // The card MRDR-3, TNGR-2, the drawbar organ and the drum panel already carry, on the
    // same three keys: SHAPE picks the curve, DRIVE is how hard, and TONE is the drive's
    // own tone control — the filter that tames the fizz the shaper just added, and the
    // reason both nodes hang off `v.drive` together and neither is built without it. A
    // tone filter left standing alone would be a whole-voice EQ wearing the drive's
    // label, and this panel already has a Filter card for a voice's brightness.
    //
    // PLACE means here what it means on the other two: which side of the voice's own
    // filter and VCA the shaper is on.
    //
    //   POST  osc → [filter] → [amp env] → shaper → [tone] → out     (the default)
    //   PRE   osc → shaper → [tone] → [filter] → [amp env] → out
    //
    // POST is a shaper hearing the envelope, so the grit follows the note down; PRE is a
    // shaper hearing the raw waveform, so the filter cleans up after it. A square through
    // a fold at PRE is a whole other waveform, which is the reason to have the pill.
    //
    // At zero DRIVE nothing at all is built, so a preset that does not name it renders
    // the samples it always did.
    const drivePre = v.drive > 0 && v.drivePlace === 'pre';
    const drivePost = v.drive > 0 && !drivePre;
    const driveInto = (dest) => {
      let into = dest;
      if (v.tone) {
        const tf = this.ctx.createBiquadFilter();
        tf.type = v.tone.type || 'lowpass';
        tf.frequency.value = Math.max(20, v.tone.freq ?? 8000);
        tf.Q.value = v.tone.Q ?? 0.7;
        tf.connect(into); into = tf;
      }
      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this._driveCurve(v.drive, v.shape);
      shaper.connect(into);
      return shaper;
    };

    // ---- CHORUS 2 --------------------------------------------------------------
    //
    // A LANE effect, not a note one: one stereo pair for everything the lane plays, built
    // by the same `_ensureMrdrLaneStage` MRDR-3 and the drawbar organ use, and therefore
    // the same `buildChorusLeg` TNGR-2 builds its own stage from — four synths running
    // ONE chorus rather than four that resemble each other. It is the last box the
    // finished voice goes through, so the echo send is tapped after it, exactly as
    // `_playLayer` taps its own.
    //
    // A voice that HAS the control gets the stage whether or not it is turned up, so
    // winding MIX off zero is a value ramping rather than a chain being rebuilt — the
    // rule `_tngr2Output` states. A voice with no `chorus` block at all never sees a
    // node: the notes connect straight to the strip, as they always have.
    const laneStage = v.chorus && typeof v.chorus === 'object'
      ? this._ensureMrdrLaneStage(laneKey, v.id,
        sectionBypassed(v, 'chorus', v.chorus) ? { ...v, chorus: null } : v, {
          dry, wet, echo, time, preview, scope: preview ? 'preview' : 'song',
        }) : null;
    /** Where a finished note goes: the lane's chorus stage, or the strip itself. */
    const sendTo = (node) => {
      if (laneStage) { node.connect(laneStage.input); return; }
      node.connect(dry);
      if (echo && wet) node.connect(wet);
    };
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
      // `_filterChain` rather than a filter written out here, so this is the same cascade
      // the noise and drum voices already have — same keys, same slopes, one resonant
      // stage and Butterworth behind it — instead of a second one that drifts from it.
      // What this panel no longer writes is that chain's `to`/`sweep` pair: KLNG8 still
      // speaks it, and here the envelope below says the same thing with a sustain and a
      // release. It is built PER NOTE because the envelope starts at note-on, and because
      // KEY FOLLOW has to read this note's own frequency: a chord's tones are struck
      // together, but one filter shared between them would be retriggered by whichever
      // was scheduled last and tuned to whichever was scheduled first.
      //
      // KEY FOLLOW is MRDR-3's own arithmetic, referenced to A2 so a patch voiced at the
      // bottom of the keyboard stays where it was put. `_filterChain` takes it as the
      // per-hit cutoff RATIO — the slot a drum's per-tap tone goes into — so one
      // multiplier carries it and the sweep's destination would move with its origin.
      const fspec = v.filter;
      const track = fspec && fspec.track > 0
        ? ((f * shift) / 110) ** Math.min(1, fspec.track) : 1;
      const chain = fspec ? this._filterChain(fspec, t, track, 'lowpass', 4000) : null;
      if (chain) {
        chain.tail.connect(g);
        // ENV AMOUNT octaves across the cascade, over its own ADSR — the same `filterEnv`
        // the layers and the global stage call, on the same `filter.env` key, so a cutoff
        // envelope means one thing on this panel and on MRDR-3's.
        //
        // This card used to say SWEEP TO and SWEEP TIME: one ramp that arrived and stayed,
        // with no sustain and no release and a second name for a filter envelope. Zero
        // octaves — and an absent `env` — schedule nothing at all, which is why there is
        // no switch on the Filter Env card and why every preset that predates it is
        // untouched.
        filterEnv(chain.stages, fspec.env, t, end);
      }
      // At PRE the shaper and its tone filter go in FRONT of all of that, so the source
      // arrives at them rather than at the filter — see `driveInto`. Built per note like
      // everything else on this path: a chord's tones each get their own, which is what
      // makes them distort as three notes rather than as one summed waveform.
      const head = chain ? chain.head : g;
      const source = drivePre ? driveInto(head) : head;
      const into = (node) => node.connect(source);
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
      //
      // WITH A POST DRIVE the note's own level comes off this envelope and is applied
      // AFTER the shaper instead — the same split `_playDrum` and `_playLayer` make, and
      // for the same reason: a waveshaper is a curve over amplitude, so a quiet note
      // fed into it distorts less than a loud one and the lane fader would double as a
      // drive control. The envelope then runs at the voice's own level (`makeup`, which
      // is the noise waveform's bandwidth compensation and nothing to do with the mix),
      // the shaper always hears the same amplitude, and `out` restores the note gain
      // behind it. Undriven — every preset that predates this card — there is no second
      // node and the envelope carries the gain exactly as it always did.
      const peak = (drivePost ? 1 : gain) * makeup;
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
            at: t,
            params: [{ param: g.gain, e: { release } }], sources: [o],
          });
      }
      // The source is already wired into `g` by the branch above — through the bandpass
      // for noise, directly for an oscillator, and through the tone filter when the
      // preset has one. Connecting it again here would put raw unfiltered noise beside
      // the filtered copy.
      //
      // A POST drive hangs between the envelope and the strip, with the note's own gain
      // on the far side of it — see `peak` above. Everything else goes straight out,
      // which is `sendTo`: the lane's chorus stage when the preset has one, and the
      // channel strip itself when it does not.
      if (drivePost) {
        const out = this.ctx.createGain();
        out.gain.setValueAtTime(gain, t);
        sendTo(out);
        g.connect(driveInto(out));
      } else sendTo(g);
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
      && !!synthClassFor(v.synth, v.options)
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
    // NATIVE ONLY (§10): the cache gate. An AW lane is refused here by identity
    // rather than by any of the conditions below, which is what makes the bypass
    // structural instead of incidental.
    if (!v || v.synth !== MRDR3_NATIVE || !v.layer) return false;
    if (preview || hold) return false;
    if (mode !== 'poly' || v.portamento) return false;
    if (layerVariesWithTime(v)) return false;
    const lfo = v.layer.lfo;
    if (lfo && (lfo.depth ?? 0) > 0 && lfo.sync === 'tempo') return false;
    // Noise layers cache like any other now that `_renderLayerNote` hands the render
    // rack the live rack's seeded buffers — the render produces the same samples the
    // live path would, which the determinism probe proves. The refusal survives only
    // for a rack built without buffers (tests, bare tools), where a noise layer would
    // render as silence and the cache would faithfully replay nothing.
    if (!this.noiseBuf) {
      for (const key of ['osc1', 'osc2', 'osc3']) {
        if (v.layer[key] && v.layer[key].type === 'noise') return false;
      }
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

  beginPreparedNotePlan() {
    const state = this._cacheState;
    const stale = state.queue.filter((job) => job.planId);
    if (stale.length) state.stats.stale += stale.length;
    state.queue = state.queue.filter((job) => !job.planId);
    state.plan = {
      id: (state.plan?.id || 0) + 1, candidates: 0, selected: 0, completed: 0,
      failed: 0, skippedCheap: 0, skippedBudget: 0, selectedBytes: 0,
      totalBenefit: 0, selectedBenefit: 0, pending: 0,
    };
    this._preparedPlan = { id: state.plan.id, candidates: new Map() };
  }

  _layerCacheDescriptor(v, voiceId, notes, dur, detune = 1) {
    const list = Array.isArray(notes) ? notes : [notes];
    const shift = VoiceRack.pitchShift(v) * detune;
    const parts = [];
    let sounded = false;
    let longest = 0;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f == null || !(f > 0)) { parts.push('r'); continue; }
      const noteDur = Array.isArray(dur) ? (dur[i] ?? dur[0]) : dur;
      const hz = f * shift;
      if (!Number.isFinite(hz) || !Number.isFinite(noteDur) || noteDur <= 0) return null;
      parts.push(`${hz.toFixed(2)}:${Math.round(noteDur * 1000)}`);
      longest = Math.max(longest, noteDur);
      sounded = true;
    }
    if (!sounded) return null;
    const rev = this._specRev?.get(voiceId) || 0;
    return {
      // The quality mode is part of the key, not a detail of the render: a note rendered
      // under Full and replayed under Performance would be the one place the two modes
      // mixed inside a single song. See MRDR_QUALITY.
      key: `L|${voiceId}|${rev}|${parts.join(',')}|${this.ctx.sampleRate}|${this.mrdrQuality}`,
      notes: list, dur, detune, longest,
      eventCost: estimateMrdrEventCost(v, list, dur),
      estimatedBytes: Math.ceil(layerNoteSeconds(v, longest, { includeChorus: false })
        * this.ctx.sampleRate * (this._mrdrCacheChannels(v) || 2) * 4),
    };
  }

  _mrdrCacheChannels(v) {
    for (const key of ['osc1', 'osc2', 'osc3']) {
      const s = v?.layer?.[key];
      if (s && (s.stereo ?? 0) > 0 && (s.unison ?? 1) > 1) return 2;
    }
    return 1;
  }

  _recordPreparedMrdr(v, voiceId, notes, dur, detune, priority) {
    const descriptor = this._layerCacheDescriptor(v, voiceId, notes, dur, detune);
    if (!descriptor) return 0;
    const existing = this._noteCache.get(descriptor.key);
    if (existing) {
      existing.preparePriority = Math.max(existing.preparePriority || 0, priority || 0);
      return 0;
    }
    const plan = this._preparedPlan;
    const prior = plan.candidates.get(descriptor.key);
    if (prior) {
      prior.occurrences++;
      prior.latestStep = Math.max(prior.latestStep, priority || 0);
      const bar = Math.floor((priority || 0) / 16);
      prior.barCosts.set(bar, (prior.barCosts.get(bar) || 0) + descriptor.eventCost);
      prior.barCost = Math.max(prior.barCost, prior.barCosts.get(bar));
      prior.priority = Math.max(prior.priority, priority || 0);
    } else {
      const bar = Math.floor((priority || 0) / 16);
      const barCosts = new Map([[bar, descriptor.eventCost]]);
      plan.candidates.set(descriptor.key, {
        ...descriptor, voiceId, occurrences: 1, latestStep: priority || 0,
        barCost: descriptor.eventCost, barCosts, priority: priority || 0,
      });
    }
    return 1;
  }

  commitPreparedNotePlan() {
    const plan = this._preparedPlan;
    if (!plan) return this.noteCacheHealth();
    const state = this._cacheState;
    const candidates = [...plan.candidates.values()];
    const totalBenefit = candidates.reduce((sum, c) => sum + c.eventCost * c.occurrences, 0);
    let available = NOTE_CACHE_PLAN_BYTES;
    const selected = [];
    const rank = (c) => {
      if (c.eventCost >= MRDR_PLAN_HEAVY && c.occurrences >= 2) return 0;
      if (c.eventCost >= MRDR_PLAN_HEAVY) return 1;
      if (c.eventCost * c.occurrences >= MRDR_PLAN_REPEAT) return 2;
      if (c.eventCost >= 6 && c.barCost >= MRDR_PLAN_DENSE_BAR) return 3;
      return 99;
    };
    candidates.sort((a, b) => rank(a) - rank(b)
      || (b.eventCost * b.occurrences) - (a.eventCost * a.occurrences)
      || b.barCost - a.barCost || b.latestStep - a.latestStep);
    for (const candidate of candidates) {
      const tier = rank(candidate);
      if (tier === 99) { state.plan.skippedCheap++; continue; }
      const hit = this._noteCache.get(candidate.key);
      const already = !!hit && (hit.buffer || hit.rendering);
      if (!already && candidate.estimatedBytes > available) {
        state.plan.skippedBudget++;
        continue;
      }
      if (!already) available -= candidate.estimatedBytes;
      const entry = this._layerCacheEntry(
        VOICES[candidate.voiceId], candidate.voiceId, candidate.notes, candidate.dur, candidate.detune,
      );
      if (!entry) continue;
      entry.preparePriority = candidate.priority;
      entry.planId = plan.id;
      entry.planSelected = true;
      for (const job of state.queue) {
        if (job.entry === entry) {
          job.planId = plan.id;
          job.planPriority = candidate.priority;
        }
      }
      selected.push(candidate);
      state.plan.selected++;
      state.plan.selectedBytes += already ? 0 : candidate.estimatedBytes;
      state.plan.selectedBenefit += candidate.eventCost * candidate.occurrences;
    }
    state.plan.candidates = candidates.length;
    state.plan.totalBenefit = totalBenefit;
    state.plan.pending = state.queue.filter((job) => job.planId === plan.id).length;
    state.queue.sort((a, b) => (b.planPriority || b.entry?.preparePriority || 0)
      - (a.planPriority || a.entry?.preparePriority || 0));
    this._preparedPlan = null;
    return this.noteCacheHealth();
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
    // ---- AND NOT AT ALL WHILE THE WORKLET IS THE BACKEND -----------------------
    //
    // An AW lane uses no note cache, by construction: `play` dispatches on the identity
    // and the AW branch never consults one. So an entry prepared for an MRDR-3 voice
    // while the switch is on worklet is a render whose buffer nothing can ever read —
    // which the desk's diagnostics showed as 102 misses against zero hits, the whole
    // trickle working for nothing beside a song that was not using it.
    if (v.synth === MRDR3_NATIVE && mrdrComparisonVoice(v)?.synth === MRDR3_AW) return 0;
    if (v.synth === MRDR3_NATIVE) {   // NATIVE ONLY (§10) — cache entry
      if (!this._cacheableLayer(v, v.mode || keyMode(v), false, false)) return 0;
      const notes = Array.isArray(freq) ? freq : [freq];
      if (this._preparedPlan) return this._recordPreparedMrdr(v, voiceId, notes, dur, detune, priority);
      mark(this._layerCacheEntry(v, voiceId, notes, dur, detune));
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
    // Tagged only while the URGENT WALK is running, which is a synchronous loop — so
    // this credits the repair with the jobs it actually created, and not with the
    // ordinary scheduler misses that happen to land in the same few seconds. Both render
    // paths reach the queue here, so one place is enough.
    if (state.urgentTagging) {
      job.urgent = true;
      state.stats.urgentQueued++;
    }
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
      generation: entry.generation, planId: entry.planId || 0,
      planPriority: entry.preparePriority || 0, run: job });
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
  _playCachedLayer(v, voiceId, notes, {
    time, dur, gain, detune, dry, wet, echo, laneKey = '', preview = false, laneEffects = true,
  }) {
    const ctx = this.ctx;
    // An offline render must synthesise, not replay: a bounce is the reference for
    // what the song IS, and a cache miss inside one would put a rendered note beside
    // a live one and call them the same file.
    if (typeof ctx.startRendering === 'function') return false;
    const entry = this._layerCacheEntry(v, voiceId, notes, dur, detune);
    if (!entry?.buffer) return false;
    const laneStage = laneEffects
      ? this._ensureMrdrLaneStage(laneKey, voiceId, v, {
        dry, wet, echo, time, preview, scope: preview ? 'preview' : 'song',
      }) : null;
    const src = ctx.createBufferSource();
    src.buffer = entry.buffer;
    const g = ctx.createGain();
      // Rendered at unity, scaled here: one buffer serves every level the song asks for.
      g.gain.value = gain;
      src.connect(g);
      if (laneStage) g.connect(laneStage.input);
      else {
        g.connect(dry);
        if (echo && wet) g.connect(wet);
      }
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
    const descriptor = this._layerCacheDescriptor(v, voiceId, notes, dur, detune);
    if (!descriptor) return null;
    const key = descriptor.key;
    const hit = this._noteCache.get(key);
    if (hit) {
      this._noteCache.delete(key);
      this._noteCache.set(key, hit);
      if (hit.buffer) state.stats.hits++;
      return hit;
    }
    const entry = { key, voiceId, revision: this._specRev?.get(voiceId) || 0,
      generation: state.generation,
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
   * carries a per-oscillator `stereo` spread. Internal chorus is deliberately outside
   * this buffer and is supplied by the persistent lane stage at replay, while a
   * mono render would still collapse unison width silently. Most presets are mono all
   * the same, so
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
        const seconds = Math.min(30, layerNoteSeconds(v, longest, { includeChorus: false }));
        const ctx = new OAC(2, Math.ceil(seconds * sr), sr);
        // The LIVE rack's seeded noise buffers, handed to the render rack. They are what
        // lets a noise layer be cached at all: the render must produce the same samples
        // the live path would, and the live path's noise is the seeded buffer, not a
        // fresh random one. Same-context AudioBuffers are readable by any context at the
        // same sample rate, and this render is at the live rate by construction.
        const rack = new VoiceRack(ctx, this.noiseBuf, this.longBuf);
        // The render rack is a fresh one, so it starts at Full. The cache has to render
        // what the DESK is playing, or a cached note and a live note of the same preset
        // would be two different sounds — see the key, which carries the mode.
        rack.setMrdrQuality(this.mrdrQuality);
        const out = ctx.createGain();
        out.connect(ctx.destination);
        // The song warp folded in and the preset's own transpose left alone, because
        // `play` applies `pitchShift` on the way in and would otherwise apply it twice.
        // No `spb`: a tempo-synced LFO is refused by the gate, so there is no rate here
        // that could want one.
        const warped = notes.map((f) => (f > 0 ? f * detune : f));
        const played = rack.play('bass', voiceId, warped, {
          time: 0, dur, gain: 1, dry: out, wet: null, echo: false,
          laneEffects: false,
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
      generation: entry.generation, planId: entry.planId || 0,
      planPriority: entry.preparePriority || 0, run: job });
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

  /**
   * Build a realtime pool before the scheduler reaches its first note.
   *
   * The ordinary Tone voices are intentionally lazy during normal playback, but the
   * first construction can be large enough to consume the scheduler's lookahead. A
   * stopped-state warm-up calls this for the opening bars, so the first audible pass
   * does not pay that one-time graph cost at a bar boundary. Per-note voices are left
   * alone: they have no reusable pool to build here and their own warm-up paths are
   * asynchronous or note-specific.
   */
  prepareRealtimeVoice(laneKey, voiceId, dry, wet, echo = true, want = 1) {
    const v = mrdrComparisonVoice(VOICES[voiceId]);
    if (!v || v.kind === 'drum' || v.synth === 'TNGR-2'
      || isMrdrVoice(v) || synthFamily(v.synth) === KNDO5
      || synthFamily(v.synth) === WNDR9) return false;
    if (!synthClassFor(v.synth, v.options)) return false;
    const mode = v.mode || keyMode(v);
    this._pool(laneKey, voiceId, dry, wet, echo,
      mode === 'poly' ? Math.max(1, want) : 1, false);
    return true;
  }

  /**
   * Which instance of a POLY pool plays the next note.
   *
   * Round robin for a sequenced note, which is what it has always been: notes have
   * lengths, slots come free, and sharing a couple of them is why a pool is a pool.
   *
   * A HELD note asks a different question. Its slot is not free until a finger says so,
   * so a key looks for one nobody is holding first and only falls back to the robin when
   * every slot in the pool is under a finger — the polyphony cap, where the oldest note
   * is the one that gives way.
   */
  _slotFor(pool, hold) {
    if (hold) {
      const free = pool.slots.find((s) => !s.fingers?.length);
      if (free) return free;
    }
    const slot = pool.slots[pool.next % pool.slots.length];
    pool.next++;
    return slot;
  }

  /** One more instance of this pool's preset, wired to the same strip. */
  _addSlot(pool, dry, wet, echo) {
    const Ctor = synthClassFor(pool.spec.synth, pool.spec.opts);
    {
      const { opts, vibrato } = pool.spec;
      const synth = new Ctor(Object.keys(opts).length
        // Cloned per slot: Tone mutates the bag it is handed, and two slots sharing
        // one object would have the first synth's edits arrive in the second.
        ? JSON.parse(JSON.stringify(opts))
        : undefined);
      const out = this.ctx.createGain();
      // Silent until a note sets its level at that note's time. A slot that has
      // never played must not pass the synth's own idle output — a modulator that
      // free-runs in the pool does so whether or not anything triggered it.
      out.gain.value = 0;
      // Per-voice vibrato, when the preset asks for one. The desk already has a
      // vibrato INSERT, and that is the right tool for "this channel wobbles" — this
      // is for when the wobble belongs to the sound itself and should follow the
      // preset onto any lane and into any song. It reaches every pooled class now:
      // DuoSynth carried Tone's own LFO and was the one exception, and it is retired.
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
  _filterChain(spec, t, mul = 1, dfltType = 'bandpass', dfltFreq = 2600, maxStages = 4) {
    const ctx = this.ctx;
    // `maxStages` is how MRDR-3's Performance mode buys back a filter: only its two
    // callers pass it, so a drum's -48 dB highpass keeps all four biquads whatever the
    // mode says. Default 4 leaves every other caller exactly as it was.
    const stages = Math.min(maxStages, spec.slope === -48 ? 4 : spec.slope === -24 ? 2 : 1);
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
   * A KLNG8 voice: the Microtonic construction — one oscillator and one noise
   * generator, each with its own envelope, summed and optionally driven into a
   * waveshaper. It absorbed the old noise path, which grew from the engine's snare and
   * stopped at "a burst with a thump under it" — the same construction stated in fewer
   * words. This is the general form of it, a drum designed as independent sources:
   *
   *   osc    a pitched section: waveform, a pitch envelope (`from` falling to `to`
   *          over `sweep` seconds, in the shape `pitchCurve` names — see `pitchRamp`),
   *          and an amp envelope of its own
   *   osc2   a second one, the same section in every key — the two tuned oscillators
   *          an 808 snare is, the detuned pair a Simmons tom is
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
   * One-shots: native nodes, never pooled, deterministic offline because the only
   * noise in it is the seeded buffer.
   */
  _playDrum(v, {
    time, gain, dry, wet, echo, monoGroup = null, laneKey = '', voiceId = '', preview = false,
  }) {
    const ctx = this.ctx;
    const o = v.osc;
    // THE SECOND BODY. An 808 snare is two tuned oscillators under its noise, a Simmons
    // tom is two detuned sines with different sweeps, and a 909 kick is a body plus a
    // separately tuned click — none of which one oscillator and a fixed `knock` can say.
    // It is the SAME section as `osc`, every key and every default, built by the same
    // closure: a control that means one thing on the first oscillator cannot mean
    // another on the second. Absent by default, so every preset written before it
    // renders sample-identically.
    const o2 = v.osc2;
    const n = v.noise;
    const r = v.ring;
    const m = v.metal;
    // The CHOKE, and the reason a closed hat can shut an open one: whatever this group
    // is still ringing gets released at the instant this hit starts. The map is the
    // rack's and is shared with the pooled Tone path, so a group can span both — which
    // is what the arcade kit needs, its snare here and its crash a Tone voice.
    // Drums are polyphonic one-shots by default: each hit builds its own native graph.
    // MONO is an opt-in voice setting, scoped to this lane and preset so turning it on
    // for a long open hat does not make an unrelated lane disappear. Arrangement/KIT
    // choke groups arrive already resolved in `monoGroup` and retain precedence.
    const drumMode = v?.mode === 'mono' ? 'mono' : 'poly';
    const ownGroup = drumMode === 'mono'
      ? `voice:${laneKey || voiceId}:${voiceId}|${preview ? 'preview' : 'live'}` : null;
    const groupKey = monoGroup || ownGroup;
    const previous = groupKey ? this._monoGroups.get(groupKey) : null;
    if (previous) {
      if (previous.release) previous.release(time);
      else if (previous.slot && previous.pool && !previous.pool.gone) {
        try { previous.slot.synth.triggerRelease(time); } catch { /* already quiet */ }
      }
    }
    // What a later hit in this group will fade and stop. `outs` is the per-tap SUMMING
    // node — everything this voice builds passes through one of them, after the shaper —
    // so the choke is a handful of gains rather than a walk over every section. Fading
    // there and not in front of the shaper matters: a fade the waveshaper then sees is a
    // tail that distorts on its way out.
    const outs = [];
    // Stopped as well as faded. A choked crash otherwise leaves its six metal partials
    // running to whatever stop time they were scheduled for, which is CPU spent on
    // silence — and on a 6-second cymbal that is most of the hit.
    const sources = [];
    // A KLNG8 tune is a master pitch offset, not another pitch envelope.  Keep it
    // outside the tap bend so +12 semitones doubles every pitched source while each tap
    // still keeps its authored detune relationship.  Zero is deliberately neutral for
    // every existing preset, which predates this optional key.
    const tune = 2 ** ((v.tune ?? 0) / 12);
    if (!o && !o2 && !n && !r && !m && !(v.knock > 0)) return false;
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

    // The 808 cowbell is the one native drum recipe with a specified VCA floor and
    // exact source lifetime. Keep this separate from `env`, whose ordinary -80 dB
    // tail and scheduling pad are still the right semantics for the rest of KLNG8.
    const hardwareEnv = (param, t, level, spec, dflt = 0.2) => {
      const attack = spec.attack ?? 0;
      const decay = spec.decay ?? dflt;
      const hold = spec.hold ?? 0;
      const floor = Math.max(1e-6, spec.floor ?? 0.001);
      const lvl = Math.max(floor, level);
      const from = t + attack + hold;
      const end = from + decay;
      if (attack === 0) param.setValueAtTime(lvl, t);
      else {
        param.setValueAtTime(floor, t);
        param.linearRampToValueAtTime(lvl, from);
      }
      if (hold > 0) param.setValueAtTime(lvl, t + attack + hold);
      // Leave one sample for the authored floor, then cut to absolute zero at the
      // exact envelope end. The oscillator is stopped at the same instant below.
      const floorAt = Math.max(from, end - 1 / ctx.sampleRate);
      if (floorAt > from) param.exponentialRampToValueAtTime(floor, floorAt);
      param.linearRampToValueAtTime(0, end);
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
      outs.push(out);
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

      // ---- a pitched body ---------------------------------------------------
      //
      // ONE closure for BOTH oscillators, and that is the point of it rather than a
      // saving: `osc` and `osc2` are the same section, so FREQUENCY, AMOUNT, RATE CURVE,
      // SAG and the modulator have to mean exactly the same thing on each. Two blocks
      // that started identical are two blocks that drift, and the first key one of them
      // grew alone would be a pot on one card that does nothing on the card beside it.
      //
      // Returns its OWN length rather than reading the running `len`: the modulator is
      // stopped against the oscillator it bends, and against the running maximum the
      // second oscillator's modulator would be held open for as long as the first
      // oscillator's tail — audible as nothing, and paid for on every hit.
      const buildOsc = (spec) => {
        const osc = ctx.createOscillator();
        osc.type = spec.type || 'sine';
        const from = (spec.from ?? 190) * tune * bend;
        const to = (spec.to ?? 52) * tune * bend;
        osc.frequency.setValueAtTime(from, t);
        // `pitchCurve`, not `curve` — `curve` on this section is its AMP envelope's, and
        // the two are genuinely separate choices: a kick can snap in pitch while its
        // level falls exponentially, which is most kicks.
        if (to !== from) pitchRamp(osc.frequency, to, t, spec.sweep ?? 0.07, spec.pitchCurve);
        const g = ctx.createGain();
        const oscLen = env(g.gain, t, spec.gain ?? 1, spec, 0.35);
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
        if (spec.fm && (spec.fm.index ?? 1) > 0) {
          const mod = ctx.createOscillator();
          mod.type = spec.fm.type || 'sine';
          mod.frequency.value = from * (spec.fm.ratio ?? 1.4);
          const mg = ctx.createGain();
          // Depth in HERTZ, stated as a multiple of the carrier: at an index of 1 the
          // modulator swings the carrier by its own starting frequency either way, so
          // the number means the same thing on a 50 Hz kick and a 2 kHz rim.
          env(mg.gain, t, from * (spec.fm.index ?? 1), spec.fm, spec.decay ?? 0.35);
          mod.connect(mg); mg.connect(osc.frequency);
          mod.start(t); mod.stop(t + oscLen + 0.03);
          sources.push(mod);
        }
        osc.connect(g); g.connect(into);
        osc.start(t); osc.stop(t + oscLen + 0.03);
        sources.push(osc);
        return oscLen;
      };

      let len = 0;
      if (o) len = Math.max(len, buildOsc(o));
      if (o2) len = Math.max(len, buildOsc(o2));
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
      // Gated on the FIRST oscillator, not on either: the knock is a fixed 300 Hz
      // punch under a body, and `osc2` is a body you can put wherever you want one —
      // a preset with only a second oscillator has already chosen the better tool.
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
        sources.push(k);
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
        sources.push(src);
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
        sources.push(src);
      }
      // ---- the metal cluster ------------------------------------------------
      //
      // Six squares at inharmonic ratios through a highpass: the 808's cymbal circuit,
      // and the only thing here that makes a sound filtered noise cannot. Tone's
      // MetalSynth was the same idea with the ratios welded shut and an FM operator per
      // oscillator; this is cheaper per hit and the ratios are a preset's to choose,
      // which is what turns one cymbal into a family of them — and what retired it.
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
        const mlen = m.hardStop
          ? hardwareEnv(g.gain, t, m.gain ?? 1, m, 0.2)
          : env(g.gain, t, m.gain ?? 1, m, 0.2);
        len = Math.max(len, mlen);
        const resonator = m.resonator;
        let metalOut = chain.tail;
        if (resonator) {
          // The extra tail is a short, controlled feedback loop around the bandpass,
          // not a room effect. One-sample delay makes the Web Audio graph
          // legal; near-unity return supplies the slight under-damping that a bare
          // BiquadFilterNode cannot provide on its own.
          const sat = ctx.createWaveShaper();
          const drive = Math.max(1, resonator.drive ?? 1.4);
          const curve = new Float32Array(1025);
          for (let k = 0; k < curve.length; k++) {
            const x = (k / (curve.length - 1)) * 2 - 1;
            curve[k] = Math.tanh(x * drive);
          }
          sat.curve = curve;
          chain.tail.connect(sat);

          const delay = ctx.createDelay(0.05);
          delay.delayTime.setValueAtTime(1 / ctx.sampleRate, t);
          const feedback = ctx.createGain();
          const amount = Math.min(0.995, Math.max(0, resonator.feedback ?? 0.96));
          feedback.gain.setValueAtTime(amount, t);
          feedback.gain.linearRampToValueAtTime(0, t + mlen);
          sat.connect(delay); delay.connect(feedback); feedback.connect(chain.head);
          metalOut = sat;

          // Leakage is the seeded rack noise, so the analog air is present without
          // making WAV/stem exports nondeterministic. It is stopped with the authored
          // one-shot lifecycle and remains deliberately below the resonator signal.
          const leak = resonator.leak ?? 0.0005;
          if (leak > 0 && this.noiseBuf) {
            const src = ctx.createBufferSource();
            src.buffer = this._noise(resonator.color, false);
            src.loop = true;
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(leak, t);
            src.connect(ng); ng.connect(chain.head);
            src.start(t); src.stop(t + mlen);
            sources.push(src);
          }
        }
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
              Math.max(20, m.to * tune * bend * at), t + (m.sweep ?? 0.07),
            );
          }
          osc.connect(chain.head);
          // Ordinary metal sources get a small scheduling pad so their final sample is
          // not cut during a normal exponential tail. A specified one-shot lifecycle
          // owns its exact stop time instead — the 808 cowbell ends at T0 + 200ms.
          osc.start(t); osc.stop(t + mlen + (m.hardStop ? 0 : 0.03));
          sources.push(osc);
        }
        metalOut.connect(g); g.connect(into);
      }
    }
    // Leave the handle the NEXT hit in this group will pull. Same shape the pooled path
    // registers, so a group can span both and neither has to know which built the other.
    if (groupKey) {
      this._monoGroups.set(groupKey, {
        release: (at) => {
          for (const g of outs) {
            try {
              // Hold whatever the level had reached before ramping off it. Without the
              // hold, cancelling would restore the value the last event set and the
              // choke would start from a jump.
              if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(at);
              else g.gain.cancelScheduledValues(at);
              // Two milliseconds: fast enough to read as a stop, long enough to have
              // no edge in it. A hard gate here is a click.
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
   * Like `_playDrum`: native nodes, one-shot, never pooled. More deterministic than it,
   * in fact, because there is no noise in it at all.
   */
  _playAdditive(v, {
    freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '',
    preview = false, hold = preview, laneEffects = true,
  }) {
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

    // ---- the drive, and the lane's chorus ------------------------------------
    //
    // MRDR-3's Effects card on MRDR-3's keys, because it is MRDR-3's stage: SHAPE, DRIVE
    // and TONE build one shaper with one tone filter hanging off it — the same pair
    // `driveInto` builds in `_playLayer` and `_playDrum`, so the three panels are
    // provably one control rather than three that look alike — and CHORUS is the same
    // lane insert, off the same `buildChorusLeg`, as MRDR-3 and TNGR-2 run. A combo organ
    // is a drawbar stack through a driven amp and a chorus, and this path could say the
    // stack and neither of the other two.
    //
    // NO PLACE PILL AND NO `drivePlace` READ. Pre or post is only a question where there
    // is a filter to be pre or post OF: MRDR-3 has its Global Filter, TNGR-2 has its
    // voice filter, and a drawbar stack has neither. The shaper sits between the partials
    // and the note's level, which is the one place it can be — see `stackIn` below for
    // why that order and not the other.
    //
    // TONE takes no humanise multiplier, unlike `_playLayer`'s: this synth's Humanise card
    // is LEVEL and PITCH (see `ADDITIVE_HUMANISE_GROUP`), and a variation read here would
    // be a control that exists in the engine and nowhere on screen.
    const driveInto = (dest) => {
      if (!(v.drive > 0)) return dest;
      let into = dest;
      if (v.tone) {
        const tf = ctx.createBiquadFilter();
        tf.type = v.tone.type || 'lowpass';
        tf.frequency.value = Math.max(20, v.tone.freq ?? 8000);
        tf.Q.value = v.tone.Q ?? 0.7;
        tf.connect(into); into = tf;
      }
      const shaper = ctx.createWaveShaper();
      shaper.curve = this._driveCurve(v.drive, v.shape);
      shaper.connect(into); into = shaper;
      return into;
    };
    // The lane bus, kept standing even at MIX zero: three unity gains, so winding the
    // chorus up reaches notes that are ALREADY SOUNDING through the route that is already
    // there rather than at the next note-on — the bargain `_playLayer` makes for the same
    // reason, and why `refresh` can ramp a standing stage. A section switched OFF in the
    // editor is authoritative over any value retained beside it.
    //
    // `laneEffects: false` is the offline/cache caller asking for the pre-chorus signal;
    // it gets the direct dry/wet routing this path has always had, byte for byte.
    const laneStage = laneEffects
      ? this._ensureMrdrLaneStage(laneKey, v.id,
        sectionBypassed(v, 'chorus', v.chorus) ? { ...v, chorus: null } : v, {
          dry, wet, echo: echo && a.echo !== false, time, preview,
          scope: preview ? 'preview' : 'song',
        })
      : null;

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
      // that decides whether this hit reaches the echo. Every partial lands inside it —
      // through the DRIVE, when the preset has one, which is why `stackIn` and not `out`
      // is what a partial connects to. A shaper is not linear, so the note's level has to
      // sit AFTER it: in front, how hard a preset drives would depend on how loud the note
      // was asked to play, and the same patch would distort differently on every lane.
      // The same ordering `_playDrum` and `_playLayer` use, for the same reason.
      const out = ctx.createGain();
      out.gain.value = gain * fade;
      if (laneStage) out.connect(laneStage.input);
      else {
        out.connect(dry);
        if (echo && wet && a.echo !== false) out.connect(wet);
      }
      const stackIn = driveInto(out);
      // The percussion register is always dry, so it needs a bus of its own — built only
      // if a preset actually pulls it. See below for why it is kept out of the echo; it
      // stays out of the CHORUS with it, and for the same reason. The pip is the dry stab
      // this synth keeps crisp, and a box the finished voice goes through is not one the
      // pip goes through on its way round.
      //
      // It does take the drive: an organ through a driven amp drives all of it. Its own
      // shaper rather than the stack's, because by the time the pip exists it is on its
      // own bus — same curve, same tone filter, one signal each.
      let perc = null;
      let percIn = null;
      const percBus = () => {
        if (!perc) {
          perc = ctx.createGain();
          perc.gain.value = gain * fade;
          perc.connect(dry);
          percIn = driveInto(perc);
        }
        return percIn;
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
        // The pitch envelope's span, which is the AMP gate's span — see `gateAdsr` below.
        // A held note bends over the same thirty seconds its level does, so a finger on
        // the key does not leave the registration halfway into its swoop.
        const pEnd = stackHolds ? t + HOLD_SECONDS : end;
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
          o.frequency.setValueAtTime(partial, t);
          // The whole registration bends together, each partial keeping its ratio — which
          // is what `organSwoop` is, and what stops a glide sounding like a chord sliding
          // apart.
          //
          // MRDR-3's and KNDO-5's pitch envelope, on their key names, because it is the
          // same idea: how far from the written note the stack starts, and how it gets
          // there. This card used to say FROM 0.7492x and TO 1x over a SWEEP TIME, which
          // is an envelope written as two multipliers and a time — the exact form MRDR-3's
          // own card was converted away from, and the one place on the desk still stating
          // pitch as a ratio.
          //
          // On `.detune` in cents rather than on `.frequency`, so it SUMS with the vibrato
          // connected to the same param a few lines down instead of fighting it for the
          // one automation slot. Linear in cents is exponential in hertz, so the travel is
          // the same curve `pitchRamp`'s default already drew.
          if (p) pitchEnv([o.detune], p, t, pEnd);
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
          o.connect(g); g.connect(stackIn);
          o.start(t); o.stop(off + 0.01);
          lastOff = Math.max(lastOff, off + 0.01);
        }
        if (stackHolds && heldParams.length) {
          const noteKey = `${laneKey}|${f.toFixed(2)}`;
          this._releasePreview(noteKey);
          sharedMods.holds += 1;
          this._heldNative.set(noteKey, {
            at: t, params: heldParams, sources: heldSources, shared: sharedMods,
          });
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
   * be `noise`: KNDO-5's pitched noise, built in the unison loop below. This is what the hand-written
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
    this._retargetLayerPitch(prev, base, time, v.portamento || 0);
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
   * Move a sounding native graph to a different note, and nothing else.
   *
   * The pitch half of the LEGATO hand-over, on its own because it is also the whole of
   * what a note-off does when it gives the note back to a key that is still down — there
   * the envelopes must be left alone, not re-armed at some new note's end.
   *
   * Every unison voice and every layer at once, each keeping its own `ratio`, which is
   * what stops a detuned stack sliding apart on the way.
   */
  _retargetLayerPitch(record, base, time, glide = 0) {
    for (const { pitches, ratio } of record.pitchSets || []) {
      const target = base * ratio;
      for (const pitch of pitches) {
        try {
          if (pitch.cancelAndHoldAtTime) pitch.cancelAndHoldAtTime(time);
          else pitch.cancelScheduledValues(time);
          if (glide > 0) pitchRamp(pitch, target, time, Math.max(0.001, glide));
          else pitch.setValueAtTime(target, time);
        } catch { /* the old graph may already have ended */ }
      }
    }
    record.freq = base;
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

  _playLayer(v, {
    freq, time, dur, gain, detune = 1, dry, wet, echo = true, laneKey = '',
    preview = false, hold = preview, spb = null, laneEffects = true,
  }) {
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
    const tailPlan = this._recordMrdrTailOpportunity(v, { notes, dur, time, preview, hold, mode });
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
    // Keep a cheap lane bus even when chorus mix is zero. That lets a chorus edit reach
    // a sounding note through the standing route; cache renders explicitly bypass it.
    const laneStage = laneEffects
      ? this._ensureMrdrLaneStage(laneKey, v.id,
        held('chorus', v.chorus) ? { ...v, chorus: null } : v, {
        dry, wet, echo, time, preview, scope: preview ? 'preview' : 'song',
      }) : null;

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
    // The ensemble's seed: the note's own time when jitter is on (a different section
    // every occurrence), a fixed time when it is off (the same section every time —
    // which is what lets the note cache take these presets at all).
    const ensembleTime = MRDR_ENSEMBLE_JITTER ? time : ENSEMBLE_FIXED_TIME;
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
        lfo.frequency.setValueAtTime(rate * vary(vibSpread * 0.1, ensembleTime, 911 + key), time);
        lfo.setPeriodicWave(phasedWave(ctx, vib.type, hitRandom(ensembleTime, 977 + key) * 2 * Math.PI * vibSpread));
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
      const base = f * shift * ensembleVary((v.humanize || {}).pitch, time, 16);
      this._retargetLayerLegato(prev, base, time, noteDur, v, hold);
      // The new key owns the note now — LAST NOTE PRIORITY, which is what a mono synth
      // does and what the retarget already did to the pitch. Without the hand-over the
      // release record stayed under the FIRST key: letting go of the key you are actually
      // holding did nothing, and letting go of the one you had left behind cut the note.
      if (hold) {
        const key = `${laneKey}|${f.toFixed(2)}`;
        this._rekeyHeldNote(prev, key);
        // ...and the keys UNDER the one holding it, so that letting this one go gives the
        // note back to them instead of ending it. See `fingerDown`.
        prev.glide = glideTime(v);
        fingerDown(prev, key, base);
      }
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
      const fade = ensembleVary(hum.gain, time, 0);
      const bend = ensembleVary(hum.pitch, time, 16);
      const toneMul = ensembleVary(hum.filter, time, 32);
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

      // One chain per note-on, built on demand: shaper → tone → trem → lane bus → out.
      // Cache renders pass laneEffects=false and therefore stop at the pre-chorus bus.
      let chain = null;
      const chainFor = () => {
        if (chain) return chain;
        const out = ctx.createGain();
        out.gain.value = gain * fade;
        if (tailPlan) out.gain.linearRampToValueAtTime(0, tailPlan.cullAt);
        if (laneStage) out.connect(laneStage.input);
        else {
          out.connect(dry);
          if (echo && wet) out.connect(wet);
        }
        allOuts.push(out);
        let into = out;
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
              t, track * toneMul, 'lowpass', 1150, this._filterStageCap(),
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
              at: t,
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
          // `noise` is a waveform here exactly as it is on KNDO-5: the seeded
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
              lt, track * toneMul, 'lowpass', 1150, this._filterStageCap(),
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
          // The unison stack, capped by the quality mode as well as by MAX_UNISON. The
          // spread and the stereo placement below are computed from THIS count, so a
          // capped stack still reaches both outer positions and the centre — it thins the
          // stack rather than narrowing it, which is the difference between a smaller
          // ensemble and a mono one. See MRDR_QUALITY.
          const count = Math.min(clampUnison(spec.unison), this._unisonCap());
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
              // OPTIONAL, because `syncMaster` is `L.osc1` and a layer stack need not have
              // one. Every other read of it sits behind `hardSynced`, which already
              // requires it — this one did not, so a voice built from osc2 and osc3 alone
              // threw inside the SCHEDULING PASS, which does not just lose the note: it
              // takes every note after it on that lane for as long as the song is up.
              // Found while rendering one layer of a preset in isolation.
              const masterRatio = Math.max(0.01, syncMaster?.ratio ?? 1);
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
            const late = entry > 0
              ? hitRandom(MRDR_ENSEMBLE_JITTER ? t : ENSEMBLE_FIXED_TIME, 1013 + u) * entry : 0;
            for (const src of sources) {
              const ownStart = sourceStarts.get(src);
              src.start(ownStart ?? (lt + late));
              const ownEnd = sourceEnds.get(src);
              const naturalStop = ownEnd ?? (off + 0.01);
              src.stop(tailPlan ? Math.min(naturalStop, tailPlan.cullAt + STOP_FADE) : naturalStop);
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
      const record = {
        freq: lastBase, outs: allOuts, pitchSets, envelopes: legatoEnvelopes,
        gates: legatoGates, sources: legatoSources, gateUntil, gateKey, stopAt: lastOff,
        // MONO builds a NEW graph per note and this record replaces the one before it,
        // but the fingers do not belong to the graph — they belong to the lane, and the
        // keys still down when this note was struck are still down after it. Carried
        // across, or the fall-back would only ever find the note it was leaving.
        fingers: prev?.fingers || [], glide: glideTime(v),
      };
      if (hold && gateKey) fingerDown(record, gateKey, lastBase);
      this._last.set(glideKey, record);
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
    if (lastOff) {
      sharedMods.oscs.push(...vibOscs);
      if (lfoOsc) sharedMods.oscs.push(lfoOsc);
    }
    if (tailPlan) {
      this._mrdrTailStats.culled++;
      this._mrdrTailStats.savedSeconds += tailPlan.saved;
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
    // Bounded, because the key is the pot's position rounded to a percent and a drag
    // across the dial mints a hundred of these per shape — each a 1025-point Float32Array
    // that nothing ever evicted. A miss costs one pass over the table and lands on the
    // identical curve, so forgetting the far end of a sweep is free.
    if (this._driveCurves.size >= DRIVE_CURVE_CACHE) {
      this._driveCurves.delete(this._driveCurves.keys().next().value);
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
   * Retire pools that have been silent long enough that keeping them is only cost.
   *
   * "Grown, never shrunk" is the right rule DURING a song — tearing down a slot
   * mid-phrase cuts whatever rings on it. It is the wrong rule across a session:
   * every lane × voice × echo combination ever played keeps its slots for the life
   * of the context, each idle Tone synth holding its Signal ConstantSources (about
   * 0.026 cores per pool, measured in bench-tone-pool), and `poolSlots` in
   * runtimeHealth only ever climbs. A desk session that wanders through a dozen
   * presets is carrying every one of them by evening.
   *
   * So: a pool whose last booked note ended more than IDLE_POOL_SECONDS ago — tail
   * included, the same predicate retirement has always used — is retired through the
   * ordinary `_retire` path (which disposes only after quiet, so even this is
   * belt-and-braces). The next note on that lane rebuilds via `_pool`, paying one
   * `_addSlot` at note time; the interval is chosen so that only a lane genuinely
   * ABANDONED for half a minute pays it. Previews and held gates are never reaped:
   * a finger on a key books no `until`, and a preview pool is its own lifecycle.
   *
   * Desk-opt-in (the silentLaneSkip pattern): the game and offline renders never
   * call this, so their behaviour is byte-identical by construction.
   */
  reapIdlePools(idleSeconds = 30) {
    if (typeof this.ctx?.startRendering === 'function') return 0;
    const now = this.ctx.currentTime;
    let reaped = 0;
    for (const [key, pool] of [...this.pools]) {
      if (pool.preview) continue;
      if (pool.slots.some((s) => s.gateKey != null)) continue;
      if (!(pool.until > 0)) continue;   // never played — cheap, and about to be used
      const quiet = pool.until + VoiceRack.tailOf(pool.spec);
      if (now - quiet < idleSeconds) continue;
      this._retire(key, pool);
      reaped++;
    }
    return reaped;
  }

  /**
   * Dispose retired offline pools whose booked notes and tails have all ended.
   *
   * Offline, `_retire` sets pools aside instead of disposing (see above) — but "let
   * ring until the context dies" made a long bounce carry every GENERATION of a lane's
   * pool, still connected: a lane with per-bar gain trims retires a pool per trim, and
   * each retired DuoSynth slot keeps a free-running vibrato LFO — a generator, the one
   * node class silence cannot short-circuit — rendering for the rest of the file.
   *
   * Called from the JIT render walk at its suspend checkpoints with the render-head
   * time. The predicate is the same one live retirement waits on — the last booked
   * note's end plus the preset's tail — so by construction it cannot cut sound: a
   * pool is only torn down once everything it was asked to play has finished ringing.
   */
  sweepRetiredPools(renderTime) {
    if (!this._retiredOffline.length || !Number.isFinite(renderTime)) return 0;
    let swept = 0;
    this._retiredOffline = this._retiredOffline.filter((pool) => {
      const quiet = pool.until + VoiceRack.tailOf(pool.spec);
      if (quiet >= renderTime) return true;
      this._disposePool(pool);
      swept++;
      return false;
    });
    return swept;
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
    // MRDR-3's lane stage is the same question asked of a different cache.
    //
    // The stage is per (scope, lane) and holds three gains plus, when the preset has a
    // chorus, a whole wet leg — an oscillator, two delays, four gains and two panners.
    // Nothing pruned it: `dispose` cleared the map and `refresh` updated the stages it
    // found, so a lane moved off MRDR-3 left its stage standing, still connected to the
    // strip, for the life of the context. Preset-hopping on a long session is exactly
    // how a desk accumulates them, and `runtimeHealth().mrdrLaneStages` is where it shows.
    //
    // Same bargain as the pools above: out of the map at once, so the next note builds a
    // fresh one, and disconnected only after what was booked through it has rung out.
    for (const [key, stage] of [...this._mrdrLaneStages]) {
      // Previews have their own lifecycle and no lane in the arrangement to ask about.
      if (stage.scope !== 'song') continue;
      const current = voiceIdFor(stage.laneKey);
      // `undefined` is "this caller does not know that lane", which is not the same
      // answer as "that lane no longer plays this voice" and must not retire anything.
      if (current === undefined || current === stage.voiceId) continue;
      this._mrdrLaneStages.delete(key);
      const at = Number.isFinite(this.ctx?.currentTime) ? this.ctx.currentTime : 0;
      this._retireMrdrChorus(stage, at);
      const drop = () => {
        for (const node of [stage.input, stage.direct, stage.output]) {
          try { node?.disconnect(); } catch { /* context already gone */ }
        }
        stage.disposed = true;
      };
      // An offline render never edits a preset mid-play and its clock does not run at
      // wall speed, so a timer would fire in the wrong place if it fired at all.
      if (typeof this.ctx.startRendering === 'function') drop();
      else setTimeout(drop, Math.max(0, (stage.lastTime - at) * 1000) + MRDR_STAGE_DRAIN_MS);
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
   * Drum presets never reach here. `_playDrum` builds native nodes per hit and caches
   * nothing, so it is showing the current numbers already.
   */
  refresh(voiceId) {
    const editStart = performance.now();
    const out = this._refresh(voiceId);
    // A pot move lands here. If an edit is what turns a smooth song into a stuttering
    // one, this is where the cost is, and it has never been on the record.
    const ms = performance.now() - editStart;
    this._editMsMax = Math.max(this._editMsMax || 0, ms);
    this._editCount = (this._editCount || 0) + 1;
    return out;
  }

  _refresh(voiceId) {
    const v = VOICES[voiceId];
    this._specRev ||= new Map();
    // MRDR cache buffers stop before the lane chorus. Chorus-only edits update standing
    // stages but retain useful dry buffers; all other MRDR edits retain the conservative
    // revision/purge behaviour used by the rest of the rack.
    let invalidate = true;
    // The cache half is NATIVE ONLY (§10) — an AW lane has no rendered buffers to keep
    // or throw away, so it has no fingerprint either.
    if (v?.synth === MRDR3_NATIVE) {
      const nextDry = mrdrDryFingerprint(v);
      const previousDry = this._mrdrDryFingerprints.get(voiceId);
      this._mrdrDryFingerprints.set(voiceId, nextDry);
      invalidate = previousDry == null || previousDry !== nextDry;
    }
    // The lane chorus half is the FAMILY's: §7 keeps the chorus outside the core and
    // built by the same `buildChorusLeg` for both backends, so an edit has to reach a
    // standing stage whichever one is rendering it.
    //
    // WNDR-9 rides the same insert — same stage, same leg, same four controls off
    // the shared Effects card — so a chorus edit on a drawbar preset has to reach the
    // standing stage too, or the pot would move and nothing would happen until the next
    // note-on. See the Effects note in `_playAdditive`.
    // KNDO-5 rides it too, on the same terms — a chip voice through a chorus is a
    // shipped arcade sound, and the pot is the same pot. Its stage exists only for a
    // preset that carries a `chorus` block (see `_playGame`), so this loop finds nothing
    // to ramp until one does, and then ramps it where it stands.
    if (isMrdrVoice(v) || synthFamily(v?.synth) === WNDR9 || synthFamily(v?.synth) === KNDO5) {
      for (const stage of this._mrdrLaneStages.values()) {
        if (stage.voiceId === voiceId) {
          const chorus = sectionBypassed(v, 'chorus', v.chorus) ? null : v.chorus;
          this._updateMrdrLaneStage(stage, chorus, this.ctx.currentTime || 0);
        }
      }
    }
    if (invalidate) {
      this._specRev.set(voiceId, (this._specRev.get(voiceId) || 0) + 1);
      this._invalidateCacheEntries(voiceId);
    }
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
      if (!v || !synthClassFor(v.synth, v.options)) { this._retire(key, pool); continue; }
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
      // CRLS-1 wears ONE name across both of Tone's classes, so the name alone no longer
      // answers "is this still the same class". Switching a preset's filter on or off is a
      // class change under an unchanged `synth`, and a pool that did not rewire for it
      // would go on playing the old one — the filter you just added would do nothing.
      const rewires = pool.spec.synth !== spec.synth
        || synthClassFor(pool.spec.synth, pool.spec.opts)
          !== synthClassFor(spec.synth, spec.opts)
        || !pool.spec.vibrato !== !spec.vibrato;
      if (!rewires && this._applyLive(pool, spec)) { pool.spec = spec; continue; }
      this._retire(key, pool);
    }
    // WHETHER THE CACHE WAS PURGED, which is the only thing a caller needs from here:
    // a purge is what makes the next notes of this voice play live, and therefore the
    // only edit worth scheduling a recovery for. A chorus-only tweak keeps its buffers
    // and needs nothing. No caller read this return value before today.
    return invalidate;
  }

  /**
   * Open the edit-recovery window: for the next few seconds the trickle's two COOLDOWN
   * brakes come off, so the notes an edit just invalidated are re-rendered while the
   * playhead is still approaching them rather than a minute later.
   *
   * The idle gate and the clock brake are untouched — see `trickleAllowed`. This makes
   * the repair urgent; it does not make it exempt from the measurement that says whether
   * the machine can afford it.
   */
  urgentNoteCacheBoost(ms = URGENT_CACHE_WINDOW_MS) {
    const state = this._cacheState;
    if (!state) return 0;
    state.urgentUntil = performance.now() + Math.max(0, Number(ms) || 0);
    pumpCache(state);
    return state.urgentUntil;
  }

  /** Run `fn` with the render queue tagging everything it creates as urgent work. */
  withUrgentTagging(fn) {
    const state = this._cacheState;
    if (!state) return fn();
    state.urgentTagging = true;
    try { return fn(); } finally { state.urgentTagging = false; }
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
    if (!state) return;
    // The trickle's clock probe reads the LIVE context through the state (the state
    // deliberately outlives racks, so the reference is refreshed on every handover —
    // a rebuilt context must not leave the probe reading a dead clock).
    state.liveCtx = typeof this.ctx?.startRendering === 'function' ? state.liveCtx : this.ctx;
    if (state === this._cacheState) return;
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
      // The edit-recovery window, and whether it is doing anything. `urgent` alone only
      // says the window is open; the three counters in `state.stats` (spread above) say
      // whether work was queued, started and finished inside it.
      urgent: (state.urgentUntil || 0) > performance.now(),
      // OUTSTANDING urgent work, which is a different question from `queued`. The queue
      // holds the whole song's inventory — measured at 1535 entries — and draining all of
      // it is a minute or more. What decides whether playback can resume HERE is the
      // handful of notes around the playhead, and this is that handful.
      urgentPending: state.queue.reduce((n, job) => n + (job.urgent ? 1 : 0), 0),
      plan: { ...(state.plan || {}) },
    };
  }

  /** Clear the per-window peaks the diagnostics report. Called when a lap window resets. */
  resetEditStats() {
    this._editMsMax = 0;
    this._editCount = 0;
    if (this._cacheState?.stats) {
      this._cacheState.stats.renderMsMax = 0;
      this._cacheState.stats.renderMsTotal = 0;
      this._cacheState.stats.urgentQueued = 0;
      this._cacheState.stats.urgentStarted = 0;
      this._cacheState.stats.urgentCompleted = 0;
    }
  }

  runtimeHealth() {
    this._sweepLiveNotes();
    let poolSlots = 0;
    for (const pool of this.pools.values()) poolSlots += pool.slots?.length || 0;
    let chorusLegs = 0;
    for (const stage of this._mrdrLaneStages.values()) if (stage.chorus) chorusLegs++;
    return {
      pools: this.pools.size,
      poolSlots,
      retiredPools: this._retired.size + this._retiredOffline.length,
      mrdrLaneStages: this._mrdrLaneStages.size,
      mrdrChorusLegs: chorusLegs,
      liveNotes: this._liveNotes.length,
      heldNative: this._heldNative.size,
      // The two numbers that decide whether "it falls apart when I tweak something" is
      // the EDIT or the desk. Peaks, and reset with the lap window, so a row reports the
      // worst of that window rather than the worst ever.
      editMsMax: Math.round(this._editMsMax || 0),
      edits: this._editCount || 0,
      tngr2: this._tngr2Health(),
      activePreviews: this._activePreviews.size,
      cachedSources: this._cachedPlayback.size,
      mrdrTail: {
        ...this._mrdrTailStats,
        potentialRatio: this._mrdrTailStats.baselineSeconds > 0
          ? this._mrdrTailStats.potentialSeconds / this._mrdrTailStats.baselineSeconds : 0,
        skipReasons: { ...this._mrdrTailStats.skipReasons },
      },
    };
  }

  /**
   * What TNGR-2 is holding. Lanes and voices come from the poly allocator, `waves` is
   * the per-context PeriodicWave cache — the three numbers that grow if a note-off, a
   * sweep or the cache cap ever stops working.
   */
  _tngr2Health() {
    return this.ctx ? tngr2ControllerHealth(this.ctx) : { lanes: 0, families: 0, tableBytes: 0 };
  }

  /**
   * Dispose only the pools created for an on-screen preview.
   *
   * A mixer can be playing its own Tone pools at the same time as the desk's
   * preset bench. Cutting the whole rack here would stop the song just because
   * somebody compared two sounds, so preview pools carry their own flag and are
   * the only ones this operation touches.
   */
  /**
   * The transport stopped, paused or seeked — clear every AW lane's queue.
   *
   * A native voice is nodes and freezes with the context; a worklet lane is a QUEUE of
   * absolutely-stamped events, and that queue outlives a pause. Without this, resuming
   * fires notes whose moment has been and gone and then posts new ones behind the queue's
   * own cursor. See `mrdr3PanicAll`.
   */
  panicMrdr3Aw() {
    if (!this.ctx) return 0;
    try { return mrdr3PanicAll(this.ctx, { at: this.ctx.currentTime }); } catch { return 0; }
  }

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
    // TNGR-2's held notes first: they are events rather than nodes, and the loop below
    // reaches straight for `held.params`.
    for (const [noteKey, held] of [...this._heldNative]) {
      if (held?.tngr2) {
        tngr2NoteOff(held.tngr2.lane, {
          at: Math.max(now, held.tngr2.at || 0), eventId: held.tngr2.eventId,
        });
        this._heldNative.delete(noteKey);
        continue;
      }
      // MRDR-3 AW's held notes are the same kind of thing for the same reason: an event
      // id inside a lane's processor rather than a set of nodes, so a stop is a message.
      if (held?.mrdr3) {
        mrdr3NoteOff(held.mrdr3.lane, { at: now, eventId: held.mrdr3.eventId });
        this._heldNative.delete(noteKey);
      }
    }
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
      record.fingers = [];
    }
    // ...and the keys down on a TNGR-2 lane, which are kept per lane rather than on a
    // record. A stop that left one behind would hand the next key's note-off a finger
    // that is not on the keyboard any more.
    for (const host of this._tngr2Held?.values() || []) host.fingers = [];
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
      const freq = Math.max(20, (spec.freq ?? spec.cutoff ?? 1150) * mul);
      for (const st of chain.stages) {
        try { st.frequency.setTargetAtTime(freq, now, 0.008); } catch { /* gone with the note */ }
      }
      // Resonance is the FIRST stage's alone — the ones behind it carry the slope at a
      // flat Q and would multiply the peak if they resonated too. The same rule
      // `_filterChain` builds by.
      const q = chain.stages[0]?.Q;
      const qValue = spec.Q ?? spec.resonance ?? null;
      if (q && qValue != null) {
        try { q.setTargetAtTime(qValue, now, 0.008); } catch { /* ditto */ }
      }
    }
  }

  /** Release a previewed note — the other half of triggerAttack above. */
  releasePreview(laneKey, freq) {
    const noteKey = `${laneKey}|${freq.toFixed(2)}`;
    this._releasePreview(noteKey);
  }

  _releasePreview(noteKey) {
    const now = this.ctx.currentTime;
    const entry = this._activePreviews.get(noteKey);
    // Preview note-ons are deliberately scheduled a few milliseconds ahead so they
    // clear the song scheduler's lookahead. A very quick click can therefore arrive
    // before the attack time. Releasing at raw `currentTime` in that case puts the
    // note-off before its note-on; Tone and the worklet quite correctly cannot match
    // it, and the note survives as an orphan until its long safety stop. Carry the
    // booked attack time with the preview and release at the later of the two clocks.
    const at = Math.max(now, entry?.at || 0);
    if (entry) {
      this._activePreviews.delete(noteKey);
      const { slot } = entry;
      // ONE INSTRUMENT, SEVERAL FINGERS — see `fingerDown`. A MONO or LEGATO pool has a
      // single slot and every key on the lane is holding it, so `triggerRelease` here was
      // the first finger to come up ending a note the other two were still asking for.
      // A POLY pool reaches the same edge at its polyphony cap, where a later key has
      // taken a slot over. Either way the rule is the same: only the key that is SPEAKING
      // can end the note, and even it hands over rather than ending while a finger is
      // still down.
      const { next, wasOwner } = fingerUp(slot, noteKey);
      if (next) {
        // LETTING GO NEVER STARTS A NOTE. The pitch moves to whichever key is still down
        // and the envelope is left exactly where it stands — no second attack out of a
        // gesture that was a release. That is single-trigger fall-back, which is what a
        // mono synth with a keyboard on it does, and it is the same answer in MONO and
        // LEGATO because in both of them the note was never let go of.
        if (wasOwner) {
          try { slot.synth.setNote(next.hz, at); } catch { /* ignore */ }
          // The gate goes with the note. `gateKey` is null on a POLY slot and stays null.
          if (slot.gateKey != null) slot.gateKey = next.key;
        }
      } else {
        try { slot.synth.triggerRelease(at); } catch { /* ignore */ }
        // A KEY COMING UP ENDS THE GATE, which is the whole of what the fingered glide test
        // reads: press C, let go, press E after a pause, and the E starts on its own pitch
        // rather than sliding out of a note nobody is holding. Without this a held note's
        // gate ran its nominal length into the future whether or not a finger was still
        // down. Only the key that opened the gate can close it, so a trill played with two
        // keys overlapping keeps gliding.
        if (slot.gateKey === noteKey) { slot.activeUntil = at; slot.gateKey = null; }
      }
    }
    const held = this._heldNative.get(noteKey);
    const heldAt = held?.at ?? held?.tngr2?.at ?? held?.tngr2Queued?.time ?? 0;
    const releaseAt = Math.max(now, heldAt);
    // Native and worklet previews use the same absolute timing rule as the pooled
    // path above. `at` remains the pooled slot's release time; the held branches below
    // use `releaseAt`, which also covers a note waiting for an async worklet lane.
    // A TNGR-2 note is not nodes, it is an event id inside a lane's processor, so it is
    // released by saying so rather than by ramping a gain and stopping a source.
    // An AW note, likewise: released by saying so rather than by ramping a gain and
    // stopping a source. Before the TNGR-2 branch because both read `held.<engine>` and a
    // held record only ever carries one of them.
    if (held?.mrdr3) {
      mrdr3NoteOff(held.mrdr3.lane, { at: releaseAt, eventId: held.mrdr3.eventId });
      this._heldNative.delete(noteKey);
      return true;
    }
    if (held?.tngr2) {
      const { lane, fingers } = held.tngr2;
      // The key came up `at`; the note sounds one lead later, exactly as its note-on
      // did. The floor is the note-on's own frame, which is the shortest a note can be
      // and still never overtakes it — a frame's events are applied in the order they
      // were posted, so the note-on there still starts the voice and this finds it.
      const off = Math.max(releaseAt + (held.tngr2.lead || 0), held.tngr2.at || 0);
      this._heldNative.delete(noteKey);
      // ONE INSTRUMENT, SEVERAL FINGERS, on the lane rather than on a slot or a graph.
      const { next, wasOwner } = fingerUp(fingers, noteKey);
      if (next) {
        // Not the key that is speaking: it comes up in silence. Its event id was rebound
        // to a later note the moment that note arrived, so the note-off it would send is
        // one the core could only ignore.
        if (!wasOwner) return;
        // The key that IS speaking, handing the note back rather than ending it —
        // `regate: false`, so the pitch moves and the envelopes stay where they are in
        // MONO as well as in LEGATO. The voice keeps this new id, so the key now holding
        // it is the one whose note-off can end it, and it gets the same HOLD_SECONDS
        // backstop every held note books.
        const eventId = (lane.nextEventId = (lane.nextEventId || 0) + 1);
        tngr2NoteOn(lane, { at: off, hz: next.hz, velocity: 1, eventId, regate: false });
        tngr2NoteOff(lane, { at: off + HOLD_SECONDS, eventId });
        const back = this._heldNative.get(next.key);
        if (back?.tngr2) { back.tngr2.eventId = eventId; back.tngr2.at = off; back.tngr2.lead = 0; }
        return;
      }
      tngr2NoteOff(lane, { at: off, eventId: held.tngr2.eventId });
      return;
    }
    // Still waiting for its lane — see `_queueTngr2`. There is nothing to tell to stop, so
    // the note is struck off before it is ever played.
    if (held?.tngr2Queued) {
      held.tngr2Queued.cancelled = true;
      this._heldNative.delete(noteKey);
      return;
    }
    if (held) {
      // The same close, on the native path's own record of the gate.
      const record = held.glideKey ? this._last?.get(held.glideKey) : null;
      if (record && record.gateKey === noteKey) {
        // ONE INSTRUMENT, SEVERAL FINGERS, said on this path too — see `fingerDown`. The
        // key that is SPEAKING is coming up while others are still down, so the note is
        // handed back rather than ended: the pitch moves, the envelopes are left exactly
        // where they stand, and the release record goes with it so that the key now
        // holding the note is the one that can end it.
        //
        // MRDR-3 already ignored a note-off from a key it had left behind — `_rekeyHeldNote`
        // takes the record away from it — so this is the other half of the same rule, and
        // the half that was missing: letting go of the key you were actually holding cut
        // a chord two fingers were still on.
        const { next } = fingerUp(record, noteKey);
        if (next) {
          // MONO struck a new graph per key and choked the one before it, so the key
          // getting the note back may still own a set of silenced nodes. Let them go
          // here — nothing is coming for them otherwise, and the note it is being given
          // is this one.
          const stale = this._heldNative.get(next.key);
          this._heldNative.delete(noteKey);
          if (stale && stale !== held) {
            this._heldNative.delete(next.key);
            this._letGoNative(stale, releaseAt);
          }
          this._retargetLayerPitch(record, next.hz, releaseAt, record.glide || 0);
          record.gateKey = next.key;
          this._heldNative.set(next.key, held);
          return;
        }
        // The audio release may have to wait for a preview whose attack was booked
        // slightly ahead of the current clock, but the logical gate ends when the
        // player actually releases the key. Keeping the future booking here makes a
        // just-pressed-and-released note look fingered until its scheduled attack.
        record.gateUntil = Math.min(record.gateUntil, now);
        record.gateKey = null;
      } else if (record) {
        // Not the key that is speaking. Its own nodes still have to be let go — in MONO
        // every key built its own graph — but the note sounding is somebody else's and
        // is not touched.
        fingerUp(record, noteKey);
      }
      this._heldNative.delete(noteKey);
      this._letGoNative(held, releaseAt);
    }
  }

  /**
   * Take one held native note down: release what it holds open, and pull the far-future
   * stops back to the end of that tail.
   *
   * Its own method because a note-off is not the only thing that ends a held note. A key
   * handing the note back to a finger still down leaves the nodes IT was holding with
   * nothing left to release them, and they would otherwise run silently to the 30-second
   * safety stop `HOLD_SECONDS` books.
   */
  _letGoNative(held, at) {
    let stopAt = at;
    for (const h of held.params) {
      try { stopAt = Math.max(stopAt, releaseNow(h.param, at, h.e)); } catch { /* ignore */ }
    }
    // Re-scheduled, not stopped twice: the last `stop()` before a source has ended is
    // the one that takes effect, so this pulls the far-future stop back to the tail.
    for (const src of held.sources) { try { src.stop(stopAt + 0.01); } catch { /* ignore */ } }
    if (held.polyRecord) held.polyRecord.stopAt = stopAt + 0.01;
    // The note-on's shared modulators go when its LAST tone does — a chord releases
    // one key at a time and the rest are still wobbling.
    const shared = held.shared;
    if (shared && (shared.holds -= 1) <= 0) {
      for (const m of shared.oscs) { try { m.stop(stopAt + 0.01); } catch { /* ignore */ } }
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
    this._tngr2Held?.clear();
    for (const active of this._cachedPlayback) {
      try { active.src.stop(); } catch { /* already stopped */ }
      try { active.src.disconnect(); } catch { /* context may already be gone */ }
      try { active.gain.disconnect(); } catch { /* ditto */ }
    }
    this._cachedPlayback.clear();
    this._heldNative.clear();
    // ---- THE WORKLET LANES GO WITH THE RACK -----------------------------------
    //
    // A persistent node per lane is exactly the thing that would otherwise outlive the
    // rack that made it, and BOTH worklet instruments own one. MRDR-3 was missing from
    // this line, and the failure that left was permanent silence on the desk:
    //
    //   - the lane book is keyed on the CONTEXT, not on the rack, so a new rack on the
    //     same context inherits the old rack's lanes rather than building its own;
    //   - `Audio.setBank` disposes the rack and then calls `_cutLaneGates`, which
    //     disconnects every lane gate — the node an AW lane's output is wired to;
    //   - the inherited lane still says `connected: true` with the same chorus key, so
    //     `_playMrdr3Aw` never rebuilds its output and the node stays wired to a gate
    //     that reaches nothing.
    //
    // A DISCONNECTED AudioWorkletNode IS NOT RENDERED. Nothing pulls it, so `process()`
    // is never called again: no note sounds, no fault is raised, the port still answers
    // a health probe, and the event queue climbs without bound while `groups`, `late`
    // and `steals` sit perfectly still. That is the shape in the desk's own diagnostics
    // — `awQueued` at 1300 across 11 lanes with `awGroups` at 2 and `awDetached` at 0.
    //
    // And the desk re-banks often: a voice change comes back through `setBank` while
    // the song keeps playing. So this was one preset change away at all times, and it
    // reads as "the instrument never came back" because that is exactly what happened.
    //
    // ---- WHICH IS NOT THE SAME AS TEARING THEM DOWN ---------------------------
    //
    // MRDR-3 keeps its nodes. Building a lane structured-clones the table pyramid and the
    // noise set into the processor, and releasing ten of them on a re-bank only to build
    // ten more on the next bar charges that clone, ten times over, to an audio thread
    // that is already rendering — which is audible as a crack rather than as a cost. The
    // desk re-banks on a stop, on a voice change, on an apply; the song is usually still
    // the song.
    //
    // What a dispose actually owes is that no lane goes on OWING THE LAST RACK: the queue
    // is cleared here, the patch is re-synced on the next note-on, and the output is
    // re-pointed by `_playMrdr3Aw` when it finds the gate has moved. All three are
    // messages. Only lanes nothing has played for a while are really released —
    // `releaseIdleMrdr3Lanes` — so an abandoned lane cannot accumulate either.
    if (this.ctx) {
      try { releaseTngr2Context(this.ctx); } catch { /* context already gone */ }
      try {
        mrdr3PanicAll(this.ctx, { at: 0 });
        releaseIdleMrdr3Lanes(this.ctx, { idleSeconds: MRDR3_LANE_IDLE_SECONDS });
      } catch { /* ditto */ }
    }
    this._liveNotes = [];
    for (const stage of this._mrdrLaneStages.values()) {
      this._retireMrdrChorus(stage, Number.isFinite(this.ctx?.currentTime) ? this.ctx.currentTime : 0);
      for (const node of [stage.input, stage.direct, stage.output]) {
        try { node?.disconnect(); } catch { /* context may already be gone */ }
      }
      stage.disposed = true;
    }
    this._mrdrLaneStages.clear();
    // The glide origins. The nodes they point at belong to the dying context; keeping
    // the map would glide the next song's first note from the last song's last one.
    if (this._last) this._last.clear();
  }
}
