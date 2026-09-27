// Where a render's energy sits, band by band — for comparing the tonal balance of
// songs against each other (tools/bass-report.js). Loudness is tools/lib/loudness.js;
// this is the other half of "why do these two songs sound different at the same
// level".
import { fft } from './song-analysis.js';

const N = 8192;
const HANN = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
const HANN_POWER = HANN.reduce((a, w) => a + w * w, 0);

/**
 * Mean-square energy inside each [lo, hi) Hz band, averaged over the whole render.
 *
 * Welch's method: 8192-point Hann frames at 50% overlap, channels averaged to mono
 * first (the game's bass is centred; a side-only low end would read low here, which
 * is also how it plays on a phone speaker). Scaled so a band's value is comparable
 * with a time-domain mean square: 10*log10 of it is that band's level in dBFS, and
 * the bands of a full-range split sum back to the render's own power.
 *
 * Every frame counts, silence included — this is an energy budget, not a loudness,
 * and a gate would weigh a sparse lane's notes differently from a held pad's.
 *
 * @param {Float32Array[]} channels  [L] or [L, R]
 * @param {number} sampleRate
 * @param {[number, number][]} bands  [lo, hi) in Hz
 * @returns {number[]} mean square per band
 */
export function bandEnergies(channels, sampleRate, bands) {
  const chans = channels.filter(Boolean);
  const frames = chans[0].length;
  const mono = new Float64Array(frames);
  for (const ch of chans) for (let i = 0; i < frames; i++) mono[i] += ch[i] / chans.length;
  const bins = bands.map(([lo, hi]) => [Math.ceil((lo * N) / sampleRate), Math.min(N / 2, Math.ceil((hi * N) / sampleRate))]);
  const sums = new Float64Array(bands.length);
  const re = new Float64Array(N), im = new Float64Array(N);
  let count = 0;
  for (let start = 0; start + N <= frames; start += N / 2) {
    for (let i = 0; i < N; i++) { re[i] = mono[start + i] * HANN[i]; im[i] = 0; }
    fft(re, im);
    bins.forEach(([a, b], j) => { for (let k = a; k < b; k++) sums[j] += re[k] * re[k] + im[k] * im[k]; });
    count++;
  }
  // x2: the one-sided spectrum folds the negative frequencies in.
  return Array.from(sums, (s) => (count ? (2 * s) / (N * HANN_POWER * count) : 0));
}
