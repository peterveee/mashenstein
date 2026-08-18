/*
 * TNGR-2's sixteen wavetable families, as spectra.
 *
 * This is the AUTHORING: a small closed-form language in which a family is a function
 * from (harmonic number, position) to an amplitude. Everything downstream is derived from
 * it — the native path builds a PeriodicWave per position from these coefficients, and
 * tools/build-tngr2-tables.js expands them into the mipped sample tables the worklet
 * core reads. Two consumers, one authoring, so a family cannot sound like one instrument
 * live and another one offline.
 *
 * It lives here rather than in src/engine/tngr2.js — where it was written — because that
 * module is the native compatibility branch and is meant to be retired once the worklet
 * path is proved end to end (docs/TNGR-2-completion-spec.md §14). The families outlive it.
 * The move was verbatim: the same numbers come out, which the engine null test proves.
 *
 * PROVENANCE, per §2 and the manifest's `source: 'procedural-original'`: every family
 * here is original and procedural. Nothing is sampled, measured or copied from PPG,
 * Waldorf, Serum or any other instrument. They are built from textbook spectral shapes —
 * saw/square/triangle series, gaussian formant bumps, drawbar stacks — combined and moved
 * with position by the expressions below.
 */

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));

export { clamp01 };

export const TNGR2_TABLES = Object.freeze({
  basic: { name: 'Basic Shapes', kind: 'basic' },
  warmHarmonics: { name: 'Warm Harmonics', kind: 'warm' },
  hollowPulse: { name: 'Hollow Pulse', kind: 'hollow' },
  sawForm: { name: 'Saw Form', kind: 'saw' },
  vowelAEIOU: { name: 'Vowel AEIOU', kind: 'vowel' },
  vowelGlass: { name: 'Vowel Glass', kind: 'vowelGlass' },
  choirBreath: { name: 'Choir Breath', kind: 'choir' },
  crystal: { name: 'Crystal', kind: 'crystal' },
  alloy: { name: 'Alloy', kind: 'alloy' },
  bellFold: { name: 'Bell Fold', kind: 'bell' },
  reedWire: { name: 'Reed Wire', kind: 'reed' },
  organShift: { name: 'Organ Shift', kind: 'organ' },
  spectralPWM: { name: 'Spectral PWM', kind: 'spectralPwm' },
  octaveCascade: { name: 'Octave Cascade', kind: 'cascade' },
  digitalSteps: { name: 'Digital Steps', kind: 'steps' },
  darkToAir: { name: 'Dark To Air', kind: 'air' },
});

const TABLE_IDS = new Set(Object.keys(TNGR2_TABLES));
export const isTngr2Table = (id) => TABLE_IDS.has(id);
export const tngr2TableName = (id) => TNGR2_TABLES[id]?.name || TNGR2_TABLES.basic.name;

/** Every family id, in the one order the manifest and the payload agree on. */
export const TNGR2_TABLE_IDS = Object.freeze(Object.keys(TNGR2_TABLES));

/** How many harmonics the authoring language describes. */
export const HARMONICS = 96;

