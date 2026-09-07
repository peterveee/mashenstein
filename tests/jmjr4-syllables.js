/*
 * The syllable text and the line rule: what a word sings, and which word a step sings.
 *
 *   node tests/jmjr4-syllables.js
 */
import { parseSyllable, syllablesFromText, JMJR4_SYLLABLES, onsetSeconds, syllable } from '../src/engine/jmjr4/syll.js';
import { advanceLine, newLineState } from '../src/engine/jmjr4/line.js';
import { JMJR4_DATA } from '../src/engine/jmjr4/data.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));
const spell = (s) => `${s.onset.join('')}${s.vowel}${s.ending.join('')}${s.tie ? '-' : ''}`;

// ---- the twelve pills ----
const EXPECT = { ooh: 'OO', aah: 'AH', eeh: 'IY', oh: 'OH', mmm: 'M', doo: 'DOO', daa: 'DAH', laa: 'LAH', bah: 'BAH', wah: 'WAH', dee: 'DIY', hey: 'HEY' };
for (const w of JMJR4_SYLLABLES) assert(spell(parseSyllable(w)) === EXPECT[w], `${w} → ${EXPECT[w]}`);
assert(spell(parseSyllable('dum')) === 'DUHM', 'dum closes on M');
assert(spell(parseSyllable('laa-')) === 'LAH-', 'a trailing dash is a tie');
assert(spell(parseSyllable('laaaa')) === 'LAH', 'repeated letters collapse');
assert(parseSyllable('xyz') === null && parseSyllable('') === null, 'a non-syllable is null');
assert(syllablesFromText(' doo  laa- xyz mmm ').length === 3, 'a line keeps the words that parse');
assert(onsetSeconds(JMJR4_DATA, ['D']) === JMJR4_DATA.timing.dur.D, 'an onset lasts what the table says');

// ---- the line rule ----
const line = syllablesFromText('doo laa- laa mmm');
const run = (steps) => { const st = newLineState(); return steps.map((s) => { const r = advanceLine(st, line, s); return spell(r.syl) + (r.onsetSilent ? '!' : ''); }); };
assert(run([0, 1, 2, 3]).join(' ') === 'DOO LAH- LAH! M', 'steps advance the line, the tie silences the next onset');
assert(run([0, 0, 0, 1, 1]).join(' ') === 'DOO DOO DOO LAH- LAH-', 'a chord, a strum or an arpeggio on one step sings one syllable');
assert(run([0, 4, 8, 12, 16]).join(' ') === 'DOO LAH- LAH! M DOO', 'the line wraps round');
assert(run([0, 1, 2, 0, 1]).join(' ') === 'DOO LAH- LAH! DOO LAH-', 'a step going backwards starts the line again');
assert(run([null, null, null, null, null]).join(' ') === 'DOO LAH- LAH! M DOO', 'the desk keyboard advances per key');
const one = syllablesFromText('aah');
const st1 = newLineState();
assert([0, 1, 1, 5].every((s) => advanceLine(st1, one, s).syl === one[0]), 'a one-word line is that word every time');
const st2 = newLineState();
advanceLine(st2, line, 0);
const fresh = newLineState();
assert(advanceLine(fresh, line, 7).syl === line[0], 'a new state starts at the first word whatever the step');

// ---- BREATH reaches the render: the control's `asp` is the aspiration gain ----------
// The reference computes asp_gain = asp * vref / ra from the CONTROLS (robot_voice.py); the
// port read the data file's constant instead, so the pot compiled into every IR and moved
// nothing. The default is that constant, so an untouched preset is unchanged.
{
  const at = (asp) => syllable(JMJR4_DATA, { onset: ['D'], vowel: 'OO', ending: [], hz: 164.81, hold: 1, ctl: { asp } }).levels.asp_gain;
  const dflt = syllable(JMJR4_DATA, { onset: ['D'], vowel: 'OO', ending: [], hz: 164.81, hold: 1, ctl: {} }).levels.asp_gain;
  assert(at(0) === 0, 'BREATH 0 is an aspiration gain of exactly zero');
  assert(Math.abs(at(0.7) - 2 * at(0.35)) < 1e-9, 'and the gain is linear in BREATH (0.7 is twice 0.35)');
  assert(at(JMJR4_DATA.levels.asp) === dflt, 'an omitted BREATH is the data file\'s own level, as before');
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
