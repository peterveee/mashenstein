// Seeded RNG. Every gameplay-relevant random draw flows through a stream so
// runs are reproducible (daily seeds, checkpoint restores, bug reports).

export function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed) {
    this.seed = typeof seed === 'string' ? hashStr(seed) : (seed >>> 0);
    this._next = mulberry32(this.seed);
  }
  float() { return this._next(); }
  range(a, b) { return a + (b - a) * this._next(); }
  int(a, b) { return a + Math.floor(this._next() * (b - a + 1)); } // inclusive
  chance(p) { return this._next() < p; }
  pick(arr) { return arr[Math.floor(this._next() * arr.length)]; }
  shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this._next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  // Derive an independent substream (per-system) from this stream's seed.
  stream(label) { return new Rng(hashStr(label) ^ this.seed); }
}

// Daily seed: derived from the UTC date, no server needed.
export function dailySeed(date) {
  const d = date || new Date();
  return hashStr(`mash-daily-${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`);
}
