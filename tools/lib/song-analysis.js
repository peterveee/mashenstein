// The engine's AnalyserNode readout, offline, over arbitrary PCM.
//
// This is a mirror of `AudioSys.musicAnalysis()` (src/engine/audio.js) — the
// feed every jukebox visualiser reacts to. It lived inside tools/render-video.js
// until the file-driven visualiser page needed the same numbers; rather than let
// a second copy exist, it moved here. tools/lib/render-bank.js was deleted for
// exactly that reason (a hand-maintained mirror that drifted twice), so there is
// a source-text test asserting render-video.js has no local copy of it.
//
// Pure JS, no node: imports, no DOM: this module is imported by a Node CLI
// (render-video.js) and bundled into a browser page (visualiser-entry.js), and
// tests/visualiser-page.js locks that property in.
//
// Everything here mirrors the Web Audio spec: Blackman window, magnitudes
// normalised by fftSize, exponential smoothing on the linear magnitudes, then dB
// mapped across [-100, -30] to 0..255.
import { loudness, gainToTarget, LOUDNESS_TARGET } from './loudness.js';

export const ANALYSIS_FFT = 256;         // audio.js: songAnalyser.fftSize
export const ANALYSIS_SMOOTHING = 0.72;  // audio.js: songAnalyser.smoothingTimeConstant
export const ANALYSIS_MIN_DB = -100;
export const ANALYSIS_MAX_DB = -30;
// Sample peak, not true peak: loudness() measures max(abs(v)) with no oversampled
// stage, and intersample peaks on a lossy decode routinely run 1-3 dB above it.
export const PEAK_CEILING_DB = -1.5;

/** In-place iterative radix-2 FFT. Exported so the beat detector reuses it. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const xr = re[i + k + half];
        const xi = im[i + k + half];
        const vr = xr * cr - xi * ci;
        const vi = xr * ci + xi * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + half] = ur - vr; im[i + k + half] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/**
 * The kit-presence state machine, mirroring _readPercussion().
 *
 * Two indices walking the same sorted list: `hitAt` is the playhead and
 * `heardFrom` the trailing edge of the four-beat window, so this stays O(1) a
 * frame instead of rescanning the song's hits every sixtieth of a second.
 *
 * Note the deliberate absence of a `tempo` multiplier on `beatSeconds`: the
 * engine's version is `60 / (this.bpm * this.tempo)`, but a render is laid down
 * at the tempo it is played at, so bpm alone is the whole story here.
 *
 * @returns {(t: number) => { drums: number, drumless: boolean, hit: number }}
 */
function percussionWalk(percussionAt, beatSeconds) {
  // Copy before sorting: callers hand us their own array (renderBankBrowser's
  // `percussion`, which render-video.js logs the length of afterwards).
  const hits = [...percussionAt].sort((a, b) => a - b);
  let hitAt = 0;
  let heardFrom = 0;
  let drums = 0;
  let hit = 0;
  return (t) => {
    const wasAt = hitAt;
    while (hitAt < hits.length && hits[hitAt] <= t) hitAt++;
    while (heardFrom < hitAt && hits[heardFrom] < t - beatSeconds * 4) heardFrom++;
    drums += (Math.min(1, (hitAt - heardFrom) / 4) - drums) * 0.08;
    const drumless = !(hitAt > 0 && hits[hitAt - 1] >= t - beatSeconds * 2);
    // The playhead advancing over a hit IS the frame that hit is heard, which is
    // the same test the engine makes when its pending queue drains. Full on the
    // frame it lands, then a fast fall, so a preset choreographed on `hit` cuts
    // identically in a rendered clip and in the browser.
    hit = hitAt > wasAt ? 1 : hit * 0.55;
    return { drums, drumless, hit };
  };
}

