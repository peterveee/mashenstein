// Pure contract for the shared Vowel Filter formant tables and interpolation.
import {
  FORMANTS, FORMANT_VOICES, VOWELS, parseStack, resolveFormant,
  interpolateFormants, vowelAt, vowelPosition,
} from '../src/engine/formants.js';

let failed = false;
const assert = (ok, msg) => {
  if (!ok) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const finite = (x) => Number.isFinite(x);

for (const voice of FORMANT_VOICES) {
  assert(FORMANTS[voice], `${voice}: table exists`);
  for (const vowel of VOWELS) {
    const entry = FORMANTS[voice][vowel];
    assert(entry && entry.f.length === 3 && entry.dB.length === 3 && entry.bw.length === 3,
      `${voice}.${vowel}: three formants have frequency, level and bandwidth`);
    assert(entry.f.every((x, i) => finite(x) && x > 0 && (i === 0 || x > entry.f[i - 1])),
      `${voice}.${vowel}: frequencies are finite and ascending`);
    assert(entry.bw.every((x) => finite(x) && x > 0), `${voice}.${vowel}: bandwidths are positive`);
    assert(entry.dB.every(finite), `${voice}.${vowel}: levels are finite`);
  }
}

assert(FORMANTS.soprano.a.f.join(',') === '800,1150,2900', 'published soprano /a/ values are retained');
assert(FORMANTS.bass.a.bw.join(',') === '60,70,110', 'published bass /a/ bandwidths are retained');
assert(parseStack('A e nope u').join(' ') === 'a e u', 'stack parsing normalizes and drops unknown vowels');
assert(parseStack('').join(' ') === 'a', 'empty stack falls back to /a/');

const a = resolveFormant('alto', 'a');
const e = resolveFormant('alto', 'e');
const mid = interpolateFormants(a, e, 0.5);
assert(mid.f[0] === 600 && mid.dB[1] === -14 && mid.bw[2] === 120,
  'formant interpolation is component-wise and deterministic');
assert(vowelAt('alto', 'a e', 0, 0).f.join(',') === a.f.join(','),
  'depth zero parks on the first vowel');
assert(vowelAt('alto', 'a e', 1, 1).f.join(',') === e.f.join(','),
  'full-depth integer position reaches the selected vowel');
const wrapped = vowelAt('alto', 'a e', 2, 1);
assert(wrapped.f.join(',') === a.f.join(','), 'stack positions wrap at sequence length');
assert(vowelPosition('step', 3, 4) === 4, 'step shape retains legacy ordinal positions');
assert(vowelPosition('saw down', 3, 1) === -1, 'saw down reverses the stack');
assert(vowelPosition('triangle', 3, 3) === 1, 'triangle shape returns down the stack');
assert(vowelPosition('sine', 3, 1) > 0 && vowelPosition('sine', 3, 1) < 2,
  'sine shape eases through fractional stack positions');
assert(vowelPosition('square', 3, 0) === 0 && vowelPosition('square', 3, 1) === 2,
  'square shape alternates stack endpoints');
assert(vowelPosition('random', 3, 4, 9) === vowelPosition('random', 3, 4, 9),
  'random shape is deterministic');

if (failed) process.exit(1);
console.log('FORMANTS: PASSED');
