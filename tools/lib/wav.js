// 16-bit PCM WAV writing. Split out of the old JS mirror of the engine, which is
// now retired: everything that makes samples goes through the real engine in
// render-bank-browser.js, and writes them out here. Stereo.
//
// Uint8Array rather than Buffer, so the desk can call it too. The song mixer renders
// its own WAV in the browser now — no Node behind it in the deployed build — and a
// second encoder written for that would be a second place for the header to be
// wrong. `writeFileSync` and `res.end` both take a Uint8Array, so nothing on the
// Node side had to change to make that possible.
export const SR = 44100;

/**
 * @param {Float32Array|Float32Array[]} channels  one array (mono) or [L, R]
 * @param {number} [gain=1]
 * @returns {Uint8Array} a complete .wav
 */
export function wavBuffer(channels, gain = 1) {
  const chans = Array.isArray(channels) ? channels : [channels];
  const nch = chans.length;
  const frames = chans[0].length;
  const dataBytes = frames * nch * 2;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const tag = (s, at) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)); };

  tag('RIFF', 0); view.setUint32(4, 36 + dataBytes, true); tag('WAVE', 8);
  tag('fmt ', 12); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, nch, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * nch * 2, true);   // byte rate
  view.setUint16(32, nch * 2, true);        // block align
  view.setUint16(34, 16, true);
  tag('data', 36); view.setUint32(40, dataBytes, true);

  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++) {
      const v = Math.round(chans[c][i] * gain * 32767);
      view.setInt16(o, Math.max(-32768, Math.min(32767, v)), true);
      o += 2;
    }
  }
  return out;
}

/** Coarse RMS (every 100th sample) — enough to compare levels between renders. */
export function rmsOf(samples, gain = 1) {
  let acc = 0, n = 0;
  for (let i = 0; i < samples.length; i += 100) { acc += (samples[i] * gain) ** 2; n++; }
  return Math.sqrt(acc / Math.max(1, n));
}

export const dbfs = (v) => (v > 0 ? `${(20 * Math.log10(v)).toFixed(1)} dBFS` : '-inf');