/**
 * Reproduce Audio.musicAnalysis() offline, one step per video frame.
 *
 * The engine reads a 256-point AnalyserNode (smoothingTimeConstant 0.72) once
 * per rendered frame, so a per-frame step over the samples lands on the same
 * numbers the jukebox screensaver sees.
 *
 * @param {Float32Array} samples        mono PCM
 * @param {number} bpm                  tempo for the procedural beat clock
 * @param {number[]} percussionAt       kit hit times in seconds; not mutated
 * @param {object} [opts]
 * @param {number} [opts.fps=60]        analysis steps per second
 * @param {number} [opts.frames]        how many steps; NOT derived from samples.length,
 *                                      because render-video's --frames=N smoke path
 *                                      renders fewer frames than the song is long
 * @param {number} [opts.sampleRate=44100]
 * @param {number} [opts.gain=1]        applied on read; 1 is bit-identical to no gain
 * @param {((t:number)=>number)|null} [opts.beatAt=null]  overrides the (t*bpm)/60 clock,
 *                                      for a detected beat grid that follows tempo drift
 * @param {boolean} [opts.waveform=false]  add a 256-byte time-domain window per frame.
 *                                      OFF by default: render-video has never produced it,
 *                                      so NEON CATHEDRAL and OSCILLOSCOPE OVERDRIVE fall
 *                                      back to their synthetic sine in rendered clips, and
 *                                      turning it on here would change their output.
 * @param {boolean} [opts.spectrumBytes=false]  hand out Uint8Array views into one flat
 *                                      buffer instead of a fresh Array per frame. The
 *                                      default Array is what render-video structured-clones
 *                                      over the CDP bridge; the views are for the page,
 *                                      where 14,400 x 128-element Arrays is real memory.
 */
