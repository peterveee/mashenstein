// DROP 2 (generator v11, 10 Oct 2026) — Peter: drop 2 was always drop 1 with more parts on; having heard
// the twists, "half time may work for SOME styles occasionally". Checked as promises: every way can be
// asked for and plays what it says against More On (New Bass, Counter-Melody, Half-Time Start,
// Breakbeat); only the second drop changes — drop 1 and the drop after it are untouched; Varied is More
// On, with Half-Time Start about one in four in the styles it suits and never elsewhere; and a request
// that names its form without it is More On, as it was.
import { installDom } from './dom-stub.js';
installDom();
const { generateBanger, normaliseBangerOptions, BANGER_REROLLS } = await import('../tools/lib/banger/index.js');
const { DROP2_WAYS } = await import('../tools/lib/banger/drop-ways.js');
const { expandOrder } = await import('../src/data/arrangements.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const RIFF = { version: 1, source: { id: 'test', title: 'TEST', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70, voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null,
    bars: ['A4:2 . C5:2 . E5:2 . A4:2 . G4:4 . . . E4:2 . G4:2 .', 'F4:2 . A4:2 . C5:4 . . . B4:2 . A4:2 . G4:4 . . .'] }] };
const make = (drop2Way, seed = 7) => generateBanger({ riff: RIFF, seed, options: { style: 'big-room', variation: 'faithful', form: { template: 'club', drop2Way } } });
const barPart = (out, role, bar1) => {
  const lane = out.banger.laneOf[role];
  if (!lane) return [];
  const plan = expandOrder(out.bank.order)[bar1 - 1];
  const sec = out.bank.sections[plan.sec];
  return (sec[lane] || out.bank[lane] || []).slice(plan.half * 16, plan.half * 16 + 16);
};
const steps = (notes) => notes.map((v, i) => [i, v]).filter(([, v]) => v != null && v !== false).map(([i]) => i);
const at = (out, role) => out.form.find((f) => f.role === role);
const span = (out, role, part) => { const s = at(out, role); return JSON.stringify([...Array(s.bars).keys()].map((i) => barPart(out, part, s.from + i))); };

{
  assert(normaliseBangerOptions({}).options.form.drop2Way === 'varied' && normaliseBangerOptions({ form: { template: 'club' } }).options.form.drop2Way === 'more',
    'a new request\'s drop 2 is Varied; one naming its form without it is More On');
  assert(DROP2_WAYS.every((w) => !normaliseBangerOptions({ form: { drop2Way: w.id } }).issues.length) && BANGER_REROLLS.some((r) => r.stream === 'drop2'),
    'every way can be asked for by name, and Modify This Take can draw it again');
  const more = make('more');
  const d2 = at(more, 'drop2');
  for (const w of DROP2_WAYS.filter((x) => x.id !== 'more')) {
    const out = make(w.id);
    const changed = ['hook', 'bass', 'kick', 'counter'].some((r) => span(out, 'drop2', r) !== span(more, 'drop2', r));
    const same = ['hook', 'bass', 'kick'].every((r) => span(out, 'drop', r) === span(more, 'drop', r) && span(out, 'drop3', r) === span(more, 'drop3', r));
    assert(changed && same, `${w.label}: drop 2 changes, drop 1 and drop 3 do not`);
  }
  const brk = make('breakbeat');
  assert(steps(barPart(brk, 'kick', d2.from + 1)).join() === '0,6,10', 'Breakbeat: the kick broken up');
  const ht = make('halftime');
  assert(steps(barPart(ht, 'kick', d2.from + 1)).length < steps(barPart(more, 'kick', d2.from + 1)).length, 'Half-Time Start: fewer kicks in its first bars');
  const ans = make('answer');
  assert(steps(barPart(ans, 'counter', d2.from)).length > 0 && !steps(barPart(more, 'counter', d2.from)).length, 'Counter-Melody: a new line in drop 2');
  assert(!DROP2_WAYS.some((w) => w.id === 'octave'), 'no Hook Up an Octave: it put the riff far too high');
  const drawn = (style, n) => {
    const t = {};
    for (let seed = 1; seed <= n; seed++) {
      const note = generateBanger({ riff: RIFF, seed, options: { style, form: { template: 'club', drop2Way: 'varied' } } }).note;
      const m = (Array.isArray(note) ? note.join('\n') : note).match(/Drop 2 — (.+)$/m);
      const k = m ? m[1] : 'More On';
      t[k] = (t[k] || 0) + 1;
    }
    return t;
  };
  const big = drawn('big-room', 80);
  assert(Object.keys(big).every((k) => ['More On', 'Half-Time Start'].includes(k)) && big['Half-Time Start'] > 8 && big['Half-Time Start'] < 35,
    `Varied in a style that suits it: More On mostly, Half-Time Start now and then (${JSON.stringify(big)})`);
  const trance = drawn('trance', 30);
  assert(Object.keys(trance).join() === 'More On', `and in one it does not suit, More On always (${JSON.stringify(trance)})`);
}
console.log(failed ? '\nbanger drop 2: FAILED' : '\nbanger drop 2: PASSED');
process.exit(failed ? 1 : 0);
