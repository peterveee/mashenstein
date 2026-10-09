// AUTO PORTAMENTO FOR A TAKE — what GO WILD asks the generator for (tools/lib/banger/expression.js)
// and how it is kept: the `expression` option, its seeded stream, the policy that chooses the lane,
// the fingerprint and field-level merge in Modify This Take, and the Lab's recipes (src/game/banger/).
//
// Browserless. The claims worth holding:
//   - the option can never be an issue, whatever a request or an old recipe says;
//   - switching it on moves NOTHING but the settings: bank, sounds, drums, form, faders and every
//     other mix field come out byte for byte the same;
//   - the policy picks a lane only when its sound takes a slide and the settings it is about to write
//     SELECT a connection in its notes, never a family that cannot slide, and never forces one;
//   - Modify moves ONE field of one strip, and says so;
//   - a recipe saved before any of this is made exactly as it was, Go Wild included.
import { installDom } from './dom-stub.js';
import { deskBangerVariation } from '../tools/mixer-banger.js';
import {
  generateBanger, normaliseBangerOptions, surpriseBangerOptions, goCrazyBangerOptions, BANGER_DEFAULTS, BANGER_GROUPS,
  BANGER_GENERATOR_VERSION, BANGER_EXPRESSION_VERSION, normaliseExpression, planExpression, applyExpression,
  EXPRESSION_ROLES, EXPRESSION_POLICY, modifyBanger, describeModify, bangerPrints,
} from '../tools/lib/banger/index.js';
import { BANGER_STYLES } from '../tools/lib/banger/styles/index.js';
import { balanceForStyle } from '../tools/lib/banger/style-balance.js';
import { L, packBank } from '../tools/lib/banger/theory.js';
import { songSlots, laneKeysOf } from '../tools/lib/banger/modify.js';
import { voiceOfLane } from '../tools/lib/banger/expression.js';
import { createLaneView } from '../src/engine/lane-view.js';
import { resolutionOf } from '../src/data/arrangements.js';
import { Rng, hashStr } from '../src/engine/rng.js';
import { VOICES } from '../src/data/voices.js';
import { synthFamily } from '../src/engine/synth-families.js';
import { autoPortamentoSupport } from '../src/engine/auto-portamento.js';

installDom();

let failures = 0;
let quiet = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; } else console.log('ok:', msg);
}
/** For the big loops: one line on failure, silence on success, a count at the end. */
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; } else quiet++;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------- fixtures
const riffOf = (parts, bars, title = 'TEST') => ({
  version: 1, source: { id: 'test', title, from: 0, to: bars - 1, bpm: 120 }, bars, grid: 16, stats: {},
  parts: parts.map((p) => ({ voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, ...p })),
});
const melodyBars = [
  'A4:2 . C5:2 . E5:2 . A4:2 . G4:4 . . . E4:2 . G4:2 .',
  'F4:2 . A4:2 . C5:4 . . . B4:2 . A4:2 . G4:4 . . .',
];
/** A two-bar melodic hook on `voice` — every note with a length of its own, as the Lab writes them. */
const MEL = (voice, bars = melodyBars) => riffOf([{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70, bars, voice }], 2);
const BAND = (voice) => riffOf([
  { key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70, bars: melodyBars, voice },
  { key: 'bass', label: 'Bass', kind: 'melodic', role: 'bass', meanPitch: 40, voice: 'toneSquare', bars: ['A1:4 . . . A1:4 . . . A1:4 . . . A1:4 . . .', 'F1:4 . . . F1:4 . . . G1:4 . . . G1:4 . . .'] },
  { key: 'kick', label: 'Kick', kind: 'drum', role: 'drum', voice: 'ds909Kick', bars: ['x...x...x...x...', 'x...x...x...x...'] },
], 2, 'BAND');
// Sounds, by what Auto Portamento makes of them (src/engine/auto-portamento.js) — checked against
// the real catalogue below, so a preset edited out from under a fixture says so here.
const SLIDES = 'syncRazorLead';          // MRDR-3, sustained lead
const SLIDES2 = 'mrdrConcertFlute';      // MRDR-3, sustained
const GRAND = 'mrdrElectricGrand';       // MRDR-3, decays: a piano
const WIRE_HARP = 'tngrWireHarp';        // TNGR-2
const ON = { autoPortamento: true, version: 1 };
const OFF = { autoPortamento: false, version: 1 };

const portamentoLanes = (mix) => Object.entries(mix.lanes || {}).filter(([, s]) => s.noteFx?.portamento).map(([lane]) => lane);
/** A mix with every lane's `noteFx.portamento` taken out (and a Note FX left empty by it) — all that may differ. */
const withoutPortamento = (mix) => {
  const m = structuredClone(mix);
  for (const strip of Object.values(m.lanes || {})) {
    if (!strip.noteFx) continue;
    delete strip.noteFx.portamento;
    if (!Object.keys(strip.noteFx).length) delete strip.noteFx;
  }
  return m;
};
const gen = (riff, options, seed = 7, extra = {}) => generateBanger({ riff, options, seed, ...extra });
const fakeRng = (calls) => ({ stream: (role) => ({ next: () => { calls[role] = (calls[role] || 0) + 1; return 0.5; } }) });
const laneMap = (o) => new Map(Object.entries(o));

// ---------------------------------------------------------------- the sounds the fixtures rest on
{
  const sup = (id) => autoPortamentoSupport(VOICES[id]);
  assert(sup(SLIDES).supported && sup(SLIDES2).supported && synthFamily(VOICES[SLIDES].synth) === 'MRDR-3',
    'the sustained MRDR-3 leads the fixtures use do take a slide');
  assert(!sup(GRAND).supported && !!sup(GRAND).reason, 'a grand piano decays to nothing, so it has nothing to slide');
  assert(!sup(WIRE_HARP).supported && synthFamily(VOICES[WIRE_HARP].synth) === 'TNGR-2', 'TNGR-2 is not a renderer that has the hand-over yet');
  assert(!sup('toneSquare').supported && synthFamily(VOICES.toneSquare.synth) === 'KNDO-5', 'neither is KNDO-5 — the Written Lead\'s own square');
}

// ---------------------------------------------------------------- the option
{
  const { options, issues } = normaliseBangerOptions({});
  assert(!issues.length && same(options.expression, OFF) && same(BANGER_DEFAULTS.expression, OFF) && BANGER_EXPRESSION_VERSION === 1,
    'Auto Portamento is off unless asked for, and an empty request has nothing to report');
  assert(!BANGER_GROUPS.some((g) => g.id === 'expression' || g.fields.some((f) => /portamento|expression/i.test(f.key))),
    'it is not a switch group, so the desk\'s Make a Banger dialog shows no switch for it');
  let on = normaliseBangerOptions({ expression: { autoPortamento: true, version: 1 } });
  assert(!on.issues.length && same(on.options.expression, ON), 'a request for it, at the version this build knows, turns it on');
  on = normaliseBangerOptions({ expression: { autoPortamento: true } });
  assert(!on.issues.length && same(on.options.expression, ON), 'a request that names no version means the current one');
  // never an issue, never on, whatever else it is given
  const bad = [
    ['not the literal true', { autoPortamento: 1 }], ['a string', { autoPortamento: 'true' }], ['"on"', { autoPortamento: 'on' }],
    ['false', { autoPortamento: false }], ['an object', { autoPortamento: {} }], ['null', { autoPortamento: null }],
    ['an unknown version', { autoPortamento: true, version: 2 }], ['a past version', { autoPortamento: true, version: 0 }],
    ['a version as a string', { autoPortamento: true, version: '1' }], ['a null version', { autoPortamento: true, version: null }],
    ['a NaN version', { autoPortamento: true, version: Number.NaN }], ['a future version', { autoPortamento: true, version: 99 }],
    ['nothing in it', {}], ['an extra key', { autoPortamento: false, speed: 9 }],
  ];
  let calm = true;
  for (const [what, expression] of bad) {
    const r = normaliseBangerOptions({ expression });
    if (r.issues.length || r.options.expression.autoPortamento !== false || r.options.expression.version !== 1) { calm = false; console.error('  not calm:', what, r.issues); }
  }
  assert(calm, 'anything but the literal true at a version this build knows is off — and never an issue');
  const junk = [null, undefined, true, false, 0, 1, 'on', 'true', 42, [], [true], () => 1];
  assert(junk.every((expression) => {
    const r = normaliseBangerOptions({ expression });
    return !r.issues.length && r.options.expression.autoPortamento === false;
  }), 'a malformed `expression` (not even an object) is read as off, without a word');
  assert(same(normaliseExpression(undefined), OFF) && same(normaliseExpression({ autoPortamento: true }), ON) && same(normaliseExpression('x'), OFF),
    'the helper reads the same way');
  // legacy data: the shapes a stored recipe may have had
  const legacy = normaliseBangerOptions({ style: 'eurobeat', mood: 'dark', variation: 'wild' });
  assert(!legacy.issues.length && same(legacy.options.expression, OFF), 'a recipe from before the option existed normalises, with it off');
  assert(same(normaliseBangerOptions(legacy.options).options, legacy.options), 'and a normalised request normalises to itself');
  // Go Crazy and Surprise Me are the desk\'s own buttons: they never touch it
  const base = { ...BANGER_DEFAULTS, tempo: 'custom', bpm: 133, mood: 'dark' };
  const crazy = goCrazyBangerOptions(base);
  assert(same(crazy.expression, OFF) && crazy.variation === 'wild' && crazy.parts.counter && crazy.form.falseEnding,
    'Go Crazy still does what it did, and leaves expression off');
  assert(same(goCrazyBangerOptions({ ...base, expression: ON }).expression, ON), 'and leaves an expression request as it found it');
  const deskWild = deskBangerVariation(base, 'wild');
  assert(same(deskWild.expression, ON) && same(base.expression, OFF),
    'choosing Wild on the desk requests automatic slides without changing the original recipe');
  assert(same(deskBangerVariation(goCrazyBangerOptions(base), 'wild').expression, ON),
    'the desk Go Crazy button requests automatic slides too');
  assert(same(deskBangerVariation(deskWild, 'some').expression, OFF),
    'choosing a milder variation on the desk switches automatic slides off');
  assert(same(normaliseBangerOptions(JSON.parse(JSON.stringify(deskWild))).options.expression, ON),
    'a saved desk Wild request reopens with automatic slides enabled');
  const surprise = surpriseBangerOptions(new Rng(5), base);
  assert(same(surprise.expression, OFF) && same(surpriseBangerOptions(new Rng(5), { ...base, expression: ON }).expression, ON),
    'so does Surprise Me');
  // the generator takes the same data without throwing
  let threw = null;
  for (const expression of [undefined, null, true, 'x', [], { autoPortamento: 'yes' }, { autoPortamento: true, version: 7 }]) {
    try { gen(MEL(SLIDES), { style: 'eurobeat', expression }); } catch (err) { threw = err; }
  }
  assert(!threw, `the generator never throws over an expression request it cannot read${threw ? ` (${threw.message})` : ''}`);
  const future = gen(MEL(SLIDES), { style: 'eurobeat', expression: { autoPortamento: true, version: 7 } });
  assert(!portamentoLanes(future.mix).length && same(future.banger.options.expression, OFF)
    && future.warnings.some((w) => /expression version 7/.test(w)),
  'a version it does not know fails closed — made without, and told');
  assert(!gen(MEL(SLIDES), { style: 'eurobeat', expression: { autoPortamento: 'on' } }).warnings.some((w) => /Portamento/.test(w)),
    'a plain no is not worth a warning');
}
assert(BANGER_GENERATOR_VERSION >= 3 && gen(MEL(SLIDES), { style: 'eurobeat' }).banger.generator === BANGER_GENERATOR_VERSION,
  'the generator is at least version 3 — the one with the expression option, which can change how a take is played — and a take records it');

