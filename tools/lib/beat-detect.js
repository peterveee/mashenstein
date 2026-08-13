// Tempo, beat grid and drum onsets, estimated from raw PCM.
//
// The game never needed any of this: the sequencer knows exactly where every
// beat and every kit hit is, and `songBeat()`/`_readPercussion()` just read that
// out. An imported MP3 has no such thing, so everything here is an ESTIMATE, and
// the page that uses it is built with the manual overrides as the primary
// interface and detection as the convenience — not the other way round.
//
// Deliberately separate from tools/lib/song-analysis.js: nothing in this file is
// on the byte-identical path that render-video.js depends on, so it can be tuned
// without anyone having to re-argue a rendered clip's output.
//
// Pure JS — no node: imports, no DOM. Bundled into the browser page and run
// directly under node by tests/beat-detect.js.
//
// Note this cannot reuse the engine's own 256-point FFT: at 44.1kHz that is
// 172Hz per bin over a 5.8ms window, which puts kick, bass and everything below
// 172Hz into bin 0. Detection needs its own, much longer, transform.
import { fft } from './song-analysis.js';

export const STFT_SIZE = 2048;   // 46ms at 44.1kHz
export const STFT_HOP = 512;     // -> 86.13 envelope frames a second
const LOG_LAMBDA = 1000;         // SuperFlux's log-compression constant

const TEMPO_MIN = 60;
const TEMPO_MAX = 180;
// Searched wider than the range we will report, so the octave logic has somewhere
// to look before folding its answer back inside.
const SEARCH_MIN = 37;
const SEARCH_MAX = 258;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Log-Gaussian preference for tempi near 120, Parncutt/Klapuri style.
 *
 * Every periodicity measure is octave-blind — a track is self-similar at half and
 * double its tempo too — so something has to encode "which of these would a
 * person tap". Sigma is 0.9 octaves, wide enough that 63 and 172 BPM material
 * still survives on the strength of its own evidence.
 */
const tempoPrior = (bpm) => Math.exp(-0.5 * ((Math.log2(bpm / 120) / 0.9) ** 2));

/**
 * Median of a window, by copy-and-sort. The windows here are ~34 long and this
 * runs once per envelope frame, so the naive version is a few tens of ms over a
 * four-minute track and not worth a heap for.
 */
function windowMedian(src, from, to, scratch) {
  const n = to - from;
  for (let i = 0; i < n; i++) scratch[i] = src[from + i];
  const view = scratch.subarray(0, n);
  view.sort();
  return n % 2 ? view[(n - 1) >> 1] : (view[n / 2 - 1] + view[n / 2]) / 2;
}

/**
 * Flatten a raw flux curve into something scale-free.
 *
 * Subtract a moving median (kills slow level drift, so a loud chorus does not
 * swamp a quiet verse), half-wave rectify, then divide by a sliding mean of what
 * is left. The result is that one sensitivity threshold means the same thing on a
 * folk record and on a techno record.
 */
function normaliseEnvelope(raw, frameRate) {
  const n = raw.length;
  const medianWin = Math.max(3, Math.round(0.4 * frameRate));
  const scaleWin = Math.max(medianWin, Math.round(2.0 * frameRate));
  const scratch = new Float32Array(medianWin);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const from = Math.max(0, i - (medianWin >> 1));
    const to = Math.min(n, from + medianWin);
    out[i] = Math.max(0, raw[i] - windowMedian(raw, from, to, scratch));
  }
  // Sliding-window mean of the rectified curve, via a prefix sum: O(n), and a
  // perfectly good robust scale once the median has already removed the floor.
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + out[i];
  const scaled = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const from = Math.max(0, i - (scaleWin >> 1));
    const to = Math.min(n, from + scaleWin);
    const mean = (prefix[to] - prefix[from]) / Math.max(1, to - from);
    scaled[i] = out[i] / (mean + 1e-9);
  }
  return scaled;
}

