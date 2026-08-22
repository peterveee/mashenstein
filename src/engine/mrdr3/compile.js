/*
 * A preset, compiled to a flat numeric patch — docs/MRDR-3-worklet-spec.md §8.
 *
 * On the main thread, off the audio thread, resolving once everything the core should
 * never have to reason about. At the end of Phase 2 the core is one layer through an
 * optional global stage, so most of §8's list is not reachable yet — what matters now is
 * the half of this file that will matter for ever:
 *
 * ---- IT REFUSES WHAT IT CANNOT RENDER ---------------------------------------------
 *
 * A compile step that silently dropped a preset's PWM, its unison or its second layer
 * would still produce a patch, the A/B tool would still produce a pair of files, and the
 * pair would be a lie — two renders of DIFFERENT sounds, offered as evidence about one.
 * That is the failure mode this project can least afford, because the whole migration is
 * decided by listening. So anything out of scope is reported by name and the preset is
 * refused, rather than approximated.
 */
import { MRDR3_NATIVE, isMrdrVoice } from './identity.js';

/**
 * A number in [0,1) that depends only on its salt — the engine's `hitRandom`, at the one
 * fixed time the frozen ensemble draws from.
 *
 * `MRDR_ENSEMBLE_JITTER` is off engine-wide, so every occurrence of a note is the same
 * section rather than a solo, and the seed is `ENSEMBLE_FIXED_TIME` (zero) rather than the
 * note's own time. That makes the whole ensemble a compile-time CONSTANT: the rates and
 * phases below are the same on every note, so the audio thread never needs a random
 * number generator at all. Integer ops only, bit-exact everywhere, as the original is.
 */
function fixedRandom(salt) {
  let n = Math.imul(salt, 2654435761) | 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}
const fixedVary = (amount, salt) => (amount > 0 ? 1 + (fixedRandom(salt) - 0.5) * 2 * amount : 1);

/**
 * The drive's transfer curve — the native `_driveCurve`, verbatim.
 *
 * Normalised so the curve always reaches full scale and DRIVE changes the KNEE rather
 * than the level. Built here, on the main thread, and shipped as a table the core reads
 * exactly as a WaveShaper does, so the shaper is a Tier-A port rather than a new
 * distortion.
 */
function driveCurve(amount, shape) {
  const a = Math.round(amount * 100) / 100;
  const curve = new Float32Array(1025);
  if (shape === 'fold') {
    const k = 1 + a ** 2 * 12;
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.sin(k * x * Math.PI * 0.5);
    }
  } else if (shape === 'crush') {
    const bits = Math.max(1.5, 12 - a * 10);
    const steps = 2 ** bits;
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
  } else {
    const k = 1 + a ** 2 * 24;
    const norm = Math.tanh(k);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(k * x) / norm;
    }
  }
  return curve;
}

const LFO_TARGET = { filter: 0, level: 1, pitch: 2 };

const CLASSIC = ['sine', 'square', 'sawtooth', 'triangle'];
const FILTER_KIND = { lowpass: 0, highpass: 1, bandpass: 2, notch: 3 };

/** Biquad sections for a slope, exactly as `_filterChain` counts them. */
const stagesFor = (slope) => (slope === -48 ? 4 : slope === -24 ? 2 : 1);

/**
 * Compile one preset. Returns `{ patch, problems }`.
 *
 * `problems` empty means the core can render this preset as authored. Anything in it
 * names a feature the core does not have yet, and the caller must not pretend otherwise.
 */
