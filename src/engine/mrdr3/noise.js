/*
 * The noise buffer, built where the audio thread can be handed one — §3.3.
 *
 * `noise` is a WAVEFORM in MRDR-3, not a special case: the seeded buffer through a
 * bandpass that follows the note, so RATIO, DETUNE, the pitch envelope, glide and FM all
 * drive the band's centre the way they drive an oscillator's frequency. A noise layer is
 * a full member of the stack rather than a special case with dead controls.
 *
 * ---- why the buffer travels rather than being regenerated ---------------------------
 *
 * `Audio` seeds it for offline renders and uses `Math.random()` live: a fresh noise floor
 * every session is free variety, and nothing downstream depends on it repeating — EXCEPT
 * that a lane rendered on its own must contain the noise it had inside the full mix, or
 * stems stop summing. So the processor cannot make its own: it would be a different noise
 * from the one the rest of the render is using. The buffer is handed over, and the
 * COLOURING is done here too, on the main thread, so the audio thread never runs a filter
 * over a buffer at note-on.
 *
 * The generator below is `Audio._noiseRandom`'s, so a seed produces the same samples on
 * both sides and an A/B is comparing synthesis rather than two different noises.
 */

/** The engine's own seeded generator — sfc-style, integer ops, bit-exact everywhere. */
export function mrdr3NoiseRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Half a second of white noise at this rate, from a seed. */
export function mrdr3WhiteNoise(sampleRate, seed = 12345) {
  const rnd = mrdr3NoiseRandom(seed);
  const len = Math.floor(sampleRate * 0.5);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = rnd() * 2 - 1;
  return out;
}

/**
 * A coloured copy, by the same filters `_noise` uses and with the same RMS renormalisation
 * — so a colour changes the spectrum and not the level.
 */
export function mrdr3ColourNoise(white, colour) {
  if (!colour || colour === 'white') return white;
  const len = white.length;
  const out = new Float32Array(len);
  if (colour === 'pink' || colour === 'blue') {
    // Paul Kellet's economy pink filter: three one-poles summed, which tracks -3 dB/octave
    // to within a tenth of a decibel across the audible band.
    let b0 = 0; let b1 = 0; let b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = white[i];
      b0 = 0.99765 * b0 + w * 0.0990460;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      out[i] = b0 + b1 + b2 + w * 0.1848;
    }
    // Blue is pink differentiated: -3 dB/oct plus the +6 a difference gives is the +3 blue
    // is defined as. Cheaper and more accurate than designing a second filter.
    if (colour === 'blue') {
      let prev = 0;
      for (let i = 0; i < len; i++) { const w = out[i]; out[i] = w - prev; prev = w; }
    }
  } else if (colour === 'brown') {
    // A leaky integrator: -6 dB/oct. The leak stops a random walk wandering off DC.
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * white[i]) / 1.02; out[i] = last; }
  } else if (colour === 'violet') {
    let prev = 0;
    for (let i = 0; i < len; i++) { const w = white[i]; out[i] = w - prev; prev = w; }
  } else {
    return white;                       // an unknown colour is white, not silence
  }
  let a = 0; let b = 0;
  for (let i = 0; i < len; i++) { a += white[i] * white[i]; b += out[i] * out[i]; }
  const k = b > 0 ? Math.sqrt(a / b) : 1;
  for (let i = 0; i < len; i++) out[i] *= k;
  return out;
}

/** Every colour a set of patches asks for, built once. */
export function mrdr3NoiseSet(sampleRate, colours = ['white'], seed = 12345) {
  const white = mrdr3WhiteNoise(sampleRate, seed);
  const out = {};
  for (const c of new Set(['white', ...colours])) out[c] = mrdr3ColourNoise(white, c);
  return out;
}