// ---------------------------------------------------------------- the stream
{
  // The two properties the policy leans on, in src/engine/rng.js: a stream draws nothing from its
  // parent to exist, and a parent's draws never move a child.
  const parent = new Rng(5).stream('expression');
  const hook = parent.stream('hook').next();
  parent.next(); parent.next(); parent.next();
  assert(parent.stream('hook').next() === hook && parent.stream('counter').next() !== hook,
    'a role\'s stream is the same however much its parent has been drawn from, and each role has its own');
  assert(new Rng(5).stream('expression').seed === (hashStr('expression') ^ 5) >>> 0, 'and it is keyed by its name and the seed alone');
}
{
  // Switching it on moves nothing but the settings. Every style, three riffs (a supported lead, a
  // piano, a whole band), both variations, two seeds.
  const startFailures = failures;
  let pairs = 0; let withSetting = 0;
  for (const st of BANGER_STYLES) {
    for (const [rn, riff] of [['lead', MEL(SLIDES)], ['grand', MEL(GRAND)], ['band', BAND(SLIDES)]]) {
      for (const variation of ['some', 'wild']) {
        for (const seed of [1, 7]) {
          const opts = { style: st.id, variation };
          const off = gen(riff, { ...opts, expression: OFF }, seed);
          const on = gen(riff, { ...opts, expression: ON }, seed);
          pairs++;
          const tag = `${st.id}/${rn}/${variation}/${seed}`;
          const lanes = portamentoLanes(on.mix);
          if (lanes.length) withSetting++;
          check(!portamentoLanes(off.mix).length, `${tag}: off has no setting`);
          check(same(off.bank, on.bank), `${tag}: the bank is the same`);
          check(same(off.arrangement, on.arrangement), `${tag}: the arrangement is the same`);
          check(same(withoutPortamento(on.mix), off.mix), `${tag}: every mix field but the portamento is the same`);
          check(same(off.form, on.form) && same(off.summary, on.summary) && same(off.levels, on.levels) && same(off.laneOf, on.laneOf)
            && same(off.transitions, on.transitions), `${tag}: form, summary, levels, lanes and joins are the same`);
          check(same(off.banger.riff, on.banger.riff) && off.banger.seed === on.banger.seed && same(off.banger.form, on.banger.form)
            && same(off.banger.laneOf, on.banger.laneOf), `${tag}: the recipe's riff, seed, form and lanes are the same`);
          const { expression: a, ...offOptions } = off.banger.options;
          const { expression: b, ...onOptions } = on.banger.options;
          check(same(offOptions, onOptions) && same(a, OFF) && same(b, ON), `${tag}: the recorded options differ in expression alone`);
          // the prints: every fingerprint but the expression of the lanes that got one
          const roles = Object.keys(off.banger.prints.roles);
          check(same(roles, Object.keys(on.banger.prints.roles)), `${tag}: the same roles are fingerprinted`);
          for (const role of roles) {
            const po = off.banger.prints.roles[role]; const pn = on.banger.prints.roles[role];
            check(po.notes === pn.notes && po.voice === pn.voice && po.auto === pn.auto, `${tag}: ${role}'s notes, sound and automation prints are the same`);
            check((po.expression !== pn.expression) === lanes.includes(on.laneOf[role]), `${tag}: only a lane that was given a setting has a different expression print (${role})`);
          }
          check(off.banger.prints.master === on.banger.prints.master, `${tag}: the master print is the same`);
          // never more than the two roles, never anywhere else
          check(lanes.length <= 2 && lanes.every((l) => [on.laneOf.hook, on.laneOf.counter].includes(l)), `${tag}: only the hook and the counter can take it (${lanes})`);
          // the note says so, and says nothing else new
          const lines = (n) => n.split('\n').filter((x) => !/^Auto Portamento on /.test(x)).join('\n');
          check(lines(on.note).replace(/generator v\d+/, '') === lines(off.note).replace(/generator v\d+/, ''), `${tag}: the song's note differs only by the line naming the setting`);
          check(!lanes.length === !/Auto Portamento on /.test(on.note), `${tag}: the note names the setting exactly when there is one`);
        }
      }
    }
  }
  assert(failures === startFailures && pairs === BANGER_STYLES.length * 3 * 2 * 2, `${pairs} takes made twice, expression off and on: nothing but the portamento settings moved (${quiet} checks)`);
  assert(withSetting > 0 && withSetting < pairs, `and the setting is there for some takes and not others (${withSetting} of ${pairs})`);
  quiet = 0;
}
{
  // Same seed, same settings; and the settings come from the seed, not from the music
  const a = gen(MEL(SLIDES), { style: 'eurobeat', expression: ON }, 11);
  const b = gen(MEL(SLIDES), { style: 'eurobeat', expression: ON }, 11);
  assert(same(a.mix, b.mix) && same(a.banger.prints, b.banger.prints), 'the same seed and options make the same settings');
  const seen = new Set(); let inRange = true;
  for (let seed = 1; seed <= 80; seed++) {
    const p = gen(MEL(SLIDES), { style: 'eurobeat', expression: ON }, seed).mix.lanes.lead.noteFx?.portamento;
    if (!p) { inRange = false; continue; }
    seen.add(`${p.amount}/${p.glide}`);
    if (!EXPRESSION_POLICY.first.amount.includes(p.amount) || !EXPRESSION_POLICY.first.glide.includes(p.glide) || p.version !== 1 || p.enabled !== true) inRange = false;
  }
  assert(inRange, 'across eighty seeds the hook always gets Amount 30–45 and Glide 35–50, at version 1');
  assert(seen.size >= 8, `and they vary with the seed (${seen.size} different settings)`);
  assert(same(EXPRESSION_POLICY.first.amount, [30, 35, 40, 45]) && same(EXPRESSION_POLICY.first.glide, [35, 40, 45, 50])
    && same(EXPRESSION_POLICY.second.amount, [15, 20, 25]) && same(EXPRESSION_POLICY.second.glide, [35, 40, 45, 50]),
  'the policy table is the documented one');
  // changing expression alone does not reshuffle: drums, harmony and sounds are the off take's, set against
  // a different seed's, which is what a reshuffle would look like
  const off = gen(MEL(SLIDES), { style: 'eurobeat', expression: OFF }, 11);
  const other = gen(MEL(SLIDES), { style: 'eurobeat', expression: OFF }, 12);
  assert(same(a.bank, off.bank) && same(a.mix.voice, off.mix.voice) && !same(off.bank, other.bank),
    'turning it on is not a new seed: the drums, harmony and sounds are the take\'s own');
}

