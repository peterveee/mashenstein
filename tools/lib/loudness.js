// Loudness measurement, ITU-R BS.1770-4 / EBU R128 style.
//
// Peak is the wrong number for balancing songs against each other: a track full of
// sharp transients peaks high and sounds quiet, and a smooth pad does the reverse.
// Every musicTrim in the game was set by ear against peak-normalised renders from a
// renderer we now know was spectrally wrong, so "why is this song louder than that
// one" has never had a number attached to it. This gives it one.
//
// Implemented rather than pulled in because the repo has no runtime dependencies and
// this is ~80 lines: K-weighting (a high shelf plus a highpass), mean square over
// 400ms blocks at 75% overlap, then the two-stage relative gate.

const SR = 44100;

// Biquad from BS.1770-4 Tables 1 and 2, specified at 48kHz. Rather than hardcode
// those coefficients at the wrong rate, derive both stages analytically so the
// measurement is right at whatever rate the render used.
function highShelf(fs, f0 = 1681.97, gainDb = 3.999, Q = 0.7071) {
  const A = 10 ** (gainDb / 40);
  const w0 = 2 * Math.PI * f0 / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const cs = Math.cos(w0), sq = 2 * Math.sqrt(A) * alpha;
  const b0 = A * ((A + 1) + (A - 1) * cs + sq);
  const b1 = -2 * A * ((A - 1) + (A + 1) * cs);
  const b2 = A * ((A + 1) + (A - 1) * cs - sq);
  const a0 = (A + 1) - (A - 1) * cs + sq;
  const a1 = 2 * ((A - 1) - (A + 1) * cs);
  const a2 = (A + 1) - (A - 1) * cs - sq;
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

function highPass(fs, f0 = 38.13, Q = 0.5003) {
  const w0 = 2 * Math.PI * f0 / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const cs = Math.cos(w0);
  const b0 = (1 + cs) / 2, b1 = -(1 + cs), b2 = (1 + cs) / 2;
  const a0 = 1 + alpha, a1 = -2 * cs, a2 = 1 - alpha;
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

function filterInto(src, dst, [b0, b1, b2, a1, a2]) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < src.length; i++) {
    const x = src[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    dst[i] = y;
  }
}

/**
 * Integrated loudness in LUFS for one or two channels.
 * @param {Float32Array[]} channels  [L] or [L, R]
 * @param {number} [sampleRate=44100]
 * @returns {{ lufs: number, peakDb: number, blocks: number }} lufs is -Infinity for silence
 */
export function loudness(channels, sampleRate = SR) {
  const chans = channels.filter(Boolean);
  const n = chans[0].length;
  const shelf = highShelf(sampleRate);
  const hp = highPass(sampleRate);

  // Per-channel K-weighted mean square, summed with BS.1770 channel weights
  // (1.0 for L and R; the surround channels this game does not have get 1.41).
  const blockLen = Math.round(0.4 * sampleRate);
  const hop = Math.round(0.1 * sampleRate);          // 75% overlap
  const nBlocks = Math.max(0, Math.floor((n - blockLen) / hop) + 1);
  if (!nBlocks) return { lufs: -Infinity, peakDb: -Infinity, blocks: 0 };

  const blockPower = new Float64Array(nBlocks);
  const tmp = new Float64Array(n);
  const filt = new Float64Array(n);
  let peak = 0;

  for (const ch of chans) {
    for (let i = 0; i < n; i++) {
      const v = ch[i];
      tmp[i] = v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
    filterInto(tmp, filt, shelf);
    filterInto(filt, tmp, hp);
    for (let b = 0; b < nBlocks; b++) {
      const s = b * hop;
      let acc = 0;
      for (let i = 0; i < blockLen; i++) { const v = tmp[s + i]; acc += v * v; }
      blockPower[b] += acc / blockLen;   // channel weight 1.0
    }
  }

  const lk = (p) => -0.691 + 10 * Math.log10(p);

  // Two-stage gate: drop everything below -70 LUFS absolute, then everything
  // more than 10 LU below the mean of what survived.
  let sum = 0, count = 0;
  for (let b = 0; b < nBlocks; b++) {
    if (blockPower[b] > 0 && lk(blockPower[b]) > -70) { sum += blockPower[b]; count++; }
  }
  if (!count) return { lufs: -Infinity, peakDb: peak > 0 ? 20 * Math.log10(peak) : -Infinity, blocks: nBlocks };

  const relGate = lk(sum / count) - 10;
  let sum2 = 0, count2 = 0;
  for (let b = 0; b < nBlocks; b++) {
    if (blockPower[b] > 0 && lk(blockPower[b]) > -70 && lk(blockPower[b]) > relGate) {
      sum2 += blockPower[b]; count2++;
    }
  }
  const lufs = count2 ? lk(sum2 / count2) : lk(sum / count);
  return { lufs, peakDb: peak > 0 ? 20 * Math.log10(peak) : -Infinity, blocks: nBlocks };
}

/** How many dB to move a track to land on a target loudness. */
export const gainToTarget = (lufs, target = -16) => (Number.isFinite(lufs) ? target - lufs : 0);