export function analyseSong(samples, bpm, percussionAt = [], opts = {}) {
  const {
    fps = 60,
    frames: frameCount,
    sampleRate = 44100,
    gain = 1,
    beatAt = null,
    waveform: wantWaveform = false,
    spectrumBytes = false,
  } = opts;
  if (!Number.isFinite(frameCount)) throw new Error('analyseSong: opts.frames is required');

  const N = ANALYSIS_FFT;
  const BINS = N / 2;
  const TAU_SMOOTH = ANALYSIS_SMOOTHING;
  const MIN_DB = ANALYSIS_MIN_DB;
  const MAX_DB = ANALYSIS_MAX_DB;
  const nyquist = sampleRate / 2;

  const window = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    window[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / N) + 0.08 * Math.cos((4 * Math.PI * i) / N);
  }

  const smoothed = new Float64Array(BINS);
  const spectrum = new Uint8Array(BINS);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  // One flat buffer when the caller wants views, so each frame's `spectrum` is a
  // subarray rather than its own allocation.
  const spectrumStore = spectrumBytes ? new Uint8Array(frameCount * BINS) : null;
  const waveStore = wantWaveform ? new Uint8Array(frameCount * N) : null;

  // _analysisBand(lo, hi): mean of the byte bins covering [lo, hi), /255.
  const bandRange = (lo, hi) => {
    const a = Math.max(0, Math.floor((lo / nyquist) * BINS));
    const b = Math.min(BINS, Math.max(a + 1, Math.ceil((hi / nyquist) * BINS)));
    return [a, b];
  };
  const BASS = bandRange(55, 240);
  const MID = bandRange(240, 2200);
  const TREBLE = bandRange(2200, 9000);
  const band = ([a, b]) => {
    let sum = 0;
    for (let i = a; i < b; i++) sum += spectrum[i];
    return sum / ((b - a) * 255);
  };

  const kit = percussionWalk(percussionAt, 60 / bpm);

  const out = [];
  let bass = 0;
  let mid = 0;
  let treble = 0;
  let level = 0;
  let peak = 0;
  for (let f = 0; f < frameCount; f++) {
    const t = f / fps;
    const end = Math.round(t * sampleRate);
    // RMS over the unwindowed time-domain window, matching what the engine reads
    // out of getByteTimeDomainData(). The byte quantisation the live path goes
    // through is far below the resolution any of this drives.
    let square = 0;
    for (let i = 0; i < N; i++) {
      const at = end - N + i;
      const s = (at >= 0 && at < samples.length ? samples[at] : 0) * gain;
      square += s * s;
    }
    const rms = Math.sqrt(square / N);
    for (let i = 0; i < N; i++) {
      const at = end - N + i;
      const s = (at >= 0 && at < samples.length ? samples[at] : 0) * gain;
      re[i] = s * window[i];
      im[i] = 0;
      if (waveStore) {
        waveStore[f * N + i] = Math.max(0, Math.min(255, Math.round(s * 128 + 128)));
      }
    }
    fft(re, im);
    for (let k = 0; k < BINS; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / N;
      smoothed[k] = TAU_SMOOTH * smoothed[k] + (1 - TAU_SMOOTH) * mag;
      const db = smoothed[k] > 0 ? 20 * Math.log10(smoothed[k]) : MIN_DB;
      const scaled = (255 * (db - MIN_DB)) / (MAX_DB - MIN_DB);
      spectrum[k] = Math.max(0, Math.min(255, Math.round(scaled)));
    }
    // The extra feature-level one-pole from musicAnalysis().
    bass += (band(BASS) - bass) * 0.34;
    mid += (band(MID) - mid) * 0.30;
    treble += (band(TREBLE) - treble) * 0.38;
    // Loudness, same shape as musicAnalysis(): fast attack / slow release on the
    // level, a reference that jumps to new peaks and decays over ~30s, and a
    // perceptual square root on the ratio. A rendered clip has to slow down in
    // the same places the live jukebox does.
    level += (rms - level) * (rms > level ? 0.45 : 0.12);
    if (level > peak) peak = level;
    else peak += (level - peak) * 0.0006;
    const dynamics = peak > 0.01 ? Math.max(0, Math.min(1, Math.sqrt(level / peak))) : 0;

    const { drums, drumless, hit } = kit(t);

    const beat = beatAt ? beatAt(t) : (t * bpm) / 60;
    const beatPhase = ((beat % 1) + 1) % 1;
    let spectrumOut;
    if (spectrumStore) {
      spectrumStore.set(spectrum, f * BINS);
      spectrumOut = spectrumStore.subarray(f * BINS, (f + 1) * BINS);
    } else {
      spectrumOut = Array.from(spectrum);
    }
    const frame = {
      bass, mid, treble, level, dynamics, drums, drumless, hit, beat, beatPhase,
      beatPulse: Math.pow(1 - beatPhase, 5),
      spectrum: spectrumOut,
    };
    if (waveStore) frame.waveform = waveStore.subarray(f * N, (f + 1) * N);
    out.push(frame);
  }
  return out;
}

/**
 * Loudness-normalise a decoded file into the mono buffer the analysis reads, and
 * report the gain the playback graph has to apply to match it.
 *
 * The gain is NOT baked into `mono`: analyseSong applies it on read, so toggling
 * normalisation re-runs the analysis without recomputing the downmix, and the
 * beat detector (whose envelopes are scale-free anyway) can share the buffer.
 *
 * Why normalise at all: `bass`/`mid`/`treble` come from spectrum bytes mapped
 * over an ABSOLUTE dB window of [-100, -30], per the Web Audio spec. A hot master
 * drives bins past -30 dBFS, they clamp at 255, and all three bands sit pinned
 * near 1.0 and stop moving — and `bass` alone is referenced 88 times across the
 * preset pack. What this does NOT fix is `dynamics`: it is
 * sqrt(level / rollingPeak), so scaling every sample scales both halves and
 * leaves it exactly where it was. A brickwalled master reads flat because it is
 * limited, not because it is loud. See applyDynamicsCurve for that.
 *
 * @param {{ channels: Float32Array[], sampleRate: number,
 *           target?: number, ceilingDb?: number }} spec
 */