// ---------------------------------------------------------------- the policy, by its parts
// A bank of two melodic lanes, as a generated take has them: a hook and a counter-melody.
const FOUR_BARS = [
  { lead: L('A4:2 . C5:2 . E5:2 . D5:2 . C5:2 . B4:2 . A4:4 . . .'), lead2: L('E5:2 . D5:2 . C5:2 . D5:2 . E5:2 . G5:2 . E5:4 . . .') },
  { lead: L('A4:2 . C5:2 . E5:2 . G5:2 . E5:2 . D5:2 . C5:4 . . .'), lead2: L('G5:2 . E5:2 . D5:2 . E5:2 . G5:2 . A5:2 . G5:4 . . .') },
  { lead: L('F4:2 . A4:2 . C5:2 . B4:2 . A4:2 . G4:2 . F4:4 . . .'), lead2: L('C5:2 . D5:2 . E5:2 . D5:2 . C5:2 . B4:2 . C5:4 . . .') },
  { lead: L('F4:2 . A4:2 . C5:2 . E5:2 . D5:2 . C5:2 . B4:4 . . .'), lead2: L('A5:2 . G5:2 . E5:2 . G5:2 . A5:2 . B5:2 . A5:4 . . .') },
];
const two = ({ hook = SLIDES, counter = SLIDES2, bars = FOUR_BARS } = {}) => ({
  bank: packBank(bars, { bpm: 120, drums: [] }),
  mix: { voice: { leadVoice: hook, lead2Voice: counter }, lanes: { lead: { gain: -3 }, lead2: { gain: -5 } }, labels: { lead: 'LEAD · hook', lead2: 'COUNTER · stabs' } },
  laneOf: laneMap({ hook: 'lead', counter: 'lead2' }),
  bpm: 120, bars: bars.length,
});
const planOf = (fixture, seed = 3) => planExpression({ ...fixture, rng: new Rng(seed).stream('expression') });
/** What a role's stream gives up for a seed, as the policy draws it: first Amount, second Amount, Glide, the coin. */
const drawsOf = (seed, role) => { const r = new Rng(seed).stream('expression').stream(role); return [r.next(), r.next(), r.next(), r.next()]; };
/** The planner's answer for one lane of a fixture at settings, as the policy asks it. */
const plannedAt = (fixture, lane, set) => createLaneView({
  bank: { ...fixture.bank }, mix: fixture.mix, resolution: resolutionOf(fixture.bank), formSteps: fixture.bars * 16,
  voiceFor: (_, l) => voiceOfLane(fixture.mix, l),
}).plan(lane, { enabled: true, ...set }, { secondsPerBeat: 60 / fixture.bpm });
{
  assert(same(EXPRESSION_ROLES, ['hook', 'counter']), 'the roles that may take it are the hook, then the counter');
  const p = planOf(two());
  const [h, c] = p.roles;
  assert(h.role === 'hook' && h.eligible && h.supported && h.candidates > 0 && h.qualifying > 0 && h.chosen > 0 && h.set && h.sound === SLIDES,
    'a hook on a sustained lead, whose settings select connections to slide, is given them');
  assert(c.role === 'counter' && c.eligible && c.candidates > 0, 'so can a counter-melody that is also a sustained, melodic line');
  assert(EXPRESSION_POLICY.first.amount.includes(h.set.amount) && EXPRESSION_POLICY.first.glide.includes(h.set.glide), 'the first role gets the main Amount (30–45) and a Glide of 35–50');
  assert(!c.set || (EXPRESSION_POLICY.second.amount.includes(c.set.amount) && EXPRESSION_POLICY.second.glide.includes(c.set.glide) && c.set.amount < 30),
    'the second, when it gets one at all, gets a lighter Amount (15–25)');

  // the coin, and the lighter settings it brings: read straight off the counter's own stream
  let coinYes = 0; let taken = 0; let lighter = true; const amounts = new Set(); let honest = true;
  for (let seed = 1; seed <= 300; seed++) {
    const [first, second] = planOf(two(), seed).roles;
    check(first.set && first.set.amount >= 30, `seed ${seed}: the first role always has a setting`);
    const d = drawsOf(seed, 'counter');
    const yes = d[3] < EXPRESSION_POLICY.second.chance;
    if (yes) coinYes++;
    if (!yes) { if (second.set || second.reason !== 'second') honest = false; continue; }
    // the coin said yes: the lighter settings are the stream's own picks, and they are given only if they select something
    const want = { amount: EXPRESSION_POLICY.second.amount[Math.floor(d[1] * 3)], glide: EXPRESSION_POLICY.second.glide[Math.floor(d[2] * 4)] };
    if (second.set) {
      taken++; amounts.add(second.set.amount);
      if (!same(second.set, want) || !(second.chosen > 0) || !(second.set.amount < first.set.amount)) lighter = false;
    } else if (!['unselected', 'weak', 'no-candidates'].includes(second.reason) || second.chosen !== 0) honest = false;
  }
  assert(coinYes > 100 && coinYes < 200, `the second role's coin comes up about half the time (${coinYes} of 300)`);
  assert(honest, 'a second role whose coin says no is passed over as such; one whose coin says yes is given its settings or told why not');
  assert(taken > 0 && taken <= coinYes && lighter && [...amounts].every((a) => EXPRESSION_POLICY.second.amount.includes(a)),
    `and those settings are the second stream's own lighter picks — Amount 15, 20 or 25 — each one selecting something (${taken} taken: ${[...amounts].sort()})`);

  // a role's numbers are its own stream's: the same whichever way the other one went
  const hookOnly = planOf(two({ counter: GRAND }), 9);
  const both = planOf(two(), 9);
  assert(same(hookOnly.roles[0].set, both.roles[0].set) && hookOnly.roles[1].reason === autoPortamentoSupport(VOICES[GRAND]).reason && !hookOnly.roles[1].set,
    'a role\'s settings do not depend on how the other role went');
  // fixed draws, whichever branch is taken
  const branches = {
    'both qualify': two(),
    'the hook is a piano': two({ hook: GRAND }),
    'the counter is a piano': two({ counter: GRAND }),
    'no counter lane': { ...two(), laneOf: laneMap({ hook: 'lead' }) },
    'neither lane': { ...two(), laneOf: laneMap({}) },
    'a hook with nothing to slide': two({ bars: [{ lead: L('A4:2 . A4:2 . A4:2 . A4:2 . A4:2 . A4:2 . A4:4 . . .') }, { lead: L('A4:2 . A4:2 . A4:2 . A4:2 . A4:2 . A4:2 . A4:4 . . .') }] }),
  };
  let steady = true;
  for (const [name, fixture] of Object.entries(branches)) {
    const calls = {};
    planExpression({ ...fixture, rng: fakeRng(calls) });
    if (!(calls.hook === 4 && calls.counter === 4 && Object.keys(calls).length === 2)) { steady = false; console.error('  draws:', name, calls); }
  }
  assert(steady, 'each role stream gives up the same four values whichever branch is taken, and nothing else is drawn from');
}
{
  // never forced: no material, no setting
  const none = (bars) => planOf(two({ bars, counter: GRAND })).roles[0];
  const stay = L('A4:2 . A4:2 . A4:2 . A4:2 . A4:2 . A4:2 . A4:4 . . .');
  assert(none([{ lead: stay }, { lead: stay }]).reason === 'no-candidates' && none([{ lead: stay }, { lead: stay }]).candidates === 0,
    'a hook that only repeats one note has no connection to slide, and gets none');
  const stac = L('A4:1 . . . C5:1 . . . E5:1 . . . D5:1 . . .');
  assert(none([{ lead: stac }, { lead: stac }]).reason === 'no-candidates', 'a hook of short, spaced notes keeps its attacks');
  const leaps = L('A4:2 . C6:2 . A4:2 . C6:2 . A4:2 . C6:2 . A4:4 . . .');
  assert(none([{ lead: leaps }, { lead: leaps }]).reason === 'no-candidates', 'and so does one that only leaps more than an octave');
  const chordy = L('A4+C5+E5:4 . . . F4+A4+C5:4 . . . G4+B4+D5:4 . . . A4+C5+E5:4 . . .');
  assert(none([{ lead: chordy }, { lead: chordy }]).reason === 'no-candidates', 'a hook of chords has nothing to slide');
  // and the music decides, not the dice: the connections on offer do not depend on the seed
  const counts = new Set();
  for (let seed = 1; seed <= 25; seed++) counts.add(planOf(two(), seed).roles[0].candidates);
  assert(counts.size === 1, 'which connections the planner finds does not depend on the seed — only the settings do');
}
{
  // Asked with the settings it is about to write. A lane can have connections the planner calls
  // eligible and still earn nothing at an ordinary Amount — wide, off-beat leaps are too weak to be
  // worth a slide — so "is there anything here at Amount 100" is not "would this lane slide".
  const WEAK = 'A4:2 . F#5:2 . A4:2 . F#5:2 . F#5:2 . . . . . . .';   // leaps of nine semitones, ending on a repeat
  const weakBars = FOUR_BARS.map((b) => ({ lead: L(WEAK), lead2: b.lead2 }));
  const fx = two({ bars: weakBars });
  const ask = (amount) => plannedAt(fx, 'lead', { amount, glide: 40 });
  const widest = ask(100);
  const ordinary = [30, 35, 40, 45].map(ask);
  assert(widest.candidates.some((c) => c.eligible) && ordinary.every((p) => p.qualifying === 0 && !p.transitions.length),
    'the fixture: connections that are eligible at the widest Amount and select nothing at any ordinary one (it rests on the planner\'s floor)');
  const weak = planOf(fx, 3).roles[0];
  assert(weak.eligible && weak.candidates > 0 && weak.qualifying === 0 && weak.chosen === 0 && !weak.set && weak.reason === 'weak',
    'a hook whose connections are all too weak at the settings it would be given gets none, and says why');
  // ...and does not use up the main settings: the counter, which does select something, is offered them
  let mainForCounter = true; let counterSet = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const [hook, counter] = planOf(fx, seed).roles;
    const d = drawsOf(seed, 'counter');
    if (hook.set || !counter.set) { mainForCounter = false; continue; }
    counterSet++;
    if (!same(counter.set, { amount: EXPRESSION_POLICY.first.amount[Math.floor(d[0] * 4)], glide: EXPRESSION_POLICY.first.glide[Math.floor(d[2] * 4)] })) mainForCounter = false;
  }
  assert(mainForCounter && counterSet === 60,
    'a role that selects nothing does not take the main settings with it: the next role is given them, whatever its own coin says');
  // a budget that rounds to none at a light Amount: the lighter settings are not written either
  const amountOf = (seed) => EXPRESSION_POLICY.second.amount[Math.floor(drawsOf(seed, 'counter')[1] * 3)];
  const yes = (seed) => drawsOf(seed, 'counter')[3] < EXPRESSION_POLICY.second.chance;
  const light = Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => yes(seed) && amountOf(seed) === 15);
  const lightPlan = light && planOf(two(), light).roles[1];
  assert(light && lightPlan.eligible && lightPlan.qualifying > 0 && lightPlan.chosen === 0 && !lightPlan.set && lightPlan.reason === 'unselected',
    'a counter-melody offered Amount 15 whose phrases are too short for that budget to choose any is not given it, and says why');
  const firmer = Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => yes(seed) && amountOf(seed) === 25);
  const firmPlan = firmer && planOf(two(), firmer).roles[1];
  assert(firmer && firmPlan.set && firmPlan.set.amount === 25 && firmPlan.chosen > 0, 'while Amount 25 on the same lane does select something, and is given');
  // what is written is exactly what was planned: no role is given settings that select nothing
  let agree = true;
  for (let seed = 1; seed <= 60; seed++) {
    for (const r of planOf(two(), seed).roles) {
      if (!r.set) continue;
      const again = plannedAt(two(), r.lane, r.set);
      if (!again.transitions.length || again.transitions.length !== r.chosen) agree = false;
    }
  }
  assert(agree, 'every setting that is written selects exactly what the plan said it would, and at least one connection');
}
{
  // lanes: the bass, a chord lane, a gesture lane
  const swap = (lane) => ({ ...two(), laneOf: laneMap({ hook: lane }), mix: { voice: { [`${lane}Voice`]: SLIDES }, lanes: { [lane]: {} }, labels: {} },
    bank: packBank(FOUR_BARS.map((b) => ({ [lane]: b.lead })), { bpm: 120, drums: [] }) });
  const r = (lane) => planOf(swap(lane)).roles[0];
  assert(r('bass').reason === 'bass' && r('bass2').reason === 'bass' && !r('bass').set, 'a melody that lives on the bass lane is the bass: no slide');
  assert(r('chords').reason === 'lane' && r('organChords').reason === 'lane' && r('gliss').reason === 'lane', 'nor on a chord lane or a gesture lane');
  assert(r('lead').eligible && r('leadHarm').eligible && r('twinkle').eligible, 'the lead, harmony and twinkle lanes are where it can go');
  // a drum or a pad is no role of its own here: only the two roles are ever looked at
  const withDrums = { ...two(), laneOf: laneMap({ hook: 'lead', kick: 'kick', saws: 'chords', pad: 'chords2', piano: 'chords3', arp: 'lead4' }) };
  const plan = planOf(withDrums);
  assert(plan.roles.length === 2 && plan.roles.every((x) => ['hook', 'counter'].includes(x.role)), 'drums, chords, pads, piano and arps are never considered');
  // a slide setting the riff came with is its owner's
  const owned = two();
  owned.mix.lanes.lead.noteFx = { portamento: { enabled: true, amount: 90, glide: 10, version: 1 } };
  const own = planOf(owned);
  assert(own.roles[0].reason === 'already-set' && !own.roles[0].set && own.roles[1].set && own.roles[1].set.amount >= 30,
    'a lane that already has a slide setting is left as it was, and the counter becomes the first role');
  // a preset the lane may not play is no sound at all
  const restricted = two();
  restricted.mix.voiceParams = { leadVoice: { ...VOICES[SLIDES], lanes: ['bass'] } };
  assert(planOf(restricted).roles[0].reason === 'no-voice', 'a preset restricted to other lanes does not play here, so there is nothing to slide');
  // the song's own copy of a preset is what plays, not the library name beside it
  const copy = two({ hook: GRAND });
  copy.mix.voiceParams = { leadVoice: structuredClone(VOICES[SLIDES]) };
  assert(planOf(copy).roles[0].eligible, 'a song-local copy of a preset (voiceParams) is judged in place of the library preset');
  const pianoCopy = two();
  pianoCopy.mix.voiceParams = { leadVoice: structuredClone(VOICES[GRAND]) };
  assert(planOf(pianoCopy).roles[0].reason === autoPortamentoSupport(VOICES[GRAND]).reason && !planOf(pianoCopy).roles[0].eligible,
    'and a piano copy is a piano whatever the lane is named');
  // arranged FX: a bar of generated notes is no melody
  const arped = two();
  arped.mix.lanes.lead.noteFx = { arp: { enabled: true, rate: 1, octaves: 1 } };
  assert(planOf(arped).roles[0].reason === 'no-candidates', 'a lane the arpeggiator plays has no melody for the planner to read');
}
{
  // applying: merged into Note FX, nothing else on the strip moves
  const fx = two();
  fx.mix.lanes.lead = { gain: -3, pan: 0.2, send: { reverb: 0.3 }, eq: { high: 2 }, noteFx: { strum: { enabled: false, rate: 2 } } };
  const before = structuredClone(fx.mix);
  const done = applyExpression({ ...fx, rng: new Rng(3).stream('expression') });
  const lead = fx.mix.lanes.lead;
  assert(done.applied.length >= 1 && done.applied[0].role === 'hook', 'applying reports the roles it set');
  assert(same(lead.noteFx.strum, before.lanes.lead.noteFx.strum) && lead.gain === -3 && lead.pan === 0.2 && same(lead.send, { reverb: 0.3 }) && same(lead.eq, { high: 2 }),
    'it is MERGED into the lane\'s Note FX: a strum beside it stays, and so does everything else on the strip');
  const set = lead.noteFx.portamento;
  assert(set.enabled === true && set.version === 1 && Number.isInteger(set.amount) && Number.isInteger(set.glide) && same(Object.keys(set), ['enabled', 'amount', 'glide', 'version']),
    'and it is the ordinary lane setting: enabled, Amount, Glide, version 1');
  assert(same(fx.mix.voice, before.voice) && same(fx.mix.labels, before.labels), 'the sounds and the names are untouched');
}

