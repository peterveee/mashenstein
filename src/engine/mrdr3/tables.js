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
