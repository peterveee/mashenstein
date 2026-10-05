// B-33P's 8-BIT GATE (src/game/banger/club-fx.js): the whole mix chopped into sixteenths for ONE
// bar — the last before a new section — and only sometimes (Peter, 6 Oct 2026: "only do the
// rhythm gating effect for 1 bar just before a new section. Occasional not too often").
import { lastBarBeforeSection, chipGateRoll, CHIP_GATE_CHANCE } from '../src/game/banger/club-fx.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
// A 24-bar song: intro 1–4, build 5–8, drop 9–24.
const form = [{ role: 'intro', from: 1, to: 4 }, { role: 'build', from: 5, to: 8 }, { role: 'drop', from: 9, to: 24 }];
const gated = Array.from({ length: 24 }, (_, bar) => lastBarBeforeSection(form, bar)).flatMap((on, bar) => (on ? [bar + 1] : []));
assert(gated.join() === '4,8,24', `only the last bar before a section can be gated — bars ${gated.join(', ')} (the last loops back to the top)`);
assert(lastBarBeforeSection(form, 24 + 3) && !lastBarBeforeSection(form, 24 + 4) && !lastBarBeforeSection([], 3),
  'the bar count wraps with the song, and a song with no form is never gated');
const n = 3000;
const hits = Array.from({ length: n }, (_, i) => chipGateRoll(i + 1) < CHIP_GATE_CHANCE).filter(Boolean).length;
assert(CHIP_GATE_CHANCE > 0 && CHIP_GATE_CHANCE <= 0.4 && Math.abs(hits / n - CHIP_GATE_CHANCE) < 0.05,
  `occasional: about ${Math.round(CHIP_GATE_CHANCE * 100)}% of section changes get it (${hits} of ${n})`);
const runs = Array.from({ length: n }, (_, i) => chipGateRoll(i + 1) < CHIP_GATE_CHANCE);
assert(Math.max(...runs.map((on, i) => (on ? runs.slice(i).findIndex((x) => !x) : 0))) <= 8, 'and never a long run of them in a row');

if (failed) { console.error('\nclub-chip-gate: FAILED'); process.exit(1); }
console.log('\nclub-chip-gate: all passed');