// ---------------------------------------------------------------- a take, end to end
{
  const lead = (out) => out.mix.lanes[out.laneOf.hook];
  const supported = gen(MEL(SLIDES), { style: 'eurobeat', expression: ON }, 3);
  const p = lead(supported).noteFx?.portamento;
  assert(p && p.enabled && p.version === 1 && portamentoLanes(supported.mix).join() === supported.laneOf.hook,
    'a take whose hook is a sustained lead with connections gets a setting on exactly the hook\'s lane');
  assert(supported.banger.prints.roles.hook.expression !== bangerPrints({ bank: supported.bank, mix: withoutPortamento(supported.mix), arrangement: supported.arrangement, laneOf: supported.laneOf }).roles.hook.expression,
    'and its fingerprint knows');
  for (const [what, voice] of [['a piano', GRAND], ['a TNGR-2 harp', WIRE_HARP], ['a KNDO-5 square', 'toneSquare']]) {
    const out = gen(MEL(voice), { style: 'eurobeat', expression: ON }, 3);
    assert(!portamentoLanes(out.mix).length && !/Auto Portamento on/.test(out.note), `a hook on ${what} gets none`);
  }
  // the Written Lead: a riff with no tune writes one, and the hook it writes is judged like any other
  const chordsOnly = riffOf([{ key: 'chords', label: 'Chords', kind: 'chord', role: 'chords', meanPitch: 60, voice: 'toneSquare',
    bars: ['A3+C4+E4:8 . . . . . . . F3+A3+C4:8 . . . . . . .', 'G3+B3+D4:8 . . . . . . . E3+G3+B3:8 . . . . . . .'] }], 2, 'CHORDS');
  const written = gen(chordsOnly, { style: 'eurobeat', expression: ON }, 4);
  assert(written.warnings.some((w) => /written/.test(w)) && !portamentoLanes(written.mix).some((l) => l !== written.laneOf.hook),
    'a Written Lead is the hook, and only it can take the setting');
  assert(typeof written.banger.prints.roles.hook.expression === 'string', 'and is fingerprinted like any other');
  // a sweep of every pitched preset as the hook: set exactly where the preset takes a slide
  let n = 0; let got = 0; const wrong = [];
  const families = {};
  for (const [id, v] of Object.entries(VOICES)) {
    if (v.kind === 'drum' || v.kind === 'noise') continue;
    n++;
    const out = gen(MEL(id), { style: 'eurobeat', expression: ON }, 5);
    const has = !!out.mix.lanes[out.laneOf.hook]?.noteFx?.portamento;
    const ok = autoPortamentoSupport(v).supported;
    if (has) got++;
    if (has !== ok) wrong.push(`${id}${has ? ' (set, unsupported)' : ' (supported, not set)'}`);
    const f = v.kind === 'engine' ? 'engine' : synthFamily(v.synth);
    families[f] = (families[f] || 0) + (has ? 1 : 0);
  }
  assert(!wrong.length, `across all ${n} pitched presets as the hook, the setting is there exactly where the preset takes a slide (${got} do)${wrong.length ? `: ${wrong.slice(0, 5)}` : ''}`);
  assert(['TNGR-2', 'KNDO-5', 'RMND-2', 'WNDR-9', 'JMJR-4', 'engine'].every((f) => !families[f]),
    `and never on TNGR-2, KNDO-5, RMND-2, WNDR-9, JMJR-4 or an engine preset (${JSON.stringify(families)})`);
}

