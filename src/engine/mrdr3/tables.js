/*
 * MRDR-3's band-limited wave tables — docs/MRDR-3-worklet-spec.md §3.3.
 *
 * `OscillatorNode` is the one primitive the Web Audio specification does not pin down, so
 * this is the one place the port cannot be a transcription. What the spec DOES fix is the
 * shape: a `PeriodicWave` built from Fourier coefficients, band-limited per octave, peak
 * normalised unless the caller says otherwise. Chromium builds a pyramid of tables from
 * the coefficients and interpolates between the two bracketing the note, and that is what
 * this builds too.
 *
 * ---- the coefficients are already in this codebase ---------------------------------
 *
 * Nothing here is a new waveform. The series are lifted from the native path so the two
 * backends are band-limiting THE SAME wave:
 *
 *   · sine, square, sawtooth, triangle — `phasedWave`'s series in src/engine/voices.js,
 *     which are the classic ones Chromium uses for its four built-in types
 *   · pulse at any duty — `pulseTable`'s rectangle series, INCLUDING the phi = pi*d
 *     rotation that slides the plateau to start at phase 0. That rotation is not
 *     cosmetic: without it a note gated on at phase 0 starts at 84% of full scale at 50%
 *     duty and 96% at 5%, and a zero-attack gate on that is the tick at note-on.
 *
 * ---- two things that must be right or levels move ---------------------------------
 *
 * ONE normalisation for the whole pyramid, taken from the fullest level. Normalising each
 * level to its own peak is the obvious mistake and it is audible: the level would then
 * step every time a note crossed a mip boundary, which is precisely what a glide, a
 * vibrato or an FM sweep does continuously.
 *
 * A WRAP SAMPLE at the end of every level, so the linear interpolation at the end of the
 * table reads table[0] rather than running off it. Cheaper than a modulo in the inner
 * loop, and it is what makes the read branchless.
 */

/** Samples per table. Matches the resolution `pulseTable` and `hardSyncTable` work at. */
export const MRDR3_TABLE_SIZE = 2048;

/** Levels in the pyramid. Level n carries MAX_PARTIALS >> n partials. */
export const MRDR3_LEVELS = 12;

/** Partials at the fullest level — enough for a 20 Hz fundamental at 44.1 kHz. */
export const MRDR3_MAX_PARTIALS = 1024;

/**
 * The Fourier coefficient of the nth partial, per waveform.
 *
 * Sine-form amplitudes, exactly as `phasedWave` writes them. A pulse is handled
 * separately below because its terms depend on the duty.
 */
function partialOf(kind, n) {
  if (kind === 'sine') return n === 1 ? 1 : 0;
  if (kind === 'square') return n % 2 ? 4 / (n * Math.PI) : 0;
  if (kind === 'sawtooth') return (2 / (n * Math.PI)) * (n % 2 ? 1 : -1);
  // triangle
  if (n % 2) return (8 / (n * n * Math.PI * Math.PI)) * (((n - 1) / 2) % 2 ? -1 : 1);
  return 0;
}

/**
 * Build one pyramid.
 *
 * Returned flat: one Float32Array holding every level end to end, because §5.2 wants the
 * audio thread reading a typed array by index rather than walking an array of arrays.
 */
function buildPyramid(fill) {
  const stride = MRDR3_TABLE_SIZE + 1;
  const data = new Float32Array(MRDR3_LEVELS * stride);
  for (let level = 0; level < MRDR3_LEVELS; level++) {
    const partials = Math.max(1, MRDR3_MAX_PARTIALS >> level);
    fill(data, level * stride, partials);
    data[level * stride + MRDR3_TABLE_SIZE] = data[level * stride];   // the wrap sample
  }
  // ONE scale, from the fullest level — see the note above. Taken before the wrap sample
  // is meaningful, so it is recomputed across the whole level including it.
  let peak = 0;
  for (let i = 0; i < stride; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0) {
    const scale = 1 / peak;
    for (let i = 0; i < data.length; i++) data[i] *= scale;
  }
  return data;
}

/** A classic waveform's pyramid. */
export function mrdr3Pyramid(kind) {
  return buildPyramid((data, base, partials) => {
    for (let n = 1; n <= partials; n++) {
      const a = partialOf(kind, n);
      if (!a) continue;
      const step = (2 * Math.PI * n) / MRDR3_TABLE_SIZE;
      for (let i = 0; i < MRDR3_TABLE_SIZE; i++) data[base + i] += a * Math.sin(step * i);
    }
  });
}

/**
 * A pulse of a given duty, band-limited the same way.
 *
 * The rectangle's own series with `pulseTable`'s rotation applied, so a static pulse
 * layer sounds like the one the native path builds and starts at the same point in its
 * cycle. Sweeping the duty is NOT this — see §3.4; a moving pulse is built per sample.
 */
export function mrdr3PulsePyramid(duty) {
  const d = Math.min(0.95, Math.max(0.05, duty));
  const phi = Math.PI * d;
  return buildPyramid((data, base, partials) => {
    for (let n = 1; n <= partials; n++) {
      const a = (4 / (n * Math.PI)) * Math.sin(n * Math.PI * d);
      if (!a) continue;
      const step = (2 * Math.PI * n) / MRDR3_TABLE_SIZE;
      // cos(n*theta - n*phi) = cos(n*phi)cos(n*theta) + sin(n*phi)sin(n*theta)
      const cr = a * Math.cos(n * phi);
      const ci = a * Math.sin(n * phi);
      for (let i = 0; i < MRDR3_TABLE_SIZE; i++) {
        const th = step * i;
        data[base + i] += cr * Math.cos(th) + ci * Math.sin(th);
      }
    }
  });
}

