/*
 * compileJmjr4 refuses what the engine cannot sing and defaults what a preset omits.
 *
 *   node tests/jmjr4-compile.js
 */
import { JMJR4_DATA } from '../src/engine/jmjr4/data.js';
import {
  compileJmjr4, jmjr4RenderableIds, JMJR4_DEFAULTS, JMJR4_AMP_DEFAULTS, bandwidthScale, jmjr4VibratoOf,
} from '../src/engine/jmjr4/compile.js';
import { VOICES } from '../src/data/voices.js';
import { compilePhrase } from '../src/engine/jmjr4/text.js';
import { jmjr4SpeakSource } from '../src/engine/jmjr4/compile.js';
import { readFileSync } from 'node:fs';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));
const D = JMJR4_DATA;
const compile = (jmjr4, extra = {}) => compileJmjr4({ synth: 'JMJR-4', jmjr4, ...extra }, D);

// ---- refusals, by name ----
const refuses = (name, voice, needle) => {
  const { patch, problems } = compileJmjr4(voice, D);
  assert(!patch && problems.some((p) => p.includes(needle)), `refuses ${name}: ${problems.join('; ')}`);
};
refuses('a non-JMJR preset', { synth: 'MRDR-3', layer: {} }, 'not a JMJR-4');
refuses('an unknown voice', { synth: 'JMJR-4', jmjr4: { voice: 'nobody' } }, 'unknown voice');
refuses('a line with a non-syllable', { synth: 'JMJR-4', jmjr4: { line: 'doo xyzzy' } }, 'not a syllable');
refuses('an empty line', { synth: 'JMJR-4', jmjr4: { line: '   ' } }, 'no syllable');
refuses('a speak preset with no compiled phrase', { synth: 'JMJR-4', jmjr4: { mode: 'speak' } }, 'not compiled');
refuses('a mode that is neither', { synth: 'JMJR-4', jmjr4: { mode: 'shout' } }, 'neither');
refuses('a bad ending', { synth: 'JMJR-4', jmjr4: { mode: 'speak', ending: 'up' } }, 'ending');
refuses('a bad step', { synth: 'JMJR-4', jmjr4: { mode: 'speak', step: 5 } }, 'step');
refuses('a speed outside the pot', { synth: 'JMJR-4', jmjr4: { mode: 'speak', speed: 3 } }, 'speed');
refuses('too few bits', { synth: 'JMJR-4', jmjr4: { bits: 3 } }, 'bits');
refuses('a hold rate above the pot', { synth: 'JMJR-4', jmjr4: { rate: 50 } }, 'rate');
refuses('unison 5', { synth: 'JMJR-4', jmjr4: { unison: 5 } }, 'unison 5');
refuses('a non-number', { synth: 'JMJR-4', jmjr4: { tract: 'big' } }, 'not a number');
refuses('an out-of-range pot', { synth: 'JMJR-4', jmjr4: { press: 0.9 } }, 'outside');
refuses('a bad morph target', { synth: 'JMJR-4', jmjr4: { morphTo: 'XX' } }, 'morphTo');
refuses('a sustain over 1', { synth: 'JMJR-4', jmjr4: { amp: { sustain: 100 } } }, 'amp.sustain');

// ---- an empty block is the default panel ----
{
  const { patch, problems } = compile({});
  assert(!problems.length, 'an empty jmjr4 block compiles');
  const v = D.voices[JMJR4_DEFAULTS.voice];
  assert(patch.voice === 'announcer', 'default voice is announcer');
  assert(patch.line.length === 1 && patch.line[0].vowel === 'AH', 'default line is aah');
  assert(patch.unison === 1 && patch.spread === 20, 'default unison 1, spread 20');
  assert(patch.ctl.fscale === v.fscale && patch.ctl.oq === v.oq, 'tract and pressure come from the voice');
  assert(patch.ctl.asp === JMJR4_DEFAULTS.breath, 'breath default 0.35');
  assert(Math.abs(patch.ctl.nasal_buzz - 0.4) < 1e-9, 'buzz default 40 %');
  assert(Math.abs(patch.ctl.sibilance - 1) < 1e-9, 'sibilance default 100 %');
  assert(patch.morph === null, 'no morph at 0 %');
  assert(patch.bend === 0 && patch.bendTime === 0.12, 'bend off, bend time 120 ms');
  assert(patch.crush === null, 'no crusher at 16 bits and 44.1 kHz');
  const crushed = compile({ bits: 6, rate: 8 }).patch;
  assert(crushed.crush && crushed.crush.bits === 6 && crushed.crush.rate === 8, 'BITS and RATE compile to the arcade stage');
  assert(JSON.stringify(patch.amp) === JSON.stringify(JMJR4_AMP_DEFAULTS), 'amp defaults 90 ms / 200 ms / 100 % / 500 ms');
  const bw = D.tract.bw.map((b) => b * bandwidthScale(50));
  assert(patch.ctl.bw.every((b, i) => Math.abs(b - bw[i]) < 1e-9), 'resonance 50 is the plain tract');
}