// ---------------------------------------------------------------- Modify This Take
{
  const madeWith = (options, seed = 7) => gen(MEL(SLIDES), { style: 'eurobeat', ...options }, seed);
  const made = madeWith({ expression: ON });
  const hook = made.laneOf.hook;
  const hookName = made.mix.labels[hook].split(' · ')[0];
  const generated = made.mix.lanes[hook].noteFx.portamento;
  assert(generated && made.banger.prints.roles.hook.expression, 'the take Modify starts from has a setting to keep or replace');
  // the song as the desk holds it: a hand-edited slide, a fader, a strum beside it, automation of its own
  const heldBy = (m, edit) => {
    const current = { bank: structuredClone(m.bank), mix: structuredClone(m.mix), arrangement: structuredClone(m.arrangement), banger: m.banger };
    edit(current);
    return current;
  };
  const hand = { enabled: true, amount: 80, glide: 10, version: 1 };
  const current = heldBy(made, (c) => {
    const s = c.mix.lanes[hook];
    s.noteFx = { ...s.noteFx, portamento: structuredClone(hand), strum: { enabled: false, rate: 2 } };
    s.gain = -9.5; s.send = { reverb: 0.77 }; s.eq = { high: -3 }; s.effects = [{ id: 'delay', params: { time: 0.25 } }];
    (c.arrangement.automation ||= {})[hook] = { gain: [{ at: 0, value: -3 }] };
  });
  const stripOf = (song) => structuredClone(song.mix.lanes[hook]);

  // 1. unchanged -> keep the song's own, hand edit and all
  {
    const next = madeWith({ expression: ON, drums: { congas: true } });
    const out = modifyBanger({ current, next, base: made.banger.prints });
    assert(out.ok && out.report.added.length === 1 && !out.report.replaced.length, 'an unrelated change (a new drum part) is an ordinary modification');
    assert(same(out.mix.lanes[hook], current.mix.lanes[hook]), 'a generated expression that did not change leaves the song\'s own strip exactly as it is — hand edit included');
    assert(!out.report.expression.length && !out.report.expressionOff.length && !out.report.handEditedExpression.length, 'and the report says nothing about expression');
    assert(!/Portamento/.test(describeModify(out.report)), 'nor does the toast');
  }
  // 2. the new take has none: an explicit removal of the field, hand edit reported, the rest of the strip stays
  {
    const next = madeWith({ expression: OFF });
    const out = modifyBanger({ current, next, base: made.banger.prints });
    const s = stripOf(out);
    assert(out.ok && s.noteFx && !('portamento' in s.noteFx), 'a setting the new take no longer has is taken off the lane');
    const expected = stripOf(current); delete expected.noteFx.portamento;
    assert(same(s, expected), 'and ONLY that field: the fader, sends, EQ, effects, the strum beside it — the strip is as the song had it');
    assert(same(out.arrangement.automation[hook], current.arrangement.automation[hook]), 'the automation of the lane stays');
    assert(out.report.expressionOff.join() === hookName && !out.report.expression.length && out.report.handEditedExpression.join() === hookName,
      'it is reported as taken off, and as a hand edit replaced');
    assert(/Auto Portamento taken off/.test(describeModify(out.report)) && !out.report.replaced.length && !out.report.added.length && !out.report.resounded.length && !out.report.removed.length,
      'the toast says so, and no other part is said to have changed');
    assert(same(out.bank.sections, songSlots(current.bank, current.arrangement).map((x) => x.sec)), 'no note moved');
    // the same, with nothing else in the Note FX: the empty Note FX goes too
    const plain = heldBy(made, () => {});
    const gone = modifyBanger({ current: plain, next, base: made.banger.prints });
    assert(!('noteFx' in gone.mix.lanes[hook]) && same(withoutPortamento(plain.mix).lanes[hook], gone.mix.lanes[hook]), 'a Note FX left empty by the removal goes with it');
    assert(!gone.report.handEditedExpression.length && gone.report.expressionOff.length === 1, 'an unedited setting is replaced without being called a hand edit');
  }
  // 3. a different setting: replaced, field only
  {
    const next = structuredClone(made);
    next.mix.lanes[hook].noteFx.portamento = { enabled: true, amount: 45, glide: 50, version: 1 };
    const out = modifyBanger({ current, next, base: made.banger.prints });
    const expected = stripOf(current); expected.noteFx.portamento = { enabled: true, amount: 45, glide: 50, version: 1 };
    assert(out.ok && same(stripOf(out), expected), 'a changed setting replaces that field, and only that one');
    assert(out.report.expression.join() === hookName && out.report.handEditedExpression.join() === hookName && /Auto Portamento set on/.test(describeModify(out.report)),
      'reported as set, and the hand edit it replaced is named');
    const clean = heldBy(made, () => {});
    const fresh = modifyBanger({ current: clean, next, base: made.banger.prints });
    assert(same(fresh.mix.lanes[hook].noteFx.portamento, next.mix.lanes[hook].noteFx.portamento) && !fresh.report.handEditedExpression.length,
      'over an unedited setting it is simply replaced');
    const [snapCurrent, snapNext, snapBase] = [JSON.stringify(current), JSON.stringify(next), JSON.stringify(made.banger.prints)];
    modifyBanger({ current, next, base: made.banger.prints });
    assert(JSON.stringify(current) === snapCurrent && JSON.stringify(next) === snapNext && JSON.stringify(made.banger.prints) === snapBase,
      'Modify does not change the song it is given, the take it merges in, or the prints');
    // a song that has no strip at all for the lane (a saved mix keeps only what it set) gets one with the field alone
    const sparse = heldBy(made, (c) => { delete c.mix.lanes[hook]; });
    const filled = modifyBanger({ current: sparse, next, base: made.banger.prints });
    assert(same(filled.mix.lanes[hook], { noteFx: { portamento: { enabled: true, amount: 45, glide: 50, version: 1 } } }),
      'where the song has no strip for the lane, the setting arrives on one of its own, and nothing else is invented');
    // equivalent spellings of the generated setting are not a hand edit
    const respelt = heldBy(made, (c) => { c.mix.lanes[hook].noteFx.portamento = { glide: generated.glide, amount: generated.amount, enabled: true }; });
    const again = modifyBanger({ current: respelt, next, base: made.banger.prints });
    assert(!again.report.handEditedExpression.length, 'the same setting written with its keys in another order, or without its version, is not a hand edit');
  }
  // 4. a setting added where there was none (an older take, or one made with it off)
  {
    const off = madeWith({ expression: OFF });
    const turnedOn = madeWith({ expression: ON });
    const plain = heldBy(off, () => {});
    const out = modifyBanger({ current: plain, next: turnedOn, base: off.banger.prints });
    assert(out.ok && same(out.mix.lanes[hook].noteFx.portamento, turnedOn.mix.lanes[hook].noteFx.portamento) && out.report.expression.join() === hookName
      && !out.report.handEditedExpression.length && !out.report.replaced.length, 'turning it on for a take that had none sets it on the hook, as a plain addition');
    // the user's own, set by hand where the take had none, is replaced — and named
    const own = heldBy(off, (c) => { c.mix.lanes[hook].noteFx = { portamento: { enabled: true, amount: 20, glide: 90, version: 1 } }; });
    const over = modifyBanger({ current: own, next: turnedOn, base: off.banger.prints });
    assert(over.report.handEditedExpression.join() === hookName, 'a setting the user added by hand is a hand edit when the change replaces it');
    // and kept when the change does not reach it
    const kept = modifyBanger({ current: own, next: off, base: off.banger.prints });
    assert(same(kept.mix.lanes[hook], own.mix.lanes[hook]) && !kept.report.expression.length, 'but kept, as it is, when it does not');
  }
  // 5. an older take's prints have no expression field: not every lane is an edited one
  {
    const off = madeWith({ expression: OFF });
    const old = structuredClone(off.banger.prints);
    for (const r of Object.values(old.roles)) delete r.expression;
    const plain = heldBy(off, () => {});
    const out = modifyBanger({ current: plain, next: madeWith({ expression: OFF }), base: old });
    assert(out.ok && describeModify(out.report) === 'nothing in the music changed' && !out.report.handEditedExpression.length
      && !out.report.expression.length && !out.report.expressionOff.length, 'prints from before there was an expression field do not make every lane look edited');
    assert(same(out.mix, plain.mix) || same(withoutPortamento(out.mix), withoutPortamento(plain.mix)), 'and nothing on the strips moves');
    const added = modifyBanger({ current: plain, next: madeWith({ expression: ON }), base: old });
    assert(added.report.expression.join() === hookName && !added.report.handEditedExpression.length, 'an old take can be given the setting without anything being called an edit');
    const ownOld = heldBy(off, (c) => { c.mix.lanes[hook].noteFx = { portamento: structuredClone(hand) }; });
    const kept = modifyBanger({ current: ownOld, next: madeWith({ expression: OFF }), base: old });
    assert(same(kept.mix.lanes[hook].noteFx.portamento, hand), 'and a setting the user gave an old take is kept when the change leaves it alone');
  }
  // 6. an expression request that changes nothing in the music still says so
  {
    const grand = gen(MEL(GRAND), { style: 'big-room', expression: OFF }, 7);
    const grandOn = gen(MEL(GRAND), { style: 'big-room', expression: ON }, 7);
    const out = modifyBanger({ current: heldBy(grand, () => {}), next: grandOn, base: grand.banger.prints });
    assert(out.ok && describeModify(out.report) === 'nothing in the music changed', 'asking for it where the hook is a piano changes nothing, and says so');
  }
  // 7. it goes through the part's own lane, wherever the generator would put it now
  {
    const moved = heldBy(made, (c) => {
      const to = 'lead2';
      for (const sec of [...c.bank.sections, ...(c.arrangement.sections || [])]) {
        for (const k of laneKeysOf(sec, hook)) { sec[to + k.slice(hook.length)] = sec[k]; delete sec[k]; }
      }
      for (const k of laneKeysOf(c.bank, hook)) { c.bank[to + k.slice(hook.length)] = c.bank[k]; delete c.bank[k]; }
      c.mix.lanes[to] = c.mix.lanes[hook]; delete c.mix.lanes[hook];
      c.mix.voice[`${to}Voice`] = c.mix.voice[`${hook}Voice`]; delete c.mix.voice[`${hook}Voice`];
      c.mix.labels[to] = c.mix.labels[hook]; delete c.mix.labels[hook];
      c.mix.order = c.mix.order.map((k) => (k === hook ? to : k));
      c.mix.layers = [...(c.mix.layers || []), { key: to, from: hook, independent: true }];
      c.banger = { ...c.banger, laneOf: { ...c.banger.laneOf, hook: to } };
    });
    const out = modifyBanger({ current: moved, next: madeWith({ expression: OFF }), base: made.banger.prints });
    assert(out.ok && out.banger.laneOf.hook === 'lead2' && !out.mix.lanes.lead2?.noteFx?.portamento && !out.mix.lanes[hook],
      'a removal is made on the lane the part has in the song, not the lane the generator would give it now');
    const stronger = structuredClone(made);
    stronger.mix.lanes[hook].noteFx.portamento = { enabled: true, amount: 45, glide: 50, version: 1 };
    const set = modifyBanger({ current: moved, next: stronger, base: made.banger.prints });
    assert(set.ok && set.mix.lanes.lead2.noteFx.portamento.amount === 45 && !(hook in set.mix.lanes) && set.mix.lanes.lead2.gain === moved.mix.lanes.lead2.gain,
      'and a new setting is written there too, with the strip as the song had it');
  }
  // 8. a part whose strip is swapped for a new sound keeps its own setting unless the change reached it
  {
    const resound = (m, voice) => {
      const next = structuredClone(m);
      next.mix.voice[`${hook}Voice`] = voice;
      next.mix.lanes[hook].gain = -1.5;
      return next;
    };
    const next = resound(made, SLIDES2);
    const out = modifyBanger({ current, next, base: made.banger.prints });
    assert(out.report.resounded.length === 1 && out.mix.voice[`${hook}Voice`] === SLIDES2 && out.mix.lanes[hook].gain === -1.5,
      'a new sound swaps the strip, as it always did');
    assert(same(out.mix.lanes[hook].noteFx.portamento, hand), 'but the setting the change did not reach is the song\'s own, not the swapped strip\'s');
    const changed = resound(made, SLIDES2);
    changed.mix.lanes[hook].noteFx.portamento = { enabled: true, amount: 15, glide: 35, version: 1 };
    const both = modifyBanger({ current, next: changed, base: made.banger.prints });
    assert(same(both.mix.lanes[hook].noteFx.portamento, { enabled: true, amount: 15, glide: 35, version: 1 }) && both.report.handEditedExpression.join() === hookName,
      'and one it did reach comes in from the new take');
  }
  // 9. every part of a take is fingerprinted, off or on, and a take with it off prints the same as one that never heard of it
  {
    const roles = made.banger.prints.roles;
    assert(Object.values(roles).every((r) => typeof r.expression === 'string'), 'every part of a take carries an expression fingerprint');
    const none = madeWith({ expression: OFF }).banger.prints.roles;
    assert(Object.entries(none).every(([role, r]) => r.expression === none.kick?.expression || role === 'kick') && none.hook.expression === none.kick.expression
      && roles.hook.expression !== none.hook.expression,
    'a part with no setting prints as nothing (the same for all of them), and the hook that has one prints differently');
  }
}

