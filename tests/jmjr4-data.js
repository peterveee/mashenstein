/*
 * JMJR-4's data module is GENERATED from the Python reference engine, and the engine
 * reads nothing else. Two things can go wrong with a generated file: it can stop
 * matching what generated it, and it can stop carrying what its reader needs. Both are
 * checked here — the first only when the Python export is present on this machine
 * (work/local is gitignored), the second always.
 *
 *   node tests/jmjr4-data.js
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JMJR4_DATA } from '../src/engine/jmjr4/data.js';
import { JMJR4_SYLLABLES, JMJR4_MORPH_TARGETS, parseSyllable } from '../src/engine/jmjr4/syll.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const D = JMJR4_DATA;
assert(D.schema === 'robot-voice-data/1', `schema is robot-voice-data/1 (${D.schema})`);
assert(D.sample_rate === 44100, `the tables are at 44100 Hz (${D.sample_rate})`);

// every phoneme a pill or a morph target reaches
const needed = new Set(JMJR4_MORPH_TARGETS);
for (const w of JMJR4_SYLLABLES) {
  const s = parseSyllable(w);
  assert(!!s, `${w} parses as a syllable`);
  if (s) { needed.add(s.vowel); for (const c of [...s.onset, ...s.ending]) needed.add(c); }
}
for (const ph of needed) assert(!!D.phonemes[ph], `phoneme ${ph} is in the table`);
for (const ph of ['M', 'N', 'NG']) assert(D.phonemes[ph]?.nasal && D.phonemes[ph].nz > 0, `${ph} is nasal with an anti-formant`);

// the voices the panel lists, with what the compiler reads off them
const VOICE_KEYS = ['src', 'f0', 'fscale', 'oq', 'tilt'];
assert(Object.keys(D.voices).length === 9, `nine voices (${Object.keys(D.voices).length})`);
for (const [name, v] of Object.entries(D.voices)) {
  for (const k of VOICE_KEYS) assert(v[k] != null, `voice ${name} carries ${k}`);
  assert(D.voice_gains[name] > 0, `voice ${name} has a measured gain`);
}
for (const name of ['chorister', 'titan', 'elder', 'nasal']) {
  const v = D.voices[name];
  assert(v && 'nasal' in v && 'res' in v && 'flutter' in v, `voice ${name} carries the tract keys nasal/res/flutter`);
}

// the constants the scheduler and renderer read
for (const k of ['bw', 'f4', 'f5', 'gains', 'hybrid_high_gain', 'hybrid_f5_gain', 'hybrid_dep_exp', 'tract_ref_gain',
  'nasal_pole', 'nasal_zero_bw', 'nasalise', 'nasal_high', 'nasal_high_max', 'nasal_buzz_db', 'nasal_buzz_hz']) {
  assert(D.tract[k] != null, `tract.${k} present`);
}
for (const k of ['asp', 'bar', 'no_vowel_ref', 'release_asp', 'release_asp_tail']) assert(D.levels[k] != null, `levels.${k} present`);
for (const k of ['tr_pair', 'min_closure', 'min_burst', 'voice_lead', 'dur', 'onset_burst']) assert(D.timing[k] != null, `timing.${k} present`);
for (const k of ['vref_by_vowel', 'asp_rms_unit_by_vowel', 'asp_rms_unit', 'asp_rms_unit_after_stop', 'bar_rms_unit', 'noise']) {
  assert(D.live[k] != null, `live.${k} present`);
}
assert(Array.isArray(D.tract.bw) && D.tract.bw.length === 4, 'four formant bandwidths');
assert(D.tract.nasal_pole[1] > 1000, `the nasal pole is wide (${D.tract.nasal_pole[1]} Hz): a narrow one made every hum a sine`);

// the text front end's tables stay out until SPEAK is ported
for (const k of ['arpa', 'overrides', 'function_words', 'prosody']) assert(!(k in D), `${k} is not shipped in the SING data`);

// against the Python export, when it is here
const py = join(ROOT, 'work/local/robot_voice_data.js');
if (existsSync(py)) {
  const text = readFileSync(py, 'utf8');
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  const canon = (x) => JSON.stringify(x, Object.keys(x).sort());
  const deep = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
  const sortKeys = (x) => (Array.isArray(x) ? x.map(sortKeys)
    : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])])) : x);
  for (const k of Object.keys(D)) assert(deep(D[k], json[k]), `${k} matches the Python export`);
  void canon;
} else {
  console.log('note: work/local/robot_voice_data.js not present, the Python comparison is skipped');
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