// ---- HARD SYNC, as the native path builds it ----------------------------------------
//
// A synced slave is periodic at the MASTER's frequency, so the native path states it as
// one PeriodicWave: walk the slave waveform `ratio` times across one master cycle and let
// the table's wrap be the reset. That table is what the game plays, so it is what the
// worklet plays too — the same projection, read at the master's pitch — rather than a
// per-sample reset of the slave's own table. The per-sample reset was a different
// instrument in three measurable ways: it kept the DC the reset leaves (a PeriodicWave
// cannot carry one), it skipped the peak normalisation every PeriodicWave gets (+6 dB on a
// saw at ratio 0.5), and it let the slave's DETUNE move the reset pitch where natively it
// moves the ratio. Measured on speed's SYNTH LEAD, 28 Sep: the desk 5 dB over the game.

/** The waveform a sync table walks — `hardSyncTable`'s own mapping. */
export function mrdr3SyncKind(type) {
  if (type === 'pulse') return 'pulse';
  return ['sine', 'square', 'sawtooth', 'triangle'].includes(type) ? type : 'square';
}

/** One key per distinct table, the same string `hardSyncTable` caches under. */
export function mrdr3SyncKey(kind, ratio, width = 0.5, harmonics = 96) {
  const r = Math.max(0.01, ratio);
  const duty = Math.min(0.95, Math.max(0.05, width));
  return `${kind}|${r.toFixed(5)}|${duty.toFixed(4)}|${harmonics}`;
}

/**
 * The sync table's Fourier series: the ONE definition both backends use. The native path
 * hands these to createPeriodicWave; the worklet builds its pyramid from them.
 *
 * Note the waveforms are the formula shapes, not the classic tables: a sawtooth here
 * rises from -1 at phase 0, which is half a cycle round from an OscillatorNode's own.
 * That is what the game has always played, so it is what this keeps.
 */
export function hardSyncPartials(kind, ratio, width = 0.5, harmonics = 96) {
  const r = Math.max(0.01, ratio);
  const duty = Math.min(0.95, Math.max(0.05, width));
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
  return { real, imag };
}

/**
 * A sync table's pyramid: the native series, band-limited and normalised the way every
 * other pyramid here is — which is the way Chromium treats a PeriodicWave.
 */
export function mrdr3SyncPyramid(kind, ratio, width = 0.5, harmonics = 96) {
  const { real, imag } = hardSyncPartials(kind, ratio, width, harmonics);
  const N = MRDR3_TABLE_SIZE;
  const cosT = new Float64Array(N);
  const sinT = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    cosT[i] = Math.cos((2 * Math.PI * i) / N);
    sinT[i] = Math.sin((2 * Math.PI * i) / N);
  }
  return buildPyramid((data, base, partials) => {
    const top = Math.min(partials, harmonics);
    for (let n = 1; n <= top; n++) {
      const re = real[n];
      const im = imag[n];
      if (!re && !im) continue;
      // n*i taken modulo the table: the angle is exact, not accumulated.
      for (let i = 0, k = 0; i < N; i++, k = (k + n) % N) {
        data[base + i] += re * cosT[k] + im * sinT[k];
      }
    }
  });
}

// Built per ratio a patch asks for, so cached by key for the life of the process. Each is
// a few milliseconds; the cap bounds memory on a desk where a RATIO knob is being swept.
const SYNC_PYRAMIDS = new Map();
const SYNC_PYRAMID_CACHE = 256;

/** The pyramids for a list of `{ key, kind, ratio, width }`, by key, built on first ask. */
export function mrdr3SyncSet(specs) {
  const out = {};
  for (const t of specs) {
    let p = SYNC_PYRAMIDS.get(t.key);
    if (!p) {
      p = mrdr3SyncPyramid(t.kind, t.ratio, t.width);
      if (SYNC_PYRAMIDS.size >= SYNC_PYRAMID_CACHE) {
        SYNC_PYRAMIDS.delete(SYNC_PYRAMIDS.keys().next().value);
      }
      SYNC_PYRAMIDS.set(t.key, p);
    }
    out[t.key] = p;
  }
  return out;
}

/** Every classic pyramid, built once and shared. Pulses are built per authored duty. */
let CLASSIC = null;
export function mrdr3Tables(duties = []) {
  if (!CLASSIC) {
    CLASSIC = {};
    for (const k of ['sine', 'square', 'sawtooth', 'triangle']) CLASSIC[k] = mrdr3Pyramid(k);
  }
  const out = {
    size: MRDR3_TABLE_SIZE, levels: MRDR3_LEVELS, maxPartials: MRDR3_MAX_PARTIALS,
    kinds: { ...CLASSIC }, pulses: {},
  };
  for (const d of duties) {
    const key = Math.min(0.95, Math.max(0.05, d)).toFixed(4);
    if (!out.pulses[key]) out.pulses[key] = mrdr3PulsePyramid(Number(key));
  }
  return out;
}