// A small, deterministic spectral authoring language. `p` is table position, `n` is the
// harmonic number. The result is intentionally harmonic rather than a sampled audio file:
// PeriodicWave then applies the browser's band-limiting for the current pitch/context.
export function harmonic(kind, n, p) {
  const odd = n % 2 === 1;
  const octave = Math.log2(n);
  const saw = (2 / (n * Math.PI)) * (n % 2 ? 1 : -1);
  const square = odd ? 4 / (n * Math.PI) : 0;
  const tri = odd ? (8 / (n * n * Math.PI * Math.PI)) * (((n - 1) / 2) % 2 ? -1 : 1) : 0;
  const gauss = (centre, width) => Math.exp(-((n - centre) ** 2) / (2 * width * width));
  switch (kind) {
    case 'basic': {
      if (p < 0.25) return tri * (1 - p * 4) + (n === 1 ? 1 : 0) * (p * 4);
      if (p < 0.5) return (n === 1 ? 1 : 0) * (2 - p * 4) + saw * ((p - 0.25) * 4);
      return saw * (1 - (p - 0.5) * 2) + square * ((p - 0.5) * 2);
    }
    case 'warm': return (1 / Math.pow(n, 1.15)) * (0.72 + 0.28 * Math.cos(p * Math.PI * 2 + octave));
    case 'hollow': return (odd ? 1 : (0.08 + 0.8 * p)) * (2 / (n * Math.PI));
    case 'saw': return saw * (0.68 + 0.32 * Math.sin(p * Math.PI + n * 0.17));
    case 'vowel': return (0.35 / Math.pow(n, 0.65))
      + gauss(2.2 + p * 3.5, 0.85) * 0.62
      + gauss(7.5 + Math.sin(p * Math.PI * 2) * 2, 1.6) * 0.34;
    case 'vowelGlass': return (0.3 / Math.pow(n, 0.7))
      + gauss(2.5 + p * 2.5, 0.8) * (0.8 - p * 0.15)
      + gauss(11 + p * 10, 2.5) * (0.15 + p * 0.7);
    case 'choir': return (0.42 / Math.pow(n, 0.9))
      + gauss(3 + p * 4, 1.0) * 0.45 + gauss(8 + p * 5, 1.7) * 0.24
      + Math.sin(n * 0.31 + p * 6) * 0.035;
    case 'crystal': return (0.08 / Math.pow(n, 0.5))
      + gauss(3 + p * 10, 0.42) * 0.95 + gauss(9 + p * 24, 0.8) * 0.45;
    case 'alloy': return (0.12 / Math.pow(n, 0.6))
      + gauss(2.7 + p * 7, 0.55) * 0.7 + gauss(6.2 + p * 18, 0.7) * 0.5
      + gauss(12 + p * 28, 1.15) * 0.32;
    case 'bell': return (0.22 / Math.pow(n, 0.75))
      + gauss(2.4 + p * 4, 0.55) * 0.75 + gauss(5.6 + p * 12, 0.8) * 0.5;
    case 'reed': return (0.45 / Math.pow(n, 0.85))
      + gauss(2 + p * 2.5, 0.7) * 0.6 + gauss(5 + p * 8, 1.2) * 0.32;
    case 'organ': {
      const drawbars = [1, 2, 3, 4, 6, 8].map((r, i) =>
        gauss(r, 0.18 + r * 0.04) * [0.9, 0.6, 0.55, 0.36, 0.28, 0.18][i]);
      return drawbars.reduce((sum, value) => sum + value, 0) * (0.72 + 0.28 * p);
    }
    case 'spectralPwm': return (n === 1 ? 0.8 : 0)
      + (4 / (n * Math.PI)) * Math.sin(n * Math.PI * (0.12 + p * 0.76));
    case 'cascade': return (0.12 / Math.pow(n, 0.55))
      + gauss(1 + Math.floor(p * 4) * 2, 0.2) * 0.82
      + gauss(2 + Math.floor(p * 4) * 3, 0.24) * 0.5;
    case 'steps': {
      const stage = Math.min(3, Math.floor(p * 4));
      const roots = [1, 2, 3, 5];
      return gauss(roots[stage], 0.18) * 0.85 + gauss(roots[stage] * 2, 0.25) * 0.35
        + (n === 1 ? 0.12 : 0);
    }
    case 'air': return (0.56 / Math.pow(n, 1.2)) * (1 - p * 0.84)
      + gauss(4 + p * 12, 1.2) * (0.1 + p * 0.72);
    default: return n === 1 ? 1 : 0;
  }
}

/**
 * One family's spectrum at one position: amplitudes for harmonics 1..HARMONICS.
 *
 * Index 0 is the DC term and is always zero — §6.1 requires zero DC, and the authoring
 * language has no way to ask for any.
 */
export function tngr2Spectrum(id, position, out = new Float64Array(HARMONICS + 1)) {
  const kind = TNGR2_TABLES[isTngr2Table(id) ? id : 'basic'].kind;
  const p = clamp01(position);
  out[0] = 0;
  for (let n = 1; n <= HARMONICS; n++) out[n] = harmonic(kind, n, p);
  return out;
}