// ---------------------------------------------------------------- the Lab's recipes
{
  const { riffFromNotes, DEFAULT_SIMPLE } = await import('../src/game/banger/riff.js');
  const make = await import('../src/game/banger/make.js');
  const store = await import('../src/game/banger/store.js');
  const { makeBanger, MAKER_STYLES, defaultMoodFor, hookSoundFor, labSoundSet, spotFor, RECIPE_EXPRESSION, expressionVersionOf, RIFF_TRIM_DB, FORMS_BEFORE_5 } = make;
  const { keepBanger, reviseBanger, songFor, bangerState } = store;
  const notes = DEFAULT_SIMPLE;
  const recipe = (style, seed = 3, extra = {}) => ({ notes, mode: 'simple', style, mood: defaultMoodFor(style), seed, ...extra });
  const hookOf = (song) => song.mix.lanes.lead;
  // The Lab's Sound Set for the take (make.js LAB_SOUND_SETS): chipstep and synthwave play on Light.
  const labSet = (r) => (labSoundSet(r.style, r.seed, r.voltage) !== 'style' ? { parts: { soundSet: labSoundSet(r.style, r.seed, r.voltage) } } : {});
  // ...and its flavour (make.js labFlavour): the mood's, or a surprise by the voltage.
  const labFlav = (r) => { const f = make.labFlavour(r.style, r.mood, r.seed, r.voltage); return f ? { flavour: f } : {}; };
  const direct = (r, options) => generateBanger({ riff: riffFromNotes(r.notes, hookSoundFor(r.style, r.mood, r.seed, r.voltage), r.mode), seed: r.seed,
    options: { style: r.style, mood: r.mood, energy: 'full', ...(spotFor(r.style, r.seed) && Object.keys(spotFor(r.style, r.seed)).length ? { spot: spotFor(r.style, r.seed) } : {}), ...labSet(r), ...labFlav(r), ...options } });
  // The Lab's hook trim: the style's own riffTrimDb (style-balance.js) where it sets one, RIFF_TRIM_DB otherwise.
  const hookTrim = (style) => { const t = balanceForStyle(BANGER_STYLES.find((st) => st.id === style)).riffTrimDb; return Number.isFinite(t) ? t : RIFF_TRIM_DB; };
  // what makeBanger lays over the generator's output: the hook's trim, and THE CEILING on the mix
  const trimmed = (out) => { const o = structuredClone(out); const l = o.mix.lanes[o.laneOf.hook]; l.gain = Math.round(((l.gain ?? 0) + hookTrim(o.banger.options.style)) * 10) / 10; o.mix.ceiling = true; return o; };

  assert(RECIPE_EXPRESSION === 5 && expressionVersionOf(1) === 1 && expressionVersionOf(2) === 2 && expressionVersionOf(0) === 0
    && expressionVersionOf(undefined) === 0 && expressionVersionOf('1') === 0 && expressionVersionOf(-1) === 0 && expressionVersionOf(Number.NaN) === 0 && expressionVersionOf(null) === 0,
  'a recipe\'s expression version is 5 for a new recipe, and anything unreadable reads as none');

  // VOLTAGE ROLLS (expression 2): read off the seed, so a kept take is made again the same;
  // the higher the voltage, the more often the bass and the chord gate move
  {
    const { voltageRollsFor, VOLTAGE_ROLL_ODDS } = make;
    const seeds = Array.from({ length: 400 }, (_, i) => (i * 2654435761) >>> 0 || 1);
    const rate = (style, mood, v, has) => seeds.filter((s) => has(voltageRollsFor(style, mood, v, s))).length / seeds.length;
    assert(same(voltageRollsFor('big-room', 'anthemic', 3, 77), voltageRollsFor('big-room', 'anthemic', 3, 77)), 'voltage rolls are the same for the same seed');
    {
      // THE FORM ROLL (recipe expression 4, 7 Oct 2026): now and then another form, mostly Club for a style
      // that is not Club already; a Club style changes half as often and never to Club; nothing before 4.
      const formOf = (style, v, version) => seeds.map((s) => voltageRollsFor(style, defaultMoodFor(style), v, s, null, version).form?.template ?? null);
      const share = (list, t) => list.filter((x) => x === t).length / list.length;
      const changed = (list, own) => list.filter((x) => x && x !== own).length / list.length;
      const pop = formOf('reggaeton', 3, 4);
      assert(Math.abs(changed(pop, 'pop') - 1 / 3) < 0.07 && Math.abs(share(pop, 'club') - 1 / 4) < 0.06,
        `Overload turns a Pop Song style into another form about one take in three, mostly Club (${changed(pop, 'pop').toFixed(2)}, club ${share(pop, 'club').toFixed(2)})`);
      const club = formOf('big-room', 3, 4);
      assert(Math.abs(changed(club, 'club') - 1 / 6) < 0.06, `a Club style changes half as often (${changed(club, 'club').toFixed(2)})`);
      assert(changed(formOf('reggaeton', 0, 4), 'pop') === 0 && changed(formOf('reggaeton', 3, 3), 'pop') === 0,
        'never at Safe, and never in a recipe made before version 4');
    }
    {
      // OFF THE POP SONG (recipe expression 5, 9 Oct 2026, Peter: fewer Pop Songs): five styles start on the
      // Club form and two on the Groove; a recipe kept before then is made in the Pop Song it was.
      const shape = (style, expression) => makeBanger({ ...recipe(style), expression }).form.map((f) => f.type).join(' ');
      const pop = 'intro verse preChorus chorus verse preChorus chorus middle8 chorus outro';
      const moved = Object.keys(FORMS_BEFORE_5);
      assert(moved.length === 7 && moved.every((s) => shape(s, 4) === pop && shape(s, 0) === pop),
        'a recipe kept before version 5 plays the Pop Song its style started on then');
      assert(['eurodance', 'merenhouse', 'freestyle', 'uk-garage'].every((s) => !shape(s, 5).includes('verse') && shape(s, 5).includes('drop'))
        && ['nu-disco', 'electro-funk'].every((s) => shape(s, 5).split(' ').every((t) => t === 'groove'))
        && shape('synthwave', 5) === pop,
        'a new recipe starts them on the Club form or the Groove; Synthwave is still a Pop Song');
    }
    const bass = [0, 1, 2, 3].map((v) => rate('big-room', 'anthemic', v, (r) => r.parts.bass));
    // (the gate is counted over the takes that keep their supersaws — piano stabs are never gated)
    // (a gate draw may come up as Supersaw Stabs instead, which counts)
    const sawTakes = (v) => seeds.map((s) => voltageRollsFor('big-room', 'anthemic', v, s)).filter((r) => !['piano', 'pad'].includes(r.parts.chords));
    const gate = [0, 1, 2, 3].map((v) => sawTakes(v).filter((r) => r.fx?.gate || r.parts.chords === 'stabs').length / sawTakes(v).length);
    assert(bass.every((x, v) => Math.abs(x - VOLTAGE_ROLL_ODDS.bass[v]) < 0.08) && gate.every((x, v) => Math.abs(x - VOLTAGE_ROLL_ODDS.gate[v]) < 0.08),
      `the bass and chord gate move more often the higher the voltage (bass ${bass.join(' ')}, gate ${gate.join(' ')})`);
    assert(rate('eurobeat', 'anthemic', 3, (r) => r.parts.bass) === 0 && rate('big-room', 'funky', 3, (r) => r.parts.bass) === 0,
      'never a rolled bass where the style\'s bass is its signature (Eurobeat) or the mood chose one (Funky)');
    assert(rate('electro', 'dark', 3, (r) => r.fx && !r.fx.pump) === 0 && rate('trance', 'uplifting', 3, (r) => r.fx?.gate === 'sixteenths') === 0,
      'the gate rolls only where the style pumps its chords, and never onto the style\'s own rate');
    const { styleDefaults: defaultsOf } = await import('../tools/lib/banger/options.js');
    const styleDefaults = (st) => defaultsOf(BANGER_STYLES.find((x) => x.id === st.id));
    const highOnly = ['keyLift', 'halfTime', 'falseEnding', 'keyApproach', 'breakdownHook'];
    const makeUp = (r) => (r.parts.chords && r.parts.chords !== 'stabs') || r.fx?.pump || r.drums || highOnly.some((k) => r.form?.[k] != null) || r.spot?.intro;
    assert([0, 1, 2].every((v) => MAKER_STYLES.every((st) => rate(st.id, defaultMoodFor(st.id), v, makeUp) === 0)),
      'below Overload the chords (but for stabs in place of a gate), the kit, the key, the drops and the ending are the style\'s own');
    assert([0, 1].every((v) => MAKER_STYLES.every((st) => rate(st.id, defaultMoodFor(st.id), v, (r) => r.spot || r.form) === 0))
      && rate('big-room', 'anthemic', 2, (r) => r.spot) > 0 && rate('big-room', 'anthemic', 2, (r) => r.form?.layers || r.form?.grooveIntro) > 0,
      'Spot FX and the intro\'s build-up start rolling at Surge');
    assert(rate('big-room', 'anthemic', 2, (r) => r.parts.chords === 'stabs') > 0 && rate('big-room', 'anthemic', 2, (r) => r.fx?.gateChoir) > 0
      && rate('big-room', 'anthemic', 1, (r) => r.fx?.gateChoir) === 0 && rate('shibuya', 'lounge', 2, (r) => r.fx?.gateChoir) === 0,
      'Surge can stab the supersaws and gate the choir — the choir only where there is a gate');
    const hv = MAKER_STYLES.map((st) => ({ st, rolls: seeds.map((s) => voltageRollsFor(st.id, defaultMoodFor(st.id), 3, s)) }));
    assert(hv.every(({ st, rolls }) => (styleDefaults(st).parts.chords === 'pad' ? rolls.every((r) => !r.parts.chords) : rolls.some((r) => r.parts.chords)) && rolls.some((r) => r.drums?.kit) && rolls.some((r) => r.form?.keyLift === 'third')
      && rolls.every((r) => !r.form?.halfTime || styleDefaults(st).form.template === 'club')),
      'at Overload every style can play its chords another way (but Drum & Bass, whose chords are its pad), change kit and lift a third; half time only in the Club form');
    assert(hv.every(({ st, rolls }) => rolls.every((r) => !r.fx?.pump || (!styleDefaults(st).fx.pump && ['saws', 'pad'].includes(r.parts.chords || styleDefaults(st).parts.chords))))
      && hv.filter(({ rolls }) => rolls.some((r) => r.fx?.pump)).length === MAKER_STYLES.filter((st) => !styleDefaults(st).fx.pump).length,
      'a chop goes only on the styles that do not pump, and only on supersaws or a pad');
    // no roll costs the phone a part: a Overload take has no channel its style's Charged takes lack
    let extra = [];
    for (const st of MAKER_STYLES) {
      const juiced = new Set(seeds.slice(0, 12).flatMap((seed) => Object.keys(makeBanger(recipe(st.id, seed, { voltage: 1, expression: 1 })).mix.lanes)));
      for (const seed of seeds.slice(0, 12)) {
        const hv = makeBanger(recipe(st.id, seed, { voltage: 3, expression: 2, wild: true }));
        extra.push(...Object.keys(hv.mix.lanes).filter((k) => !juiced.has(k)).map((k) => `${st.id}: ${hv.mix.labels[k]}`));
      }
    }
    assert(!extra.length, `every Lab style makes Overload takes, with no channel more than its Charged ones (${[...new Set(extra)].join('; ') || 'none'})`);
    assert(hv.every(({ st, rolls }) => rolls.every((r) => !r.form || r.form.template === (FORMS_BEFORE_5[st.id] || styleDefaults(st).form.template))),
      'a rolled form keeps the style\'s own template — before version 5 (these rolls are 3), the one it had then (a form naming none is read as Club)');
    assert(hv.every(({ rolls }) => rolls.some((r) => r.spot?.intoDrop) && rolls.every((r) => !r.spot?.ending && r.spot?.intoDrop !== 'tapeStop')),
      'Overload rolls Spot FX — never an ending, the jukebox loops the song');
    const lead = rate('big-room', 'anthemic', 1, (r) => r.parts.riffSound === 'random');
    assert(lead > 0.8 && lead < 1, `the riff\'s sound is drawn most takes, with the style\'s own still in the draw (${lead})`);
    const r = recipe('big-room', 3, { voltage: 3 });
    const v1 = makeBanger({ ...r, expression: 1 });
    assert(same(makeBanger({ ...r, expression: 2 }).mix, makeBanger({ ...r, expression: 2 }).mix) && !same(makeBanger({ ...r, expression: 2 }).mix.voice, v1.mix.voice),
      'a recipe at 2 is made the same every time, and differently from one kept at 1');
  }

  // which Lab styles hold a sound that takes a slide, in the real catalogue
  const hooks = Object.fromEntries(MAKER_STYLES.map((s) => [s.id, hookSoundFor(s.id, defaultMoodFor(s.id))]));
  const slides = MAKER_STYLES.map((s) => s.id).filter((id) => autoPortamentoSupport(VOICES[hooks[id]]).supported);
  assert(hooks.eurobeat === 'syncRazorLead' && hooks.shibuya === 'mrdrConcertFlute' && hooks.electro === 'bestRobotVox' && hooks.megadrive === 'layerMegamixLead'
    && ['eurobeat', 'shibuya', 'electro', 'megadrive'].every((id) => slides.includes(id)), 'Eurobeat, Shibuya-Kei, Electro and 16-Bit hooks are sustained MRDR-3 leads that take a slide');
  assert(hooks['big-room'] === GRAND && hooks.trance === GRAND && hooks['future-bass'] === 'mrdrPopGrand' && hooks.dnb === WIRE_HARP
    && ['big-room', 'trance', 'future-bass', 'dnb'].every((id) => !slides.includes(id)), 'Big-Room, Trance, Future Bass and Drum & Bass hooks are pianos and a TNGR-2 harp: not');

  // a recipe with no expression is made EXACTLY as it was: Go Wild is the Wild variation, nothing more
  let legacyOk = true; let newOk = true; let wildOnly = true;
  for (const st of MAKER_STYLES) {
    for (const seed of [3, 99]) {
      for (const wild of [false, true]) {
        const r = recipe(st.id, seed);
        const as = makeBanger({ ...r, wild });
        // (in the form its style started on then: FORMS_BEFORE_5)
        const expected = trimmed(direct(r, { ...(FORMS_BEFORE_5[st.id] ? { form: { template: FORMS_BEFORE_5[st.id] } } : {}), ...(wild ? { variation: 'wild' } : {}) }));
        if (!(same(as.bank, expected.bank) && same(as.mix, expected.mix) && same(as.arrangement, expected.arrangement))) legacyOk = false;
        for (const expression of [0, undefined, null, 'x', -1, Number.NaN]) {
          if (!same(makeBanger({ ...r, wild, expression }).mix, as.mix)) legacyOk = false;
        }
        // opting in: the same music, with the setting where the generator puts it — and only when Go Wild is on
        const opted = makeBanger({ ...r, wild, expression: 1 });
        const wantsIt = wild && slides.includes(st.id);
        if (!same(opted.bank, as.bank) || !same(opted.arrangement, as.arrangement)) newOk = false;
        if (!same(withoutPortamento(opted.mix), as.mix)) newOk = false;
        if (!!hookOf(opted).noteFx?.portamento !== wantsIt || portamentoLanes(opted.mix).length > (wantsIt ? 1 : 0)) newOk = false;
        if (!wild && !same(opted.mix, as.mix)) wildOnly = false;
      }
    }
  }
  assert(legacyOk, 'a recipe with no expression — or one that is none, or unreadable — is made exactly as before, Go Wild or not: the generator\'s own output, bank, mix and arrangement');
  assert(newOk, 'a recipe that opts in with Go Wild gets the same music with the slide setting on the hook — in the styles whose hook takes one');
  assert(wildOnly, 'and opting in without Go Wild changes nothing at all');
  const eurobeat = makeBanger({ ...recipe('eurobeat'), wild: true, expression: 1 });
  const p = hookOf(eurobeat).noteFx.portamento;
  assert(p.enabled && p.version === 1 && same(p, direct(recipe('eurobeat'), { variation: 'wild', expression: ON }).mix.lanes.lead.noteFx.portamento),
    'Eurobeat with Go Wild shows it on a real Lab preset: the hook gets the setting the generator chose');
  const grand = makeBanger({ ...recipe('big-room'), wild: true, expression: 1 });
  assert(!portamentoLanes(grand.mix).length && same(grand.mix, makeBanger({ ...recipe('big-room'), wild: true }).mix),
    'Big-Room House, whose hook is a grand piano, gets none');
  // an ADVANCED grid: sixteenths on every semitone, each note a sixteenth long
  const advanced = new Array(32).fill(-1);
  [[0, 0], [2, 2], [4, 3], [6, 5], [8, 7], [10, 5], [12, 3], [14, 2], [16, 0], [18, 3], [20, 7], [22, 12], [24, 10], [28, 7], [30, 5]].forEach(([i, row]) => { advanced[i] = row; });
  const adv = makeBanger({ notes: advanced, mode: 'advanced', style: 'megadrive', mood: defaultMoodFor('megadrive'), seed: 8, wild: true, expression: 1 });
  const advOff = makeBanger({ notes: advanced, mode: 'advanced', style: 'megadrive', mood: defaultMoodFor('megadrive'), seed: 8, wild: true });
  assert(same(adv.bank, advOff.bank) && same(withoutPortamento(adv.mix), advOff.mix) && portamentoLanes(adv.mix).length <= 1,
    'an ADVANCED grid (sixteenths, one-step notes) makes the same song, with the setting on at most the hook');

  // the recipe: kept, revised, keyed and reopened
  const fake = () => ({ data: { settings: {}, slots: [], bangers: { startersGiven: ['neon-orbit'] } }, writes: 0, persist() { this.writes++; } });
  {
    const s = fake();
    const legacy = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 1, bpm: 150, wild: true }, s);
    assert(!('expression' in legacy) && legacy.wild === true, 'kept without an expression version, a recipe has none — the shape of every recipe before it');
    const opted = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 2, bpm: 150, wild: true, expression: 1 }, s);
    assert(opted !== legacy && opted.expression === 1 && bangerState(s).kept.length === 2 && !('expression' in legacy),
      'the same riff, style, mood and Go Wild with an expression version is not the legacy song\'s new take: it is a song of its own, and the legacy one is untouched');
    const again = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 9, bpm: 151, wild: true, expression: 1 }, s);
    assert(again === opted && again.seed === 9 && again.expression === 1 && bangerState(s).kept.length === 2,
      'and the same again, with the same version, is a new take of it: same song, new seed, still opted in');
    const back = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 5, bpm: 150, wild: true }, s);
    assert(back !== again && !('expression' in back) && bangerState(s).kept.length === 3, 'a keep that says none is not the opted-in song either');
    const once = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 6, bpm: 150, wild: true }, s);
    assert(once === back && !('expression' in once) && bangerState(s).kept.length === 3, 'two legacy keeps in a row are still one song');
  }
  {
    // the recipe survives the save as JSON and is made the same when it is opened again
    const s = fake();
    const opted = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 2, bpm: 150, wild: true, expression: 1 }, s);
    const saved = JSON.parse(JSON.stringify(opted));
    const song = songFor(opted);
    const reopened = makeBanger(saved);
    assert(saved.expression === 1 && same(song.mix, reopened.mix) && same(song.bank, reopened.bank) && same(song.arrangement, reopened.arrangement)
      && hookOf(song).noteFx?.portamento, 'reopened from the saved recipe, a kept song has the same slide settings it had');
    assert(songFor(opted) === song, 'and is made once for the session');
    // the cache tells a recipe with the version from one without
    const twin = { ...opted }; delete twin.expression;
    assert(songFor(twin) !== song && !hookOf(songFor(twin)).noteFx?.portamento && same(songFor(twin).mix, makeBanger(twin).mix),
      'the same recipe without the version is cached and made as its own song, with no slide');
    assert(!hookOf(songFor({ ...opted, expression: 0 })).noteFx?.portamento && songFor({ ...opted, expression: 0 }) !== song, 'and an expression of 0 is none');
    // a new take of the same song drops the old one from the cache and writes the version the new song was made with
    const take = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 77, bpm: 150, wild: true, expression: 1 }, s);
    assert(take === opted && take.seed === 77 && songFor(take) !== song && same(songFor(take).mix, makeBanger({ ...saved, seed: 77 }).mix),
      'a new take is the song its record now describes, not the cached one');
    // a legacy record that is kept again as a legacy recipe stays one, and is made as it was
    const old = fake();
    const first = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 1, bpm: 150, wild: true }, old);
    const next = keepBanger({ notes, mode: 'simple', style: 'eurobeat', mood: 'dark', seed: 9, bpm: 150, wild: true }, old);
    assert(next === first && !('expression' in first) && bangerState(old).kept.length === 1 && !hookOf(songFor(first)).noteFx?.portamento
      && same(songFor(first).mix, makeBanger({ ...first }).mix), 'a legacy recipe kept again as a legacy one is still one song, with no slide');
  }
  {
    // revising: the pencil. A legacy recipe opts in, a fresh seed makes new music anyway
    const s = fake();
    const rec = keepBanger({ notes, mode: 'simple', style: 'shibuya', mood: 'dreamy', seed: 4, bpm: 130, wild: true }, s);
    const before = songFor(rec);
    reviseBanger(rec, { notes, style: 'shibuya', mood: 'dreamy', seed: 5, bpm: 130, wild: true }, s);
    // From 2 the take draws its own lead, so the slide is there exactly when the drawn sound takes one.
    const revisedSong = songFor(rec);
    assert(rec.expression === RECIPE_EXPRESSION && !!hookOf(revisedSong).noteFx?.portamento === autoPortamentoSupport(VOICES[revisedSong.mix.voice.leadVoice]).supported
      && revisedSong !== before, 'a revised recipe opts into the current expression version');
    reviseBanger(rec, { notes, style: 'shibuya', mood: 'dreamy', seed: 6, bpm: 130, wild: true, expression: 0 }, s);
    assert(!('expression' in rec) && !hookOf(songFor(rec)).noteFx?.portamento, 'unless it is told not to, which leaves the recipe as a legacy one');
    reviseBanger(rec, { notes, style: 'shibuya', mood: 'dreamy', seed: 7, bpm: 130, wild: false }, s);
    assert(rec.expression === RECIPE_EXPRESSION && !portamentoLanes(songFor(rec).mix).length, 'Go Wild off is no slide, whatever the recipe says');
  }
  {
    // the starter is untouched: it plays the file as saved, and has no expression of its own
    const s = fake(); s.data.bangers.startersGiven = [];
    const b = bangerState(s);
    const st = b.kept.find((r) => r.preset === 'neon-orbit');
    assert(st && !('expression' in st) && !('wild' in st) && songFor(st).bank, 'the starter song\'s record carries no expression version and still plays its saved file');
  }
}

if (failures) { console.error(`\nbanger expression: FAILED (${failures})`); process.exit(1); }
console.log(`\nbanger expression: PASSED (${quiet} quiet checks)`);