export function compileMrdr3(voice) {
  const problems = [];
  // EITHER identity. §9.1: there is one canonical MRDR payload and the identity selects a
  // renderer, so a compile step that demanded the native name would refuse the very voice
  // the comparison switch had just produced — which is exactly what it did, and the
  // symptom was every MRDR-3 lane going silent the moment the AW button was pressed. The
  // lane returned null, the queued notes were dropped, and nothing said why.
  if (!isMrdrVoice(voice)) {
    return { patch: null, problems: ['not an MRDR-3 preset'] };
  }
  const L = voice.layer || {};
  // Gain-0 layers are layers taken OUT, skipped entirely rather than run at 1e-4 — the
  // native path's rule, and the reason a save-time measurement does not hear them.
  const specs = ['osc1', 'osc2', 'osc3']
    .map((key) => [key, L[key]])
    .filter(([, s]) => s && (s.gain ?? 1) > 0);

  if (!specs.length) return { patch: null, problems: ['every layer is off or at zero gain'] };

  const layers = [];
  for (const [key, s] of specs) {
    const where = specs.length > 1 ? ` on ${key}` : '';
    if (!CLASSIC.includes(s.type) && s.type !== 'pulse' && s.type !== 'noise') {
      problems.push(`waveform '${s.type}'${where}`);
    }
    if ((s.delay ?? 0) > 0) problems.push(`layer DELAY${where} (Phase 3)`);

    const fl = s.filter || null;
    // A STATIC pulse is a table at the authored duty, keyed to four places so the pyramid
    // is shared by every layer asking for the same width. A MOVING one is not this — see
    // §3.4; a swept duty is built per sample and is Phase 3.
    const width = Math.min(0.95, Math.max(0.05, s.width ?? 0.5));
    const moving = s.type === 'pulse' && s.pwm && (s.pwm.depth ?? 0) > 0;
    const duty = s.type === 'pulse' && !moving ? width.toFixed(4) : null;
    // How far the duty may swing before it leaves the range a pulse HAS: at a 20% centre
    // it can fall no further than 15 points, and asking for more is asking for a duty of
    // zero, which is silence rather than a wider sound. The native path's own arithmetic.
    const room = Math.min(width - 0.05, 0.95 - width);
    const swing = moving ? Math.min(room, Math.min(1, s.pwm.depth) * 0.45) : 0;
    layers.push({
      kind: CLASSIC.includes(s.type) ? s.type : 'square',
      // `noise` is a WAVEFORM here, exactly as it is on KNDO-5: the seeded buffer
      // through a bandpass that follows the note. Every pot still means something.
      noiseColour: s.type === 'noise' ? (s.color || 'white') : null,
      duty,
      width,
      pwmDepth: moving ? s.pwm.depth : 0,
      pwmRate: moving ? Math.max(0.01, s.pwm.rate ?? 0.4) : 0,
      pwmSwing: swing,
      pwmDelay: moving ? Math.max(0, s.pwm.delay ?? 0) : 0,
      // sine and triangle are the only shapes the library asks for; nativeWave falls back
      // to sine for anything else, so this records only whether it is the triangle.
      pwmTri: moving && s.pwm.type === 'triangle',
      // The PITCH ENVELOPE, in cents on top of whatever detune the layer already carries.
      // Attack defaults to ZERO: the arcade shape is a note that starts away and ARRIVES,
      // not one that scoops out to the offset first.
      pitchCents: s.pitch ? (s.pitch.semitones ?? 0) * 100 : 0,
      pitchEnv: s.pitch ? {
        attack: s.pitch.attack ?? 0,
        decay: s.pitch.decay ?? 0,
        sustain: s.pitch.sustain ?? 0,
        release: s.pitch.release ?? 0.015,
        attackCurve: s.pitch.attackCurve,
        decayCurve: s.pitch.decayCurve,
        releaseCurve: s.pitch.releaseCurve,
      } : null,
      // ONE FM operator per layer, fanned across the whole unison stack — five modulators
      // would beat against each other. Its pitch is fixed at the carrier's STARTING
      // frequency and its depth is in hertz as a multiple of it, with its own envelope:
      // a long decay is the modulation swelling across the note, which is what brass is.
      fmRatio: s.fm && (s.fm.index ?? 1) > 0 ? (s.fm.ratio ?? 1.4) : 0,
      fmIndex: s.fm && (s.fm.index ?? 1) > 0 ? (s.fm.index ?? 1) : 0,
      fmEnv: s.fm ? {
        attack: s.fm.attack ?? 0.01, decay: s.fm.decay ?? 0, sustain: 0, release: 0,
      } : null,
      ratio: s.ratio ?? 1,
      detune: s.detune ?? 0,
      unison: Math.max(1, Math.min(4, Math.round(s.unison ?? 1))),
      spread: s.spread ?? 20,
      stereo: Math.min(1, Math.max(0, s.stereo ?? 0)),
      gain: s.gain ?? 1,
      len: s.len ?? 1,
      through: s.vca === 'through',
      env: {
        attack: s.attack ?? 0.01,
        decay: s.decay ?? 0,
        sustain: s.sustain ?? 0,
        release: s.release ?? 0.015,
        attackCurve: s.attackCurve,
      },
      filterStages: fl ? stagesFor(fl.slope) : 0,
      filterKind: fl ? (FILTER_KIND[fl.type] ?? 0) : 0,
      filterFreq: fl ? (fl.freq ?? 1150) : 1150,
      filterQ: fl ? (fl.Q ?? 0.7) : 0.7,
      filterTrack: fl ? (fl.track ?? 0) : 0,
      filterOct: fl?.env ? (fl.env.octaves ?? 0) : 0,
      filterEnvShape: fl?.env ? {
        attack: fl.env.attack ?? 0.01,
        decay: fl.env.decay ?? 0.2,
        sustain: fl.env.sustain ?? 0.5,
        release: fl.env.release ?? 0.3,
      } : { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
    });
  }

  // Whole-voice features the core does not have yet.
  //
  // A REFUSAL COMES OFF ONLY WHEN THE CORE CONSUMES THE FIELD, never when this step learns
  // to describe it. That rule was written here and then broken in the same sitting: the
  // patch grew `syncSlaves`, `pitchEnv`, `fmRatio` and `lfoHold`, the refusals came off,
  // and the renderable count went to 68 of 68 while the render loop ignored all four. The
  // count is the thing everyone reads, so a wrong one is worse than no count at all.




  // ---- the routable LFO ------------------------------------------------------------
  //
  // DEPTH is the switch. There is no `lfo.on` and there never was — an LFO at zero
  // modulates nothing, so it builds nothing. The target DEFAULTS rather than gating: an
  // `lfo` block carrying a depth and no target used to be silently inert, which is a pot
  // that moves and does nothing.
  const rawLfo = (L.lfo?.depth ?? 0) > 0 ? L.lfo : null;
  const lfoTarget = rawLfo
    ? (['filter', 'level', 'pitch'].includes(rawLfo.target) ? rawLfo.target : 'filter') : 'filter';
  // Sample-and-hold draws a new value per period from the note's own time, so it is the
  // one shape that is not a compile-time constant. Five presets use it; it waits.
  if (rawLfo && rawLfo.sync === 'tempo') problems.push('a tempo-synced LFO (Phase 4)');

  // ---- vibrato, and the frozen ensemble ---------------------------------------------
  //
  // SPREAD scatters the wobble across the unison voices — each its own rate and starting
  // phase — which is the difference between a section and one singer through a chorus.
  // Seeded on the UNISON INDEX and nothing else: voice 2 is the SAME singer in every
  // layer, because a person has one larynx feeding all of their formants.
  const vib = (voice.vibrato?.depth ?? 0) > 0 ? voice.vibrato : null;
  const vibSpread = vib ? Math.min(1, Math.max(0, vib.spread ?? 0)) : 0;
  const vibRate = vib ? Math.max(0.01, vib.rate ?? 5) : 0;
  // ---- ENTRY: singers do not come in together ---------------------------------------
  //
  // A few milliseconds of stagger per unison voice, and the cheapest human thing in the
  // whole path. Seeded from the SAME fixed time as the vibrato spread and on the same
  // index, so voice 2 is late in every layer at once rather than smearing one singer's
  // formants apart in time. Seconds, capped at 80ms, exactly as the native path reads it.
  //
  // It is NOT a layer DELAY: that moves a layer's whole schedule and is a control; this
  // moves only where the oscillator starts, leaving the envelope where it was, and they
  // sum.
  const entry = Math.max(0, Math.min(0.08, voice.humanize?.entry ?? 0));
  const entryDelays = [0, 1, 2, 3].map((u) => (entry > 0 ? fixedRandom(1013 + u) * entry : 0));

  const vibRates = [];
  const vibPhases = [];
  for (let u = 0; u < 4; u++) {
    // +/-10% of rate at full spread — the range a real section covers. Wider stops being
    // an ensemble and starts being out of tune with itself.
    vibRates.push(vibSpread > 0 ? vibRate * fixedVary(vibSpread * 0.1, 911 + u) : vibRate);
    vibPhases.push(vibSpread > 0 ? fixedRandom(977 + u) * vibSpread : 0);
  }

  const gf = voice.global?.filter || null;
  const gv = voice.global?.vca || null;

  // MONO and LEGATO are one instrument setting seen twice: both keep a single sounding
  // note per lane, and the difference is what happens when a new one arrives while the
  // old key is still down. The core reads `mono` for both and the FINGERED rule decides
  // the rest — see §5.2.
  const mode = voice.mode || (voice.mono ? 'mono' : 'poly');
  const patch = {
    layers,
    mono: mode !== 'poly',
    legato: mode === 'legato',
    // A portamento is a TIME, not a rate: the same number of seconds whatever the
    // interval, which is what `glideTime` reads off the preset. Carried in SECONDS,
    // because a patch is rate-agnostic — the compile step has no context and no business
    // guessing one, and a hardcoded 44100 here would make every glide 9% short at 48k.
    glideSeconds: Math.max(0, voice.portamento ?? 0),
    // The drive, and its TONE filter, which is the DRIVE's tone control and not a
    // whole-voice EQ — with no shaper there is no fizz to tame, so the pair stands or
    // falls together, exactly as the native path builds them.
    driveCurve: (voice.drive ?? 0) > 0 ? driveCurve(voice.drive, voice.shape) : null,
    toneStages: (voice.drive ?? 0) > 0 && voice.tone ? 1 : 0,
    toneKind: voice.tone ? (FILTER_KIND[voice.tone.type] ?? 0) : 0,
    toneFreq: voice.tone ? (voice.tone.freq ?? 8000) : 8000,
    toneQ: voice.tone ? (voice.tone.Q ?? 0.7) : 0.7,
    vibDepth: vib ? vib.depth : 0,
    vibDelay: vib ? Math.max(0, vib.delay ?? 0) : 0,
    vibSpread,
    vibRates,
    vibPhases,
    entryDelays,
    lfoDepth: rawLfo ? Math.min(1, Math.max(0, rawLfo.depth)) : 0,
    lfoRate: rawLfo ? Math.max(0.01, rawLfo.rate ?? 4) : 0,
    lfoDelay: rawLfo ? Math.max(0, rawLfo.delay ?? 0) : 0,
    lfoTarget: LFO_TARGET[lfoTarget],
    lfoTri: !!rawLfo && rawLfo.type === 'triangle',
    lfoSquare: !!rawLfo && rawLfo.type === 'square',
    // Sample-and-hold is the one LFO shape that is not a constant: it draws a new value
    // per period from the note's own time, so the core computes it rather than reading it.
    lfoHold: !!rawLfo && rawLfo.type === 'samplehold',
    // HARD SYNC. Osc 1 is always the master; the pill names which layers follow it.
    syncSlaves: voice.sync === '1+2+3' ? [false, true, true]
      : voice.sync === '1+2' ? [false, true, false]
        : voice.sync === '1+3' ? [false, false, true] : [false, false, false],
    masterRatio: Math.max(0.01, L.osc1?.ratio ?? 1),
    // Null rather than a transparent envelope — see the core. Both absent is the default
    // and it is a different signal path, not a simplification of one.
    vca: gv ? {
      attack: gv.attack ?? 0.01,
      decay: gv.decay ?? 0,
      sustain: gv.sustain ?? 0,
      release: gv.release ?? 0.015,
      attackCurve: gv.attackCurve,
    } : null,
    filterStages: gf ? stagesFor(gf.slope) : 0,
    filterKind: gf ? (FILTER_KIND[gf.type] ?? 0) : 0,
    filterFreq: gf ? (gf.freq ?? 1150) : 1150,
    filterQ: gf ? (gf.Q ?? 0.7) : 0.7,
    filterTrack: gf ? (gf.track ?? 0) : 0,
    filterOct: gf?.env ? (gf.env.octaves ?? 0) : 0,
    filterEnvShape: gf?.env ? {
      attack: gf.env.attack ?? 0.01,
      decay: gf.env.decay ?? 0.2,
      sustain: gf.env.sustain ?? 0.5,
      release: gf.env.release ?? 0.3,
    } : { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
  };
  return { patch, problems };
}

/** Every noise colour the library asks for, so each is coloured once. */
export function mrdr3Colours(voices) {
  const out = new Set();
  for (const v of Object.values(voices)) {
    if (v.synth !== MRDR3_NATIVE) continue;
    for (const key of ['osc1', 'osc2', 'osc3']) {
      const s = v.layer?.[key];
      if (s?.type === 'noise') out.add(s.color || 'white');
    }
  }
  return [...out];
}

/** Every static-pulse duty the library asks for, so the pyramids are built once. */
export function mrdr3Duties(voices) {
  const out = new Set();
  for (const v of Object.values(voices)) {
    if (v.synth !== MRDR3_NATIVE) continue;
    for (const key of ['osc1', 'osc2', 'osc3']) {
      const s = v.layer?.[key];
      if (s?.type === 'pulse' && !(s.pwm && (s.pwm.depth ?? 0) > 0)) {
        out.add(Math.min(0.95, Math.max(0.05, s.width ?? 0.5)).toFixed(4));
      }
    }
  }
  return [...out].map(Number);
}

/** Every preset the core can render as authored, by id. */
export function mrdr3RenderableIds(voices) {
  return Object.values(voices)
    .filter((v) => v.synth === MRDR3_NATIVE)
    .map((v) => [v.id, compileMrdr3(v)])
    .filter(([, r]) => r.patch && !r.problems.length)
    .map(([id]) => id);
}
