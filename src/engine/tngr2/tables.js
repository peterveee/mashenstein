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
 * THE EXPANSION ITSELF, as a function that closes over NOTHING: its data comes in as
 * arguments and it touches only built-ins (Math, Float32Array). That is what lets the
 * very same code run in the main thread (buildFamily) and in the background worker
 * (tngr2FamilyWorkerSource, which carries it across as source text) — so a family
 * built off the main thread is bit-for-bit the family built on it, by construction
 * rather than by a second copy that could drift. tests/tngr2-tables.js runs the worker
 * source from a MINIFIED bundle to keep it honest.
 *
 * `spectra` is one family's slice: `frames` x `harmonics`, frame-major.
 *
 * Direct summation rather than an inverse FFT: a level only sums the harmonics it keeps,
 * so the whole pyramid for a frame costs about 1.3 harmonic-samples per base sample. An
 * FFT would be faster and much harder to read, and this runs once per family per page.
 *
 * Normalisation is FAMILY-WIDE, per §6.1: every frame is divided by the same number, so
 * moving POSITION through a family is a change of timbre and not a change of level. A
 * per-frame normalisation would turn every table sweep into a compressor.
 */
export function expandFamilySpectra(spectra, frames, harmonics, mipLevels, baseSamples) {
  const levels = [];
  for (let level = 0; level < mipLevels; level++) {
    // mipLength and mipHarmonics, written out: this function may not reach outside.
    const length = Math.max(64, baseSamples >> level);
    const keep = Math.max(1, harmonics >> level);
    const out = [];
    for (let frame = 0; frame < frames; frame++) {
      const base = frame * harmonics;
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
        const phase = (frame / (frames - 1) * 0.7 + n * 0.013) * Math.PI;
        for (let i = 0; i < length; i++) {
          table[i] += amp * Math.sin((i / length) * n * 2 * Math.PI + phase);
        }
      }
      out.push(table);
    }
    levels.push(out);
  }
  // Family-wide peak, measured across every frame of the base level — the level that
  // holds the most energy — and applied to the whole pyramid.
  let peak = 0;
  for (const table of levels[0]) {
    for (let i = 0; i < table.length; i++) peak = Math.max(peak, Math.abs(table[i]));
  }
  const gain = peak > 0 ? 0.98 / peak : 1;
  for (const out of levels) {
    for (const table of out) {
      for (let i = 0; i < table.length; i++) table[i] *= gain;
      table[table.length - 1] = table[0];
    }
  }
  return { levels, gain };
}

/** One family's spectra, as the slice expandFamilySpectra reads. */
function familySpectra(familyIndex) {
  const at = spectrumOffset(familyIndex, 0);
  return tngr2Spectra().subarray(at, at + TNGR2_FRAMES * HARMONICS);
}

/** Expand one family into its mip pyramid, here, now. */
export function buildFamily(id) {
  const familyIndex = TNGR2_TABLE_IDS.indexOf(id);
  if (familyIndex < 0) throw new Error(`unknown TNGR-2 family: ${id}`);
  const { levels, gain } = expandFamilySpectra(familySpectra(familyIndex), TNGR2_FRAMES, HARMONICS,
    TNGR2_MIP_LEVELS, TNGR2_BASE_SAMPLES);
  return { id, levels, frames: TNGR2_FRAMES, gain };
}

const built = new Map();

/** One family, expanded once and shared. */
export function tngr2Family(id) {
  let family = built.get(id);
  if (!family) { family = buildFamily(id); built.set(id, family); }
  return family;
}

// ---- THE BACKGROUND WORKER --------------------------------------------------------
//
// Expanding a family is 40-240 ms of pure arithmetic, and a song like SESERAGI (seven
// TNGR-2 lanes) needs ~700 ms of it. On the main thread that is a stall wherever it
// lands — the cabinet screen, a stage's start, a second of title frames. In a worker it
// is nobody's frame: the families are built on another core and handed back as
// transferred buffers, so receiving one costs the main thread a few views.
//
// Blob-sourced like the worklets (src/engine/tngr2/worklet.js), from
// expandFamilySpectra's own source, so there is no second file to ship or keep in step.
// Where there is no Worker (Node, a locked-down page) warmTngr2Families falls back to
// its idle slices, exactly as before.

/** The worker's source text: expandFamilySpectra, and a message loop around it. */
export function tngr2FamilyWorkerSource() {
  return `const expand = ${expandFamilySpectra.toString()};
self.onmessage = (event) => {
  const { id, spectra, frames, harmonics, mipLevels, baseSamples } = event.data;
  try {
    const result = expand(spectra, frames, harmonics, mipLevels, baseSamples);
    // One buffer per mip level, frames end to end, so the reply is seven transfers
    // rather than two hundred.
    const flat = result.levels.map((level) => {
      const length = level[0].length;
      const buffer = new Float32Array(length * level.length);
      level.forEach((table, k) => buffer.set(table, k * length));
      return buffer;
    });
    self.postMessage({ id, gain: result.gain, flat }, flat.map((b) => b.buffer));
  } catch (error) {
    self.postMessage({ id, error: String((error && error.message) || error) });
  }
};`;
}

let familyWorker = null;          // null: not tried yet; false: unavailable
let workerUrl = null;
let idleTimer = null;
const inWorker = new Map();       // id -> { promise, resolve }

/** Whether families can be built off the main thread on this page. */
export function tngr2WorkerAvailable() {
  return !!ensureFamilyWorker();
}

