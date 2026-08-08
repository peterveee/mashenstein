// Shared three-formant data used by the Song Mixer Vowel Filter.
//
// The human tables are the first three entries of Csound's published Table III
// (the source contains five formants).  The robotic table is deliberately an
// authored extension: it keeps the same resonant locations while removing the
// singer's relative-amplitude rolloff.

export const VOWELS = Object.freeze(['a', 'e', 'i', 'o', 'u']);
export const FORMANT_VOICES = Object.freeze([
  'robotic', 'soprano', 'alto', 'countertenor', 'tenor', 'bass',
]);

export const FORMANTS = {
  bass: {
    a: { f: [600, 1040, 2250], dB: [0, -7, -9], bw: [60, 70, 110] },
    e: { f: [400, 1620, 2400], dB: [0, -12, -9], bw: [40, 80, 100] },
    i: { f: [250, 1750, 2600], dB: [0, -30, -16], bw: [60, 90, 100] },
    o: { f: [400, 750, 2400], dB: [0, -11, -21], bw: [40, 80, 100] },
    u: { f: [350, 600, 2400], dB: [0, -20, -32], bw: [40, 80, 100] },
  },
  tenor: {
    a: { f: [650, 1080, 2650], dB: [0, -6, -7], bw: [80, 90, 120] },
    e: { f: [400, 1700, 2600], dB: [0, -14, -12], bw: [70, 80, 100] },
    i: { f: [290, 1870, 2800], dB: [0, -15, -18], bw: [40, 90, 100] },
    o: { f: [400, 800, 2600], dB: [0, -10, -12], bw: [40, 80, 100] },
    u: { f: [350, 600, 2700], dB: [0, -20, -17], bw: [40, 60, 100] },
  },
  countertenor: {
    a: { f: [660, 1120, 2750], dB: [0, -6, -23], bw: [80, 90, 120] },
    e: { f: [440, 1800, 2700], dB: [0, -14, -18], bw: [70, 80, 100] },
    i: { f: [270, 1850, 2900], dB: [0, -24, -24], bw: [40, 90, 100] },
    o: { f: [430, 820, 2700], dB: [0, -10, -26], bw: [40, 80, 100] },
    u: { f: [370, 630, 2750], dB: [0, -20, -23], bw: [40, 60, 100] },
  },
  alto: {
    a: { f: [800, 1150, 2800], dB: [0, -4, -20], bw: [80, 90, 120] },
    e: { f: [400, 1600, 2700], dB: [0, -24, -30], bw: [60, 80, 120] },
    i: { f: [350, 1700, 2700], dB: [0, -20, -30], bw: [50, 100, 120] },
    o: { f: [450, 800, 2830], dB: [0, -9, -16], bw: [70, 80, 100] },
    u: { f: [325, 700, 2530], dB: [0, -12, -30], bw: [50, 60, 170] },
  },
  soprano: {
    a: { f: [800, 1150, 2900], dB: [0, -6, -32], bw: [80, 90, 120] },
    e: { f: [350, 2000, 2800], dB: [0, -20, -15], bw: [60, 100, 120] },
    i: { f: [270, 2140, 2950], dB: [0, -12, -26], bw: [60, 90, 100] },
    o: { f: [450, 800, 2830], dB: [0, -11, -22], bw: [70, 80, 100] },
    u: { f: [325, 700, 2700], dB: [0, -16, -35], bw: [50, 60, 170] },
  },
  robotic: {
    a: { f: [800, 1150, 2900], dB: [0, 0, 0], bw: [40, 50, 60] },
    e: { f: [400, 1700, 2700], dB: [0, 0, 0], bw: [40, 50, 60] },
    i: { f: [300, 1900, 2900], dB: [0, 0, 0], bw: [40, 50, 60] },
    o: { f: [450, 800, 2600], dB: [0, 0, 0], bw: [40, 50, 60] },
    u: { f: [325, 700, 2500], dB: [0, 0, 0], bw: [40, 50, 60] },
  },
};

// F4 and F5 are properties of the singer, not of the vowel: they barely move as the
// tongue does, which is why Csound's Table III repeats near-identical values for them
// down every column. Keeping them as one per-voice pair rather than five copies per
// voice says that out loud, and means the walker never has to schedule them.
//
// `dB` here is a peaking boost, not a band amplitude, because these are applied as two
// series filters on the pass-through above F3 rather than as two more parallel bands —
// see the note in makeVowelFilter for why the parallel version cancels F3.
export const UPPER_FORMANTS = {
  bass: { f: [2900, 3800], dB: [6, 4], bw: [500, 700] },
  tenor: { f: [3250, 4200], dB: [6, 4], bw: [550, 750] },
  countertenor: { f: [3300, 4300], dB: [6, 4], bw: [560, 760] },
  alto: { f: [3500, 4500], dB: [6, 4], bw: [600, 800] },
  soprano: { f: [3900, 4950], dB: [6, 4], bw: [650, 850] },
  // The machine keeps the same locations with the singer's rolloff removed, exactly as
  // the `robotic` vowel rows do: sharper and louder, so it reads as a resonator.
  robotic: { f: [3600, 4700], dB: [10, 8], bw: [400, 500] },
};

export function upperFormants(voice = 'alto') {
  const entry = UPPER_FORMANTS[voice] || UPPER_FORMANTS.alto;
  return { f: entry.f.slice(), dB: entry.dB.slice(), bw: entry.bw.slice() };
}

const clone = (entry) => ({
  f: entry.f.slice(), dB: entry.dB.slice(), bw: entry.bw.slice(),
});

export function parseStack(stack) {
  const values = String(stack ?? '')
    .trim().toLowerCase().split(/\s+/).filter((v) => VOWELS.includes(v));
  return values.length ? values : ['a'];
}

export function resolveFormant(voice = 'alto', vowel = 'a') {
  const table = FORMANTS[voice] || FORMANTS.alto;
  return clone(table[VOWELS.includes(vowel) ? vowel : 'a']);
}

export function interpolateFormants(a, b, amount = 0) {
  const t = Math.max(0, Math.min(1, Number(amount) || 0));
  return {
    f: a.f.map((v, i) => v + (b.f[i] - v) * t),
    dB: a.dB.map((v, i) => v + (b.dB[i] - v) * t),
    bw: a.bw.map((v, i) => v + (b.bw[i] - v) * t),
  };
}

/**
 * Resolve a possibly fractional stack position. `depth` pulls every position
 * toward the first vowel, making zero a useful static formant colour.
 */
export function vowelAt(voice = 'alto', stack = 'a', position = 0, depth = 1) {
  const vowels = parseStack(stack);
  const n = vowels.length;
  const p = ((Number(position) || 0) % n + n) % n;
  const i = Math.floor(p);
  const next = (i + 1) % n;
  const base = resolveFormant(voice, vowels[0]);
  const raw = interpolateFormants(resolveFormant(voice, vowels[i]),
    resolveFormant(voice, vowels[next]), p - i);
  return interpolateFormants(base, raw, depth);
}

