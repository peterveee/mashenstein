// 16-bit PCM WAV writing. Split out of the old JS mirror of the engine, which is
// now retired: everything that makes samples goes through the real engine in
// render-bank-browser.js, and writes them out here. Stereo.
export const SR = 44100;

/**
 * @param {Float32Array|Float32Array[]} channels  one array (mono) or [L, R]
 * @param {number} [gain=1]
 * @returns {Buffer} a complete .wav
 */
export function wavBuffer(channels, gain = 1) {
  const chans = Array.isArray(channels) ? channels : [channels];
  const nch = chans.length;
  const frames = chans[0].length;
  const data = Buffer.alloc(frames * nch * 2);
  let o = 0;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++) {
      const v = Math.round(chans[c][i] * gain * 32767);
      data.writeInt16LE(Math.max(-32768, Math.min(32767, v)), o);
      o += 2;
    }
  }
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
  hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(nch, 22);
  hdr.writeUInt32LE(SR, 24);
  hdr.writeUInt32LE(SR * nch * 2, 28);  // byte rate
  hdr.writeUInt16LE(nch * 2, 32);       // block align
  hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  return Buffer.concat([hdr, data]);
}

/** Coarse RMS (every 100th sample) — enough to compare levels between renders. */
export function rmsOf(samples, gain = 1) {
  let acc = 0, n = 0;
  for (let i = 0; i < samples.length; i += 100) { acc += (samples[i] * gain) ** 2; n++; }
  return Math.sqrt(acc / Math.max(1, n));
}

export const dbfs = (v) => (v > 0 ? `${(20 * Math.log10(v)).toFixed(1)} dBFS` : '-inf');
