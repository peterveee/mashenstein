/*
 * JMJR-4 SPEAK: the JavaScript text front end says what the Python reference says.
 *
 * tests/fixtures/jmjr4-text/*.json were written by work/local/robot_voice_fixtures.py from
 * the reference front end: for each phrase its tokens, its phoneme sequence with durations,
 * its pitch contour, the size of the compiled IR, and the dictionary entries it looked up
 * (so the test needs no dictionary of its own). The port is held to identical phonemes,
 * durations within a microsecond, and a contour within a thousandth of a semitone.
 *
 *   node tests/jmjr4-text.js
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JMJR4_DATA as D } from '../src/engine/jmjr4/data.js';
import {
  tokenize, phraseToSeq, contour, compilePhrase, compactDict, elongate, numberWords, pronounce,
} from '../src/engine/jmjr4/text.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'tests/fixtures/jmjr4-text');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));
const T = D.text;

// ---- the tables made it into the data module ----
for (const k of ['arpa', 'vowels', 'overrides', 'function_words', 'l2s', 'ones', 'tens', 'prosody', 'hold_per_letter', 'hold_max', 'speed_min', 'speed_max', 'apostrophes', 'dict_url']) {
  assert(T[k] != null, `text.${k} present`);
}

// ---- the small pieces ----
assert(numberWords(42, T).join(' ') === 'forty two' && numberWords(1999, T).join(' ') === 'one nine nine nine' && numberWords(300, T).join(' ') === 'three hundred', 'numbers are spelled the reference way');
assert(elongate('meeeee', T).spelled === 'mee' && Math.abs(elongate('meeeee', T).hold - (1 + 0.55 * 3)) < 1e-9, 'a held word collapses to two letters and holds per extra letter');
assert(elongate('book', T).hold === 1, 'a double letter is not a hold');
{
  const lex = { craigy: 'X', dog: 'D AO1 G', bus: 'B AH1 S' };
  assert(pronounce("dog's", lex, T).arpa === 'D AO1 G Z' && pronounce("bus's", lex, T).arpa === 'B AH1 S IH0 Z', 'a possessive the lexicon lacks is the stem plus its ending');
  assert(pronounce('craigy', lex, T).arpa === T.overrides.craigy, 'an override wins over the dictionary');
  assert(pronounce('zzyzx', lex, T).known === false, 'an unlisted word is guessed and flagged');
}
{
  const d = compactDict("don't  D OW1 N T\ndon't(2)  D OW1 N\nzone  Z OW1 N # ok\n");
  assert(d["don't"] === 'D OW1 N T' && d.zone === 'Z OW1 N' && !('don\'t(2)' in d), 'compactDict keeps the first reading and drops comments and alternates');
}

// ---- the fixtures ----
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
assert(files.length >= 12, `${files.length} fixtures`);
for (const file of files) {
  const fx = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const name = file.replace(/\.json$/, '');
  const lex = fx.lex;
  const voice = D.voices[fx.voice];
  const toks = tokenize(fx.text, lex, T);
  assert(JSON.stringify(toks) === JSON.stringify(fx.tokens), `${name}: tokens match`);
  const speed = fx.speed * (voice.speed ?? 1);
  const { seq, spans, transcript, unknown } = phraseToSeq(D, toks, lex, speed);
  const names = seq.map((s) => s[0]).join(' ');
  assert(names === fx.seq.map((s) => s[0]).join(' '), `${name}: phonemes match (${names})`);
  const durDiff = seq.reduce((m, s, i) => Math.max(m, Math.abs(s[1] - (fx.seq[i]?.[1] ?? 1e9))), 0);
  assert(seq.length === fx.seq.length && durDiff < 1e-6, `${name}: durations within a microsecond (max ${durDiff.toExponential(1)})`);
  assert(JSON.stringify(transcript) === JSON.stringify(fx.transcript), `${name}: transcript matches`);
  assert(JSON.stringify(unknown) === JSON.stringify(fx.unknown), `${name}: unknown words match (${JSON.stringify(unknown)})`);
  const spanDiff = spans.reduce((m, s, i) => {
    const f = fx.spans[i];
    if (!f) return 1e9;
    const ref = f[0] === 'v' ? { kind: 'v', s: f[1], e: f[2], stress: f[3] } : { kind: 'pause', s: f[1], e: f[2], mark: f[3] };
    if (ref.kind !== s.kind || (ref.stress ?? ref.mark) !== (s.stress ?? s.mark)) return 1e9;
    return Math.max(m, Math.abs(ref.s - s.s), Math.abs(ref.e - s.e));
  }, 0);
  assert(spans.length === fx.spans.length && spanDiff < 1e-6, `${name}: vowel spans match`);
  const total = seq.reduce((s, [, d]) => s + d, 0);
  const pts = contour(D, total, spans, {
    f0: fx.pitchHz, range: fx.ending === 'flat' ? 0 : fx.range, question: fx.ending === 'rise',
    declSt: voice.decl_st ?? -3, finalSt: voice.final_st ?? -4, stepSt: fx.step,
  });
  let stDiff = 0;
  if (pts.length === fx.contour.length) {
    for (let i = 0; i < pts.length; i++) stDiff = Math.max(stDiff, Math.abs(12 * Math.log2(pts[i][1] / fx.contour[i][1])), Math.abs(pts[i][0] - fx.contour[i][0]) * 1e3);
  } else stDiff = 1e9;
  assert(stDiff < 1e-3, `${name}: contour within a thousandth of a semitone (${pts.length} points, max ${stDiff.toExponential(1)})`);
  // the whole chain, as the desk runs it
  const ctl = { src: voice.src, oq: voice.oq, fscale: voice.fscale, tilt_db: voice.tilt ?? 0, asp: D.levels.asp };
  const { ir } = compilePhrase(D, lex, { text: fx.text, voice, speed: fx.speed, pitchHz: fx.pitchHz, range: fx.range, ending: fx.ending, step: fx.step, ctl });
  assert(Math.abs(ir.total_seconds - fx.ir.total_seconds) < 1e-3, `${name}: the compiled IR is ${ir.total_seconds.toFixed(3)} s (reference ${fx.ir.total_seconds.toFixed(3)})`);
  assert(ir.extras.length === fx.ir.extras, `${name}: ${ir.extras.length} bursts and fricatives (reference ${fx.ir.extras})`);
  assert(ir.samples === fx.ir.samples, `${name}: ${ir.samples} samples (reference ${fx.ir.samples})`);
}

// ---- what the compiler refuses ----
{
  const lex = { hello: 'HH AH0 L OW1' };
  let threw = false;
  try { compilePhrase(D, lex, { text: '   ', voice: D.voices.announcer }); } catch { threw = true; }
  assert(threw, 'an empty phrase throws');
  threw = false;
  try { compilePhrase(D, lex, { text: 'hello', voice: D.voices.announcer, speed: 5 }); } catch { threw = true; }
  assert(threw, 'a speed outside the reference range throws');
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