export function prepareSong({
  channels, sampleRate, target = LOUDNESS_TARGET, ceilingDb = PEAK_CEILING_DB, normalise = true,
}) {
  const chans = channels.filter(Boolean);
  if (!chans.length) throw new Error('prepareSong: no channels');
  const n = chans[0].length;
  // One channel, the way the game's own AnalyserNode sees the master. A wide
  // stereo master reads quieter in `level` than it sounds; that matches what
  // render-video.js does, which is what matters.
  const mono = new Float32Array(n);
  for (const ch of chans) for (let i = 0; i < n; i++) mono[i] += ch[i];
  if (chans.length > 1) for (let i = 0; i < n; i++) mono[i] /= chans.length;

  const { lufs, peakDb } = loudness(chans, sampleRate);
  const wantedDb = gainToTarget(lufs, target);
  const headroomDb = Number.isFinite(peakDb) ? ceilingDb - peakDb : wantedDb;
  // `normalise: false` still measures and reports — it only declines to act. That is
  // the right default for our OWN songs: render-video.js renders them at unity
  // (`const norm = 1` — "the mix is the point"), so normalising here would make this
  // page disagree with a clip of the same song for no reason a viewer could see.
  const appliedDb = normalise ? Math.min(wantedDb, headroomDb) : 0;
  return {
    mono,
    sampleRate,
    seconds: n / sampleRate,
    gain: 10 ** (appliedDb / 20),
    appliedDb,
    wantedDb,
    headroomDb,
    lufs,
    peakDb,
    normalised: normalise,
    limited: normalise && appliedDb < wantedDb - 1e-9,
  };
}

/**
 * Re-derive `beat`, `beatPhase` and `beatPulse` over a finished frame table.
 *
 * No FFT, so a BPM edit, a tap tempo or a phase nudge is instant on a table that
 * took seconds to build. Mutates in place and returns the same array.
 */
export function retimeBeats(frames, { fps = 60, bpm = 120, t0 = 0, beatAt = null } = {}) {
  for (let f = 0; f < frames.length; f++) {
    const t = f / fps;
    const beat = beatAt ? beatAt(t) : ((t - t0) * bpm) / 60;
    const beatPhase = ((beat % 1) + 1) % 1;
    frames[f].beat = beat;
    frames[f].beatPhase = beatPhase;
    frames[f].beatPulse = Math.pow(1 - beatPhase, 5);
  }
  return frames;
}

/**
 * Re-derive `drums`, `drumless` and `hit` from a new hit list — what the onset
 * sensitivity slider calls. Also no FFT. Mutates in place.
 */
export function retimePercussion(frames, percussionAt, { fps = 60, bpm = 120 } = {}) {
  const kit = percussionWalk(percussionAt, 60 / bpm);
  for (let f = 0; f < frames.length; f++) {
    const { drums, drumless, hit } = kit(f / fps);
    frames[f].drums = drums;
    frames[f].drumless = drumless;
    frames[f].hit = hit;
  }
  return frames;
}

/**
 * Remap `dynamics` over a finished table.
 *
 * The escape hatch for material with no dynamic range left in it. `dynamics`
 * drives MOTION_FLOOR/MOTION_EASE in the presets — the whole
 * slow-down-through-a-breakdown behaviour — and those constants were tuned
 * against our own mixes. A limited master sits near 1.0 for four minutes and
 * every song looks like one long chorus; `gamma` above 1 pushes the quiet half
 * back down, `floor` stops it stalling completely.
 *
 * Deliberately a post-pass and never part of analyseSong: the mirror stays
 * locked to what the engine does.
 */
export function applyDynamicsCurve(frames, { gamma = 1, floor = 0 } = {}) {
  if (gamma === 1 && floor === 0) return frames;
  for (const f of frames) {
    const shaped = gamma === 1 ? f.dynamics : Math.pow(f.dynamics, gamma);
    f.dynamics = floor + (1 - floor) * shaped;
  }
  return frames;
}
