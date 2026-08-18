/*
 * TNGR-2's wavetable assets: what a family IS at runtime, and how it gets there.
 *
 * ---- the shape of a family -----------------------------------------------------
 *
 * 32 frames per family, 2048 samples per frame at the base level, and a MIP PYRAMID
 * above each frame — the same waveform with progressively fewer harmonics, so a note
 * played high can be read from a level whose top harmonic still fits under Nyquist.
 * Without that, a table read is an aliasing machine: 96 harmonics at C6 is nine of them
 * above 20 kHz folding back down as inharmonic hash.
 *
 * ---- what is stored, and what is built -----------------------------------------
 *
 * What ships is the SPECTRA — 16 families x 32 frames x 96 harmonics — quantised to
 * int16 and base64'd, about 130 KB in the bundle. What the synth reads is samples, and
 * those are expanded here, per family, the first time a family is asked for.
 *
 * Storing samples instead would mean shipping the expanded pyramid: 8 MiB of Float32 in
 * a source file, for data that is exactly derivable from a tenth of it. Storing neither —
 * calling the authoring functions at runtime — would mean the shipped sound depends on
 * floating-point details of expressions nobody has frozen, and a change to an authoring
 * expression would silently restyle presets already measured against it. So: freeze the
 * spectra as data with a hash, derive the samples.
 *
 * The expansion is deterministic and the manifest hash covers the payload, so
 * tests/tngr2-tables.js can assert that the checked-in data still matches what
 * tools/build-tngr2-tables.js generates from the authoring today. That check is the whole
 * safety net: edit a family, and the test tells you the payload is stale rather than
 * letting the two drift apart.
 */
import { TNGR2_TABLE_IDS, HARMONICS } from './families.js';
import { TNGR2_MANIFEST, TNGR2_SPECTRA_B64, TNGR2_SPECTRA_SCALE } from './generated-tables.js';

/** v1: 32 frames per family. §6.1. */
export const TNGR2_FRAMES = 32;
/** v1: 2048 mono samples per cycle at the base mip level. §6.1. */
export const TNGR2_BASE_SAMPLES = 2048;

/*
 * Seven mip levels, not the ten §6.1 nominates, and the arithmetic is why.
 *
 * A level holds half the harmonics of the one below it, starting from the authoring's 96:
 * 96, 48, 24, 12, 6, 3, 1. Level 6 is a single harmonic — a sine — which is already
 * correct for a fundamental anywhere up to Nyquist, so levels 7 through 9 would each be
 * another identical copy of that sine. Ten levels is three duplicates and 4 KB per frame
 * spent to store them.
 *
 * Length halves with the harmonic count, floored at 64: a level needs at least two
 * samples per harmonic, and 64 is far above what the top levels require while staying
 * long enough that linear interpolation across it is not itself a distortion.
 */
export const TNGR2_MIP_LEVELS = 7;
export const mipHarmonics = (level) => Math.max(1, HARMONICS >> level);
export const mipLength = (level) => Math.max(64, TNGR2_BASE_SAMPLES >> level);

/**
 * Which mip level a pitch may read without aliasing.
 *
 * The highest harmonic that fits under Nyquist is `(rate/2) / hz`; pick the level whose
 * harmonic count is at or below it. Returned as a float so a caller can crossfade
 * between adjacent levels rather than stepping — §6.2 forbids an audible boundary.
 */
export function mipLevelFor(hz, sampleRate) {
  const fits = (sampleRate * 0.5) / Math.max(1e-6, Math.abs(hz));
  if (fits >= HARMONICS) return 0;
  // level = log2(HARMONICS / fits), clamped to the pyramid we actually have.
  const level = Math.log2(HARMONICS / Math.max(1, fits));
  return Math.min(TNGR2_MIP_LEVELS - 1, Math.max(0, level));
}

const decodeBase64 = (b64) => {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
};

let spectraCache = null;

/**
 * Every family's spectra, as one Float64Array view.
 *
 * Laid out family-major: `[family][frame][harmonic]`, harmonic 1..96 at offsets 0..95.
 * Decoded once per process.
 */
export function tngr2Spectra() {
  if (spectraCache) return spectraCache;
  const bytes = decodeBase64(TNGR2_SPECTRA_B64);
  const ints = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  const out = new Float64Array(ints.length);
  for (let i = 0; i < ints.length; i++) out[i] = ints[i] / TNGR2_SPECTRA_SCALE;
  spectraCache = out;
  return out;
}

export const spectrumOffset = (familyIndex, frame) =>
  (familyIndex * TNGR2_FRAMES + frame) * HARMONICS;

/**
 * Expand one family into its mip pyramid.
 *
 * Direct summation rather than an inverse FFT: a level only sums the harmonics it keeps,
 * so the whole pyramid for a frame costs about 1.3 harmonic-samples per base sample, and
 * a family lands in a few milliseconds. An FFT would be faster and much harder to read,
 * and this runs once per family per process.
 *
 * Normalisation is FAMILY-WIDE, per §6.1: every frame is divided by the same number, so
 * moving POSITION through a family is a change of timbre and not a change of level. A
 * per-frame normalisation would turn every table sweep into a compressor.
 */