function ensureFamilyWorker() {
  if (familyWorker !== null) return familyWorker || null;
  if (typeof Worker !== 'function' || typeof Blob !== 'function'
    || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    familyWorker = false;
    return null;
  }
  try {
    workerUrl = URL.createObjectURL(new Blob([tngr2FamilyWorkerSource()], { type: 'application/javascript' }));
    familyWorker = new Worker(workerUrl);
  } catch {
    familyWorker = false;
    return null;
  }
  familyWorker.onmessage = (event) => receiveFamily(event.data);
  // A worker that cannot run (a CSP that refuses blob: workers, say) fails here rather
  // than at construction. Everything it was asked for is built the old way instead,
  // and the worker is not tried again.
  familyWorker.onerror = () => {
    const waiting = [...inWorker.keys()];
    shutFamilyWorker(false);
    for (const id of waiting) settle(id, safeFamily(id));
  };
  return familyWorker;
}

function shutFamilyWorker(retryLater = true) {
  if (familyWorker) familyWorker.terminate();
  if (workerUrl) URL.revokeObjectURL(workerUrl);
  familyWorker = retryLater ? null : false;
  workerUrl = null;
}

const safeFamily = (id) => { try { return tngr2Family(id); } catch { return null; } };

function settle(id, family) {
  const job = inWorker.get(id);
  inWorker.delete(id);
  if (job) job.resolve(family);
  // An idle worker is let go after a few seconds; the next warm makes a new one.
  if (!inWorker.size) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!inWorker.size) shutFamilyWorker(true); }, 5000);
  }
}

function receiveFamily({ id, gain, flat, error }) {
  if (error || !flat) { settle(id, safeFamily(id)); return; }
  // The main thread may have built it meanwhile (a stage that could not wait): the
  // memo wins, so every caller keeps holding the same object.
  if (!built.has(id)) {
    const levels = flat.map((buffer, level) => {
      const length = Math.max(64, TNGR2_BASE_SAMPLES >> level) + 1;
      const frames = [];
      for (let k = 0; k < TNGR2_FRAMES; k++) frames.push(buffer.subarray(k * length, (k + 1) * length));
      return frames;
    });
    built.set(id, { id, levels, frames: TNGR2_FRAMES, gain });
  }
  settle(id, built.get(id));
}

/** Ask the worker for one family; resolves with it (or null if it cannot be built). */
function familyFromWorker(id) {
  if (built.has(id)) return Promise.resolve(built.get(id));
  const running = inWorker.get(id);
  if (running) return running.promise;
  const familyIndex = TNGR2_TABLE_IDS.indexOf(id);
  if (familyIndex < 0) return Promise.resolve(null);
  const worker = ensureFamilyWorker();
  if (!worker) return Promise.resolve(safeFamily(id));
  clearTimeout(idleTimer);
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  inWorker.set(id, { promise, resolve });
  // A copy, so its buffer can be transferred without taking the shared spectra with it.
  const spectra = familySpectra(familyIndex).slice();
  worker.postMessage({
    id, spectra, frames: TNGR2_FRAMES, harmonics: HARMONICS,
    mipLevels: TNGR2_MIP_LEVELS, baseSamples: TNGR2_BASE_SAMPLES,
  }, [spectra.buffer]);
  return promise;
}

/**
 * Expand families AHEAD of the moment they are needed.
 *
 * A family costs about 240ms of main thread to expand — thirty frames — and it used
 * to be paid at the first NOTE of the voice that wanted it, which is mid-bar with the
 * sequencer's queue draining underneath. Moving it into the stage's enter() hid it
 * behind the shutter, but enter() is already the heaviest task of a stage and a song
 * with two families put half a second of expansion inside it.
 *
 * So it moves earlier again, to the moment a cabinet is SELECTED — the one point in
 * the game where a long task is genuinely free, because the shutter is fully closed
 * and the screen behind it has not been drawn yet.
 *
 * `idle: false` is that case: expand INLINE, in the caller's own task, and let the
 * caller wait. Deferring instead — an idle callback, or a setTimeout on the browsers
 * that have no idle callback, which includes the phone this work exists for — hands
 * the expansion to a LATER task, and by then the shutter is opening. A 240ms job
 * cannot be interrupted once it starts, so a slice that lands anywhere near a visible
 * frame is a visible hitch; the only question is which frame wears it. Behind the
 * cover, waiting is invisible.
 *
 * `idle: true` keeps the spread-over-idle behaviour for any caller that is not
 * already covered. Nothing in the game is, today.
 *
 * `tngr2Family` stays synchronous and memoised, and remains the fallback for a dev
 * ?stage= URL that never passed through a cabinet at all: a late arrival still works,
 * it just pays the old price.
 *
 * Resolves when every id asked for is built. Unknown ids are dropped here rather than
 * thrown: this is a warm-up, and a warm-up that can fail the screen that starts it is
 * worse than one that quietly warms nothing.
 */
export function warmTngr2Families(ids = [], { idle = true, worker = false } = {}) {
  const wanted = [...new Set(ids)].filter((id) => id && !built.has(id));
  if (!wanted.length) return Promise.resolve([]);
  // Off the main thread when this page can, and nothing blocks at all; see
  // tngr2FamilyWorkerSource. Without a worker, the idle slices below.
  if (worker && ensureFamilyWorker()) return Promise.all(wanted.map(familyFromWorker));
  // Through tngr2Family, not buildFamily: another caller may have expanded this one
  // between the ask and the slice, and the memo is the whole point.
  const one = (id) => { try { return tngr2Family(id); } catch { return null; } };
  if (!idle) return Promise.resolve(wanted.map(one));
  const slice = typeof requestIdleCallback === 'function'
    ? (fn) => requestIdleCallback(fn)
    : (fn) => setTimeout(fn, 0);
  return Promise.all(wanted.map((id) => new Promise((resolve) => {
    slice(() => resolve(one(id)));
  })));
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