/**
 * Spectral flux onset envelopes, in the SuperFlux form.
 *
 * A generator so a browser can drive it with a yield between chunks and keep a
 * progress bar alive: this is the dominant cost of loading a file (~2.5s for a
 * four-minute track, against ~0.15s for the whole analyseSong pass). Callers that
 * do not care use the plain `onsetEnvelope` wrapper below.
 *
 * The `maxfilt3` term — comparing against a 3-bin maximum of an EARLIER frame
 * rather than against that frame directly — is what stops vibrato and portamento
 * registering as onsets. mu=2 (~23ms) gives it something to bite on; the
 * percussive envelope uses mu=1 to stay transient-sharp instead.
 *
 * Yields a 0..1 progress fraction; returns
 * `{ full, low, percussive, frameRate, hop, size, offset }`.
 */
export function* onsetEnvelopeSteps(mono, sampleRate, opts = {}) {
  const N = opts.size || STFT_SIZE;
  const H = opts.hop || STFT_HOP;
  const BINS = N / 2;
  const frameRate = sampleRate / H;
  const count = Math.max(0, Math.floor((mono.length - N) / H) + 1);

  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);

  const binOf = (hz) => clamp(Math.round((hz * N) / sampleRate), 0, BINS - 1);
  const FULL = [binOf(30), binOf(11000)];
  const LOW = [binOf(30), binOf(120)];
  const HIGH = [binOf(2000), binOf(10000)];

  const re = new Float64Array(N);
  const im = new Float64Array(N);
  // Only three frames of log-magnitude are ever live at once (n, n-1, n-2), so
  // this is a ring rather than a spectrogram — a full one would be ~170MB.
  const ring = [new Float32Array(BINS), new Float32Array(BINS), new Float32Array(BINS)];

  const rawFull = new Float32Array(count);
  const rawLow = new Float32Array(count);
  const rawPerc = new Float32Array(count);

  const chunk = 256;
  for (let n = 0; n < count; n++) {
    const start = n * H;
    for (let i = 0; i < N; i++) {
      const at = start + i;
      re[i] = (at < mono.length ? mono[at] : 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const cur = ring[n % 3];
    for (let k = 0; k < BINS; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / N;
      cur[k] = Math.log(1 + LOG_LAMBDA * mag);
    }
    if (n >= 2) {
      const prev1 = ring[(n + 2) % 3];
      const prev2 = ring[(n + 1) % 3];
      let full = 0;
      let low = 0;
      let perc = 0;
      for (let k = FULL[0]; k <= FULL[1]; k++) {
        const lo = k > 0 ? k - 1 : k;
        const hi = k < BINS - 1 ? k + 1 : k;
        const ref2 = Math.max(prev2[lo], prev2[k], prev2[hi]);
        const d2 = cur[k] - ref2;
        if (d2 > 0) {
          full += d2;
          if (k >= LOW[0] && k <= LOW[1]) low += d2;
        }
        // The percussive band skips 200Hz-2kHz, where the melody lives, and
        // looks only one frame back so a transient stays a transient.
        if ((k >= LOW[0] && k <= LOW[1]) || (k >= HIGH[0] && k <= HIGH[1])) {
          const ref1 = Math.max(prev1[lo], prev1[k], prev1[hi]);
          const d1 = cur[k] - ref1;
          if (d1 > 0) perc += d1;
        }
      }
      rawFull[n] = full;
      rawLow[n] = low;
      rawPerc[n] = perc;
    }
    if (n % chunk === chunk - 1) yield (n + 1) / count;
  }

  return {
    full: normaliseEnvelope(rawFull, frameRate),
    low: normaliseEnvelope(rawLow, frameRate),
    percussive: normaliseEnvelope(rawPerc, frameRate),
    frameRate,
    hop: H,
    size: N,
    // Envelope frame n describes the window starting at sample n*H, so the event
    // it reports sits at the window's centre.
    offset: N / 2 / sampleRate,
  };
}

/** Synchronous `onsetEnvelopeSteps`. */
export function onsetEnvelope(mono, sampleRate, opts = {}) {
  const it = onsetEnvelopeSteps(mono, sampleRate, opts);
  let step = it.next();
  while (!step.done) step = it.next();
  return step.value;
}

/** Autocorrelation of an envelope at one lag, normalised by the overlap length. */
function acfAt(env, lag) {
  const n = env.length - lag;
  if (n <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += env[i] * env[i + lag];
  return sum / n;
}

/** Best phase for a given period: where the beats sit on the strongest onsets. */
function bestPhase(env, periodFrames) {
  if (!(periodFrames > 1)) return 0;
  const steps = 100;
  let best = -Infinity;
  let at = 0;
  for (let s = 0; s < steps; s++) {
    const phase = (s / steps) * periodFrames;
    let sum = 0;
    let count = 0;
    for (let x = phase; x < env.length - 1; x += periodFrames) {
      const i = Math.floor(x);
      const frac = x - i;
      sum += env[i] * (1 - frac) + env[i + 1] * frac;
      count++;
    }
    if (!count) continue;
    const score = sum / count;
    if (score > best) { best = score; at = phase; }
  }
  return at;
}

/**
 * How well a beat period explains an envelope — the octave discriminator.
 *
 * Mean onset strength at the beat positions is NOT enough on its own, and getting
 * that wrong halves every tempo: a grid at half speed samples only the strongest
 * subset of the hits, so its mean is as good or better than the true grid's.
 * Sparsity has to cost something.
 *
 * So score by coverage TIMES strength. Coverage is the share of all onset energy
 * that lands near some beat, which collapses at half tempo because every other
 * hit goes unexplained. Strength is the mean peak under each beat, which collapses
 * at double tempo because half the beats sit over silence. The product peaks on
 * the real thing.
 */
function gridQuality(env, periodFrames) {
  if (!(periodFrames > 1)) return { phase: 0, coverage: 0, strength: 0, score: 0 };
  const phase = bestPhase(env, periodFrames);
  const n = env.length;
  const tol = Math.max(2, Math.round(periodFrames * 0.125));
  const covered = new Uint8Array(n);
  let strengthSum = 0;
  let beats = 0;
  for (let x = phase; x < n - 1; x += periodFrames) {
    const i = Math.round(x);
    let peak = 0;
    for (let k = Math.max(0, i - tol); k <= Math.min(n - 1, i + tol); k++) {
      covered[k] = 1;
      if (env[k] > peak) peak = env[k];
    }
    strengthSum += peak;
    beats++;
  }
  if (!beats) return { phase, coverage: 0, strength: 0, score: 0 };
  let hit = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += env[i];
    if (covered[i]) hit += env[i];
  }
  const coverage = total > 0 ? hit / total : 0;
  const strength = strengthSum / beats;
  return { phase, coverage, strength, score: coverage * strength };
}

/** Sub-lag refinement from three samples around a peak. */
function parabolic(yLeft, yMid, yRight) {
  const denom = yLeft - 2 * yMid + yRight;
  if (!denom) return 0;
  return clamp((0.5 * (yLeft - yRight)) / denom, -1, 1);
}

/**
 * Tempo, with the octave decided rather than guessed.
 *
 * Two things do that work. The harmonic comb — scoring a lag by its own
 * autocorrelation plus its 2x/3x/4x multiples — separates a real tempo, whose
 * multiples all light up, from a half-tempo that only correlates with itself. And
 * a log-Gaussian prior centred on 120 BPM stops 75 BPM hip-hop reading as 150 and
 * 172 BPM drum-and-bass reading as 86.
 *
 * @returns {{ bpm, confidence, phase, candidates, drift }}
 */
export function estimateTempo(env, frameRate, opts = {}) {
  const min = opts.min || TEMPO_MIN;
  const max = opts.max || TEMPO_MAX;
  const lagOf = (bpm) => (frameRate * 60) / bpm;
  const loLag = Math.max(2, Math.floor(lagOf(SEARCH_MAX)));
  const hiLag = Math.min(env.length - 2, Math.ceil(lagOf(SEARCH_MIN)));
  if (hiLag <= loLag) return { bpm: 120, confidence: 0, phase: 0, candidates: [], drift: 0 };

  const acf = new Float64Array(hiLag + 1);
  for (let lag = loLag; lag <= hiLag; lag++) acf[lag] = acfAt(env, lag);

  const HARMONIC_W = [1, 0.5, 0.25, 0.125];
  const comb = new Float64Array(hiLag + 1);
  for (let lag = loLag; lag <= hiLag; lag++) {
    let score = 0;
    for (let h = 1; h <= HARMONIC_W.length; h++) {
      const at = Math.round(h * lag);
      if (at <= hiLag) score += HARMONIC_W[h - 1] * acf[at];
    }
    comb[lag] = score * tempoPrior((frameRate * 60) / lag);
  }

  let peakLag = loLag;
  for (let lag = loLag; lag <= hiLag; lag++) if (comb[lag] > comb[peakLag]) peakLag = lag;

  let refined = peakLag;
  if (peakLag > loLag && peakLag < hiLag) {
    refined = peakLag + parabolic(comb[peakLag - 1], comb[peakLag], comb[peakLag + 1]);
  }
  let bpm = (frameRate * 60) / refined;

  // Fold whatever won into the reportable range, then put its neighbours on the
  // ballot too so the page's x2 / /2 buttons have somewhere real to go — and so
  // the octave is decided by how well each grid explains the onsets rather than
  // by whichever lag the autocorrelation happened to like best.
  const fold = (v) => {
    let out = v;
    while (out < min) out *= 2;
    while (out > max) out /= 2;
    return out;
  };
  bpm = fold(bpm);
  // Refine EACH octave before comparing them, not the winner afterwards. The comb
  // peak is a whole-lag integer, so its x2 lands a fraction of a BPM off the real
  // tempo — and half a percent is a beat and a half of drift across four minutes,
  // enough to cost that octave the coverage it needed to win. Judging unrefined
  // candidates hands the vote to whichever octave happened to land squarest.
  const refine = (seed, span, step) => {
    let best = { bpm: seed, ...gridQuality(env, lagOf(seed)) };
    for (let d = -span; d <= span + 1e-9; d += step) {
      const cand = seed * (1 + d / 100);
      if (cand < min || cand > max) continue;
      const q = gridQuality(env, lagOf(cand));
      if (q.score > best.score) best = { bpm: cand, ...q };
    }
    return best;
  };

  const candidates = [];
  for (const mult of [0.25, 0.5, 1, 2, 4]) {
    const seed = bpm * mult;
    if (seed < min || seed > max) continue;
    const r = refine(seed, 3, 0.25);
    // The prior votes here too. Without it, any track whose backbeat is weaker
    // than its kick reads as half speed, because such a track genuinely IS more
    // self-similar at half speed — the autocorrelation is not wrong, it is
    // answering a different question than "what would you tap".
    candidates.push({ ...r, score: r.score * tempoPrior(r.bpm) });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates.length ? refine(candidates[0].bpm, 0.5, 0.02) : { bpm, ...gridQuality(env, lagOf(bpm)) };

  return {
    bpm: best.bpm,
    // How much of the onset energy the winning grid actually explains, 0..1.
    // Directly meaningful in the UI, unlike a ratio of autocorrelation peaks.
    confidence: best.coverage,
    phase: best.phase,
    candidates,
  };
}

/**
 * Dynamic-programming beat tracker (Ellis), so the grid follows a human drummer
 * instead of assuming a click track.
 *
 * One backward accumulation and one traceback: each frame takes the best score
 * reachable from a plausible predecessor, penalised by how far that gap strays
 * from the estimated period, plus its own onset strength.
 *
 * `barBeats` is a field, not an inference — the downbeat scorer below assumes 4,
 * and 3/4 material has to be told.
 *
 * @returns {{ beatTimes: Float64Array, period: number, downbeat: number }}
 */
export function trackBeats(env, frameRate, bpm, opts = {}) {
  const tightness = opts.tightness ?? 100;
  const period = (frameRate * 60) / bpm;
  const n = env.length;
  if (n < 4 || !(period > 1)) return { beatTimes: new Float64Array(0), period, downbeat: 0 };

  // Score against its own spread, so `tightness` means the same thing whatever
  // the material.
  let mean = 0;
  for (let i = 0; i < n; i++) mean += env[i];
  mean /= n;
  let varSum = 0;
  for (let i = 0; i < n; i++) varSum += (env[i] - mean) ** 2;
  const std = Math.sqrt(varSum / n) || 1;
  const local = new Float64Array(n);
  for (let i = 0; i < n; i++) local[i] = env[i] / std;

  const from = Math.max(1, Math.round(period / 2));
  const to = Math.max(from + 1, Math.round(2 * period));
  const txwt = new Float64Array(to + 1);
  for (let d = from; d <= to; d++) txwt[d] = -tightness * (Math.log(d / period) ** 2);

  const score = new Float64Array(n);
  const backlink = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    let best = -Infinity;
    let bestJ = -1;
    for (let d = from; d <= to; d++) {
      const j = i - d;
      if (j < 0) break;
      const cand = txwt[d] + score[j];
      if (cand > best) { best = cand; bestJ = j; }
    }
    if (bestJ < 0) score[i] = local[i];
    else { score[i] = local[i] + best; backlink[i] = bestJ; }
  }

  // Start the traceback at the last strong local maximum, not simply the end:
  // the tail of a track fades, and anchoring on it drags the whole grid.
  let peakMedian = 0;
  const peaks = [];
  for (let i = 1; i < n - 1; i++) if (score[i] > score[i - 1] && score[i] >= score[i + 1]) peaks.push(score[i]);
  if (peaks.length) {
    peaks.sort((a, b) => a - b);
    peakMedian = peaks[peaks.length >> 1];
  }
  let last = -1;
  for (let i = n - 2; i > 0; i--) {
    if (score[i] > score[i - 1] && score[i] >= score[i + 1] && score[i] > 0.5 * peakMedian) { last = i; break; }
  }
  if (last < 0) { let m = 0; for (let i = 1; i < n; i++) if (score[i] > score[m]) m = i; last = m; }

  const idx = [];
  for (let i = last; i >= 0; i = backlink[i]) {
    idx.push(i);
    if (backlink[i] < 0) break;
  }
  idx.reverse();
  const beatTimes = new Float64Array(idx.length);
  for (let i = 0; i < idx.length; i++) beatTimes[i] = idx[i] / frameRate;
  return { beatTimes, period, indices: idx };
}

/**
 * Which beat of the bar is beat one.
 *
 * Kick-on-1 is the most reliable single cue in popular music, so score each
 * candidate by low-band onset energy at the beats it would make downbeats.
 */
export function pickDownbeat(lowEnv, frameRate, beatIndices, barBeats = 4) {
  let best = 0;
  let bestScore = -Infinity;
  for (let b = 0; b < barBeats; b++) {
    let sum = 0;
    for (let i = b; i < beatIndices.length; i += barBeats) {
      const at = beatIndices[i];
      // A window, not a sample: the tracked beat can sit a frame either side of
      // where the kick actually speaks.
      for (let k = Math.max(0, at - 1); k <= Math.min(lowEnv.length - 1, at + 1); k++) {
        sum += lowEnv[k];
      }
    }
    if (sum > bestScore) { bestScore = sum; best = b; }
  }
  return best;
}

/**
 * Kit hits, for the `hit` / `drums` / `drumless` fields.
 *
 * Honest limitation: this is a full-mix detector, so even band-limited it fires
 * on plenty that is not a drum. `drums` saturates at four hits per four beats, so
 * on a dense commercial master it will sit at 1.0 and `drumless` will essentially
 * never fire. The upgrade if that matters is median-filter HPSS.
 */
export function pickOnsets(env, frameRate, opts = {}) {
  const delta = opts.delta ?? 0.3;
  const offset = opts.offset ?? 0;
  const refractory = Math.max(1, Math.round((opts.refractory ?? 0.03) * frameRate));
  const out = [];
  let last = -Infinity;
  for (let i = 3; i < env.length - 3; i++) {
    const v = env[i];
    if (v <= 0) continue;
    let isPeak = true;
    for (let k = i - 3; k <= i + 3; k++) {
      if (env[k] > v) { isPeak = false; break; }
    }
    if (!isPeak || i - last < refractory) continue;
    let sum = 0;
    let count = 0;
    for (let k = Math.max(0, i - 10); k <= Math.min(env.length - 1, i + 3); k++) { sum += env[k]; count++; }
    if (v < sum / count + delta) continue;
    out.push(i / frameRate + offset);
    last = i;
  }
  return out;
}

/**
 * The half-window analysis lag is systematic, so correct it once against the beat
 * grid rather than per onset. Returns the shift in seconds to add to every hit.
 */
function alignOnsets(onsets, beatTimes, period) {
  if (!onsets.length || beatTimes.length < 2) return 0;
  let best = 0;
  let bestScore = -Infinity;
  const sigma = 0.02;
  for (let shift = -0.04; shift <= 0.04001; shift += 0.002) {
    let score = 0;
    for (const t of onsets) {
      const at = t + shift;
      // Nearest beat by index, so this stays linear rather than scanning the grid.
      const i = clamp(Math.round((at - beatTimes[0]) / period), 0, beatTimes.length - 1);
      const d = at - beatTimes[i];
      score += Math.exp(-0.5 * (d / sigma) ** 2);
    }
    if (score > bestScore) { bestScore = score; best = shift; }
  }
  return best;
}

/**
 * Everything at once: envelopes, tempo, a beat grid, a downbeat and a hit list.
 *
 * A generator for the same reason `onsetEnvelopeSteps` is — the page drives it
 * with a yield between stages so the progress bar moves. `detectRhythm` below is
 * the synchronous wrapper.
 *
 * Returns `{ bpm, confidence, drift, beatTimes, beatAt, t0, barBeats, downbeat,
 *            percussionAt, envelope }`.
 */
export function* detectRhythmSteps(mono, sampleRate, opts = {}) {
  const barBeats = opts.barBeats || 4;
  const envelope = yield* onsetEnvelopeSteps(mono, sampleRate, opts);
  const { full, low, percussive, frameRate, offset } = envelope;

  const tempo = estimateTempo(full, frameRate, opts);
  yield 1;
  const tracked = trackBeats(full, frameRate, tempo.bpm, opts);
  yield 1;

  const indices = tracked.indices || [];
  const downbeat = indices.length ? pickDownbeat(low, frameRate, indices, barBeats) : 0;
  // The tracked beat times land at envelope-frame centres, like the onsets do.
  const beatTimes = Float64Array.from(tracked.beatTimes, (t) => t + offset);

  const period = 60 / tempo.bpm;
  const rawOnsets = pickOnsets(percussive, frameRate, { ...opts, offset });
  const shift = alignOnsets(rawOnsets, beatTimes, period);
  const percussionAt = rawOnsets.map((t) => t + shift);

  return {
    ...buildGrid({ beatTimes, bpm: tempo.bpm, downbeat, barBeats }),
    confidence: tempo.confidence,
    // Straight off the tracked grid rather than a second tempo fit: if the
    // median gap between beats is wider at the end than at the start, a human
    // played this and a constant grid is about to fail on it.
    drift: beatDrift(beatTimes),
    candidates: tempo.candidates,
    percussionAt,
    envelope,
  };
}

/** Relative change in the median inter-beat interval, first third to last. */
function beatDrift(beatTimes) {
  if (beatTimes.length < 12) return 0;
  const gaps = [];
  for (let i = 1; i < beatTimes.length; i++) gaps.push(beatTimes[i] - beatTimes[i - 1]);
  const third = Math.floor(gaps.length / 3);
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[s.length >> 1];
  };
  const head = median(gaps.slice(0, third));
  const tail = median(gaps.slice(-third));
  return head > 0 ? Math.abs(tail - head) / head : 0;
}