// ---- the voice supplies its tract keys; explicit keys win ----
{
  const { patch } = compile({ voice: 'nasal' });
  const v = D.voices.nasal;
  assert(Math.abs(patch.nasal - v.nasal / 100) < 1e-9, 'a nasal voice brings its own nasality');
  assert(Math.abs(patch.ctl.flutter - v.flutter / 100) < 1e-9, 'and its flutter');
  const over = compile({ voice: 'nasal', nasal: 0, resonance: 100 }).patch;
  assert(over.nasal === 0, 'an explicit nasal 0 overrides the voice');
  assert(over.ctl.bw[0] < patch.ctl.bw[0], 'resonance 100 narrows every bandwidth');
}

// ---- morph, ties, lines ----
{
  const { patch } = compile({ line: 'doo laa- mmm', morphTo: 'M', morph: 50, morphTime: 0.4 });
  assert(patch.line.length === 3 && patch.line[1].tie === true, 'a trailing dash is a tie');
  assert(patch.morph && patch.morph.time === 0.4 && Math.abs(patch.morph.amount - 0.5) < 1e-9, 'morph carries target, time and amount');
  assert(Math.abs(patch.morph.nasal - 0.5) < 1e-9, 'morphing half way to MMM is half nasal');
  const f = patch.morph.target;
  const a = D.phonemes.OO.f;
  const b = D.phonemes.M.f;
  assert(f.every((x, i) => Math.abs(x - (a[i] + b[i]) / 2) < 1e-6, 'the target is the blend of both vowels\' formants'));
}

// ---- SPEAK: a compiled block plays, a stale one is refused ----
{
  const fx = JSON.parse(readFileSync(new URL('./fixtures/jmjr4-text/cabinet.json', import.meta.url), 'utf8'));
  const jm = { mode: 'speak', voice: 'robot', phrase: fx.text, ending: 'flat', perKey: 'word' };
  const v = { synth: 'JMJR-4', jmjr4: jm };
  const forCompile = compileJmjr4(v, D, { forCompile: true });
  assert(!!forCompile.patch && forCompile.patch.mode === 'speak', 'the desk gets the controls to compile with (forCompile)');
  const sp = forCompile.patch.speak;
  const args = (text) => ({ text, voice: forCompile.patch.throat, speed: sp.speed, pitchHz: sp.pitchHz, range: sp.range, ending: sp.ending, step: sp.step, ctl: forCompile.patch.ctl });
  const whole = compilePhrase(D, fx.lex, args(fx.text));
  const words = fx.text.split(/\s+/).map((w) => compilePhrase(D, fx.lex, args(w)).ir);
  jm.phraseIr = { source: jmjr4SpeakSource(v, D), ir: whole.ir, words };
  const good = compileJmjr4(v, D);
  assert(!!good.patch && good.patch.speak.ir === whole.ir && good.patch.speak.words.length === 4, `a compiled phrase block plays (${good.problems.join('; ')})`);
  assert(Math.abs(good.patch.speak.ir.total_seconds - fx.ir.total_seconds) < 1e-3, 'and it is the reference\'s phrase to the millisecond');
  jm.speed = 1.2;
  refuses('a block whose pots moved since', v, 'stale');
  jm.speed = 1;
  jm.phrase = 'insert coin';
  refuses('a block whose text changed since', v, 'stale');
  jm.phrase = fx.text;
  jm.phraseIr.words = [];
  refuses('per-key words that were not compiled', v, 'words');
  jm.perKey = 'phrase';
  assert(!!compileJmjr4(v, D).patch, 'the same block plays whole when PER KEY is PHRASE');
}

// ---- the shared vibrato adapter ----
assert(jmjr4VibratoOf({ vibrato: { depth: 0 } }) === null, 'no vibrato at depth 0');
assert(jmjr4VibratoOf({ vibrato: { depth: 0.3, rate: 5.2, delay: 0.3 } }).depth === 0.3, 'depth in semitones passes through');

// ---- every shipped JMJR-4 preset compiles ----
{
  const { ok: ids, refused } = jmjr4RenderableIds(VOICES, D);
  assert(Object.keys(refused).length === 0, `no shipped preset is refused (${JSON.stringify(refused)})`);
  console.log(`note: ${ids.length} shipped JMJR-4 presets`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