export function buildFamily(id) {
  const familyIndex = TNGR2_TABLE_IDS.indexOf(id);
  if (familyIndex < 0) throw new Error(`unknown TNGR-2 family: ${id}`);
  const spectra = tngr2Spectra();
  const levels = [];
  for (let level = 0; level < TNGR2_MIP_LEVELS; level++) {
    const length = mipLength(level);
    const keep = mipHarmonics(level);
    const frames = [];
    for (let frame = 0; frame < TNGR2_FRAMES; frame++) {
      const base = spectrumOffset(familyIndex, frame);
      // One extra sample, holding a copy of sample 0: the wrap point. Interpolating
      // between the last sample and the first is then an ordinary read of a neighbour
      // rather than a modulo in the inner loop. §6.1 allows exactly this.
      const table = new Float32Array(length + 1);
      for (let n = 1; n <= keep; n++) {
        const amp = spectra[base + n - 1];
        if (!amp) continue;
        // The same tiny phase walk the native path applies, so a family keeps the
        // character it was authored and measured with rather than collapsing to the
        // cosine-phase version of itself.
        const phase = (frame / (TNGR2_FRAMES - 1) * 0.7 + n * 0.013) * Math.PI;
        for (let i = 0; i < length; i++) {
          table[i] += amp * Math.sin((i / length) * n * 2 * Math.PI + phase);
        }
      }
      frames.push(table);
    }
    levels.push(frames);
  }
  // Family-wide peak, measured across every frame of the base level — the level that
  // holds the most energy — and applied to the whole pyramid.
  let peak = 0;
  for (const table of levels[0]) {
    for (let i = 0; i < table.length; i++) peak = Math.max(peak, Math.abs(table[i]));
  }
  const gain = peak > 0 ? 0.98 / peak : 1;
  for (const frames of levels) {
    for (const table of frames) {
      for (let i = 0; i < table.length; i++) table[i] *= gain;
      table[table.length - 1] = table[0];
    }
  }
  return { id, levels, frames: TNGR2_FRAMES, gain };
}

const built = new Map();

/** One family, expanded once and shared. */
export function tngr2Family(id) {
  let family = built.get(id);
  if (!family) { family = buildFamily(id); built.set(id, family); }
  return family;
}

/** Drop the expanded tables — a diagnostics/teardown hook, not a control. */
export function clearTngr2Families() { built.clear(); }

/**
 * Pack families into the flat form the DSP core reads.
 *
 * One Float32Array per family per mip level, holding all 32 frames end to end with the
 * wrap sample included, so a read is two array indices and no bounds arithmetic. Flat
 * because this is what crosses to the audio thread: an array of 32 small arrays would be
 * 32 structured-clone entries per level per family, where this is one.
 *
 * EXPANDED HERE, ON THE MAIN THREAD, ALWAYS. Building a family takes a few milliseconds,
 * which is thirty times a render quantum — doing it inside the processor would be a
 * dropout every time a song reached a new timbre. The audio thread only ever receives
 * finished tables.
 *
 * §2 forbids making cross-origin isolation a site requirement just to share these, so
 * each node gets its own copy rather than a SharedArrayBuffer view. A family is 512 KiB
 * and a song uses a handful; that is the trade the spec asks for.
 */
export function packTngr2Tables(ids = TNGR2_TABLE_IDS) {
  const wanted = [...new Set(['basic', ...ids])].filter((id) => TNGR2_TABLE_IDS.includes(id));
  const lengths = [];
  const strides = [];
  for (let level = 0; level < TNGR2_MIP_LEVELS; level++) {
    lengths.push(mipLength(level));
    strides.push(mipLength(level) + 1);
  }
  const index = {};
  const families = [];
  wanted.forEach((id, at) => {
    index[id] = at;
    const family = tngr2Family(id);
    const levels = [];
    for (let level = 0; level < TNGR2_MIP_LEVELS; level++) {
      const stride = strides[level];
      const packed = new Float32Array(stride * TNGR2_FRAMES);
      for (let frame = 0; frame < TNGR2_FRAMES; frame++) {
        packed.set(family.levels[level][frame], frame * stride);
      }
      levels.push(packed);
    }
    families.push(levels);
  });
  return {
    index,
    families,
    lengths,
    strides,
    frames: TNGR2_FRAMES,
    levels: TNGR2_MIP_LEVELS,
    harmonics: HARMONICS,
  };
}

/** The Float32Arrays inside a packed payload, for `postMessage`'s transfer list. */
export const tngr2TableTransfers = (packed) =>
  packed.families.flat().map((array) => array.buffer);

/** How many families are currently expanded, and roughly what they cost. */
export function tngr2TableBytes() {
  let samples = 0;
  for (const family of built.values()) {
    for (const frames of family.levels) for (const table of frames) samples += table.length;
  }
  return samples * 4;
}

export { TNGR2_MANIFEST };