/** Synchronous `detectRhythmSteps`. */
export function detectRhythm(mono, sampleRate, opts = {}) {
  const it = detectRhythmSteps(mono, sampleRate, opts);
  let step = it.next();
  while (!step.done) step = it.next();
  return step.value;
}

/**
 * Turn a beat list (or a bare tempo) into the `beatAt` clock analyseSong wants.
 *
 * Beat 0 has to land ON a downbeat and `beat` has to stay non-negative:
 * `ringRotationAt()` generates seeded 4/8/16-beat holds forward from beat 0 and
 * VJ MEGAMIX cycles on 16-bar phrases, so a grid that starts at 3.7 puts every
 * phrase boundary off the bar for the whole song.
 *
 * @param {object} spec
 * @param {Float64Array|number[]} [spec.beatTimes]  detected grid; omit for a constant tempo
 * @param {number} spec.bpm
 * @param {number} [spec.downbeat]  which index of beatTimes is beat one
 * @param {number} [spec.barBeats=4]
 * @param {number} [spec.t0=0]      downbeat time, for the constant-tempo path
 */
export function buildGrid({ beatTimes = null, bpm, downbeat = 0, barBeats = 4, t0 = 0 }) {
  const period = 60 / bpm;
  if (!beatTimes || beatTimes.length < 2) {
    // Constant tempo — what a typed BPM or a tap gives us.
    let base = t0;
    while (base > 0) base -= period * barBeats;
    return {
      bpm, barBeats, downbeat: 0, t0: base, beatTimes: null, beatOffset: 0,
      beatAt: (t) => ((t - base) * bpm) / 60,
      timeAt: (beat) => base + (beat * 60) / bpm,
    };
  }
  // Number the beats so downbeats are multiples of barBeats and beat 0 is not
  // in the past.
  let k = (barBeats - (downbeat % barBeats)) % barBeats;
  while ((k - beatTimes[0] / period) < 0) k += barBeats;
  const offsetK = k;
  const last = beatTimes.length - 1;
  const beatAt = (t) => {
    if (t <= beatTimes[0]) return offsetK + (t - beatTimes[0]) / period;
    if (t >= beatTimes[last]) return offsetK + last + (t - beatTimes[last]) / period;
    // Binary search rather than a scan: this is called once per analysis frame.
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (beatTimes[mid] <= t) lo = mid; else hi = mid;
    }
    const span = beatTimes[hi] - beatTimes[lo] || period;
    return offsetK + lo + (t - beatTimes[lo]) / span;
  };
  // The exact inverse, so callers that want "when is beat N" — drawing the grid,
  // scheduling a click — never have to bisect beatAt to find out.
  const timeAt = (beat) => {
    const x = beat - offsetK;
    if (x <= 0) return beatTimes[0] + x * period;
    if (x >= last) return beatTimes[last] + (x - last) * period;
    const i = Math.floor(x);
    return beatTimes[i] + (x - i) * (beatTimes[i + 1] - beatTimes[i]);
  };
  return { bpm, barBeats, downbeat, t0: beatTimes[downbeat] ?? 0, beatTimes, beatOffset: offsetK, beatAt, timeAt };
}
