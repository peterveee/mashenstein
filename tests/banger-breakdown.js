// BREAKDOWN HOOK: VARIED (generator v11, 9 Oct 2026) — the breakdown's hook no longer always at half
// speed. Checked as promises: every way in the table can be asked for, in the dialog and the Form
// row, and plays what it says (Tease the hook's opening every other bar with an echo, Held Back only
// the last two bars, Outline long notes on the strong beats, Piano the hook as written on a piano,
// New Tune a line of its own, Arp running sixteenths, Call and Answer the bell between the hook's
// bars, Muffled a low-pass opening); Varied draws exactly its ways, each about as often (all nine
// since Peter heard them, 9 Oct 2026), never a way that adds a part under a Sound Set; the draw
// moves nothing outside the breakdown; and nothing made before it moves — a request that names its
// form but no Breakdown Hook is Half Speed, as is a kept Lab recipe.
import { installDom } from './dom-stub.js';
installDom();
const { generateBanger, normaliseBangerOptions, BANGER_REROLLS, BANGER_GROUPS } = await import('../tools/lib/banger/index.js');
const { BREAKDOWN_WAYS, VARIED_WAYS } = await import('../tools/lib/banger/breakdown-ways.js');
const { outlineOf, arpOfHook, BREAKDOWN_LINES } = await import('../tools/lib/banger/sections.js');
const { BREAKDOWN_FX } = await import('../tools/lib/banger/fx.js');
const { SECTION_TYPES } = await import('../tools/lib/banger/form-types.js');
const { expandOrder } = await import('../src/data/arrangements.js');
const { laneFx } = await import('../src/data/automation.js');
const { L } = await import('../tools/lib/banger/theory.js');
const { DEFAULT_SIMPLE } = await import('../src/game/banger/riff.js');
const { makeBanger, RECIPE_EXPRESSION } = await import('../src/game/banger/make.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const riffOf = (bars) => ({
  version: 1, source: { id: 'test', title: 'TEST', from: 0, to: bars.length - 1, bpm: 120 }, bars: bars.length, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70, voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, bars }],
});
const RIFF = riffOf(['A4:2 . C5:2 . E5:2 . A4:2 . G4:4 . . . E4:2 . G4:2 .', 'F4:2 . A4:2 . C5:4 . . . B4:2 . A4:2 . G4:4 . . .']);
const make = (breakdownHook, extra = {}) => generateBanger({ riff: RIFF, seed: 7,
  options: { style: 'big-room', variation: 'faithful', form: { template: 'club', breakdownHook }, ...extra } });
const laneByLabel = (out, re) => Object.entries(out.mix.labels).find(([, l]) => re.test(l))?.[0];
const barPart = (out, lane, bar1) => {
  if (!lane) return [];
  const plan = expandOrder(out.bank.order)[bar1 - 1];
  const sec = out.bank.sections[plan.sec];
  return (sec[lane] || out.bank[lane] || []).slice(plan.half * 16, plan.half * 16 + 16);
};
const onsets = (notes) => notes.map((v, i) => [i, v]).filter(([, v]) => v != null && v !== false && !(Array.isArray(v) && !v.length));
const breakdownOf = (out) => out.form.find((f) => f.role === 'breakdown');
const hookLane = (out) => laneByLabel(out, /HOOK$/);
const hookBars = (out) => { const bd = breakdownOf(out); return Array.from({ length: bd.bars }, (_, i) => onsets(barPart(out, hookLane(out), bd.from + i))); };
const noteOf = (out) => (Array.isArray(out.note) ? out.note.join('\n') : String(out.note));

// ---- the options
{
  assert(normaliseBangerOptions({}).options.form.breakdownHook === 'varied', 'a new request\'s breakdown is Varied');
  assert(normaliseBangerOptions({ form: { template: 'club' } }).options.form.breakdownHook === 'half'
    && normaliseBangerOptions({ form: { template: 'club', keyLift: 'none' } }).options.form.breakdownHook === 'half',
  'a request that names its form but no Breakdown Hook was made before Varied: Half Speed');
  assert(BREAKDOWN_WAYS.every((w) => !normaliseBangerOptions({ form: { breakdownHook: w.id } }).issues.length), 'every way can be asked for by name');
  const listed = BANGER_GROUPS.find((g) => g.id === 'form').fields.find((f) => f.key === 'breakdownHook').options.map(([id]) => id);
  const plays = SECTION_TYPES.breakdown.variants.map(([id]) => id);
  assert(BREAKDOWN_WAYS.every((w) => listed.includes(w.id) && (plays.includes(w.id) || (w.id === 'half' && plays.includes('pedal')))),
    'every way is in the dialog\'s Breakdown Hook list and the Form row\'s Plays list');
  assert(BREAKDOWN_WAYS.every((w) => typeof BREAKDOWN_LINES[w.id] === 'function'), 'every way has its line');
  assert(BANGER_REROLLS.some((r) => r.stream === 'breakdown'), 'Modify This Take can draw the breakdown again on its own');
}

// ---- each way plays what it says
{
  const bd = breakdownOf(make('half'));
  assert(bd && bd.bars >= 8, `the Club form has a breakdown to hear it in (${bd?.bars} bars)`);

  const tease = make('tease');
  const tb = hookBars(tease);
  const lastQuarter = tb.length - Math.max(1, Math.floor(tb.length / 4));
  assert(tb.every((o, i) => (i % 2 === 0 || i >= lastQuarter ? o.length > 0 : o.length === 0)),
    'Tease: the hook every other bar, then every bar for the last quarter');
  assert(tb.every((o) => o.every(([s]) => s <= 8)), 'Tease: only the hook\'s opening — its first half bar, up to the note on beat three');
  const tbd = breakdownOf(tease);
  const echoes = laneFx(tease.arrangement.automation, hookLane(tease)).filter((x) => x.chain.some((e) => e.id === 'delay' && e.params.division === 0.75));
  assert(echoes.length > 0, 'Tease: dotted-eighth echoes on the hook through the breakdown');
  assert(noteOf(tease).includes(`Breakdown — Tease`) || new RegExp(`${tbd.from}[^\\n]*Breakdown[^\\n]*— Tease`).test(noteOf(tease)), 'the take\'s note says the breakdown is a Tease');

  const late = hookBars(make('late'));
  assert(late.every((o, i) => (i >= late.length - 2 ? o.length > 0 : o.length === 0)), 'Held Back: the hook only in the last two bars');

  const outline = hookBars(make('outline'));
  assert(outline.some((o) => o.length) && outline.every((o) => o.length <= 2 && o.every(([s]) => s === 0 || s === 8)),
    'Outline: at most two notes a bar, on the strong beats');

  const piano = make('piano');
  const pl = laneByLabel(piano, /^PIANO/);
  const pbd = breakdownOf(piano);
  assert(pl && onsets(barPart(piano, pl, pbd.from)).length > 0 && hookBars(piano).every((o) => !o.length),
    'Piano: the hook on a piano in a style that has none of its own, its own sound resting');

  const tune = hookBars(make('tune'));
  const written = hookBars(make('written'));
  assert(tune.every((o) => o.length > 0) && JSON.stringify(tune) !== JSON.stringify(written), 'New Tune: a line every bar, not the hook as written');

  const arp = hookBars(make('arp'));
  assert(arp.every((o) => o.length === 16), 'Arp: running sixteenths, every bar');
  assert(arpOfHook(L('A4:2 . C5:2 . E5:2 . A4:2 . G4:4 . . . E4:2 . G4:2 .')).notes.slice(0, 4).join() === 'E4,G4,A4,C5',
    'Arp: the bar\'s notes, low to high, four at most');

  const answer = make('answer');
  const ab = hookBars(answer);
  const bellLane = answer.banger.laneOf.bell;
  const abd = breakdownOf(answer);
  assert(ab.every((o, i) => (i % 2 === 0 ? o.length > 0 : o.length === 0))
    && Array.from({ length: abd.bars }, (_, i) => onsets(barPart(answer, bellLane, abd.from + i)).length).every((x, i) => (i % 2 ? x > 0 : x === 0)),
  'Call and Answer: the hook on one bar, the bell answering on the next');

  const muffled = make('muffled');
  const sweeps = laneFx(muffled.arrangement.automation, hookLane(muffled)).filter((x) => x.chain.some((e) => e.id === 'filter' && e.params.sweep));
  assert(JSON.stringify(hookBars(muffled)) === JSON.stringify(written) && sweeps.length > 0, 'Muffled: the hook as written, under a low-pass that opens');
  assert(Object.keys(BREAKDOWN_FX).every((id) => BREAKDOWN_WAYS.some((w) => w.id === id)), 'every breakdown effect belongs to a way');

  // The three auditioned and kept (10 Oct 2026): gated, an octave up and echoed, an octave down.
  const gated = make('gated');
  assert(laneFx(gated.arrangement.automation, hookLane(gated)).some((x) => x.chain.some((e) => e.id === 'rhythmgate')), 'Gated Hook: the hook through a gate');
  const up8 = make('octaveEcho'); const wr = make('written');
  const top = (out) => Math.max(...hookBars(out).flat().map(([, v]) => [].concat(v).map((x) => (typeof x === 'number' ? x : 0))).flat());
  const firstNote = (out) => barPart(out, hookLane(out), breakdownOf(out).from).find((v) => v != null);
  assert(firstNote(up8) && Math.round(12 * Math.log2(firstNote(up8) / firstNote(wr))) === 12, 'Octave Echo: the hook an octave up');
  const lo = make('low');
  assert(firstNote(lo) && Math.round(12 * Math.log2(firstNote(lo) / firstNote(wr))) === -12, 'Low and Muffled: the hook an octave down');
  const era1 = new Set();
  for (let seed = 1; seed <= 80; seed++) {
    const m = noteOf(generateBanger({ riff: RIFF, seed, options: { style: 'big-room', waysEra: 1, form: { template: 'club', breakdownHook: 'varied' } } })).match(/Breakdown[^\n]*— ([A-Za-z ]+)$/m);
    if (m) era1.add(m[1]);
  }
  assert(!['Gated Hook', 'Octave Echo', 'Low and Muffled'].some((l) => era1.has(l)), 'a request of the first Ways Era (a Lab song kept before them) never draws the three');
  assert(['gated', 'octaveEcho', 'low'].every((id) => VARIED_WAYS.includes(id)) && !BREAKDOWN_WAYS.some((w) => w.id === 'choir'),
    'the three are in Varied; the Choir Hook is gone (the choir\'s attack too slow for a tune)');

  const half = hookBars(make('half'));
  assert(half[0].length > 0 && half[0].length < onsets(barPart(make('written'), hookLane(make('written')), bd.from)).length,
    'Half Speed is still the hook at half speed: fewer notes a bar than As Written');
}

// ---- outlineOf
{
  const o = outlineOf(L('A4:2 . C5:2 . E5:2 . A4:2 . G4:4 . . . E4:2 . G4:2 .'));
  assert(o.notes[0] === 'A4' && o.notes[8] === 'G4' && o.lens[0] === 8 && o.lens[8] === 8, 'an outline takes the note on each strong beat, held to the next');
  const held = outlineOf(L('A4:16 . . . . . . . . . . . . . . .'));
  assert(held.notes[0] === 'A4' && held.notes[8] == null && held.lens[0] === 16, 'a note held over both beats is one long note');
  const late = outlineOf(L('. . A4:2 . . . . . . . . . . . . .'));
  assert(late.notes[0] === 'A4' && late.notes[8] == null, 'a half with nothing on its beat takes its first note; an empty half rests');
}

// ---- Varied
{
  const tally = Object.fromEntries(VARIED_WAYS.map((w) => [w, 0]));
  const labelOf = Object.fromEntries(BREAKDOWN_WAYS.map((w) => [w.label, w.id]));
  let strays = 0;
  const N = 150;
  let movedOutside = false;
  for (let seed = 1; seed <= N; seed++) {
    const opts = { style: 'big-room', form: { template: 'club', breakdownHook: 'varied' } };
    const out = generateBanger({ riff: RIFF, seed, options: opts });
    const m = noteOf(out).match(/Breakdown[^\n]*— ([A-Za-z ]+)$/m);
    const way = labelOf[m?.[1]];
    if (way in tally) tally[way]++; else strays++;
    // the draw moves nothing outside the breakdown: the same seed at Half Speed differs only inside it.
    // Part by part, by its label (its role and its sound): a breakdown piano takes a lane, so the
    // lanes after it may be numbered differently.
    if (seed <= 12) {
      const half = generateBanger({ riff: RIFF, seed, options: { ...opts, form: { template: 'club', breakdownHook: 'half' } } });
      const bd = breakdownOf(out);
      const byLabel = (o) => new Map(Object.entries(o.mix.labels).map(([lane, label]) => [label, lane]));
      const a = byLabel(out); const h = byLabel(half);
      for (const [label, lane] of h) {
        if (!a.has(label)) { movedOutside = true; continue; }
        for (let b = 1; b <= out.form[out.form.length - 1].to; b++) {
          if (b >= bd.from && b <= bd.to) continue;
          if (JSON.stringify(barPart(out, a.get(label), b)) !== JSON.stringify(barPart(half, lane, b))) movedOutside = true;
        }
      }
    }
  }
  assert(VARIED_WAYS.every((w) => tally[w] > 0) && !strays, `Varied draws every one of its ways and no other (${JSON.stringify(tally)})`);
  const fair = VARIED_WAYS.every((w) => tally[w] / N > 0.4 / VARIED_WAYS.length && tally[w] / N < 1.8 / VARIED_WAYS.length);
  assert(fair, `each of Varied's ${VARIED_WAYS.length} ways about one take in ${VARIED_WAYS.length} (${VARIED_WAYS.map((w) => (tally[w] / N).toFixed(2)).join(' ')})`);
  assert(!movedOutside, 'drawing the breakdown moves no note outside it');
  let adds = 0;
  const adding = BREAKDOWN_WAYS.filter((w) => w.part).map((w) => w.label);
  for (let seed = 1; seed <= 60; seed++) {
    const out = generateBanger({ riff: RIFF, seed, options: { style: 'big-room', parts: { soundSet: 'light' }, form: { template: 'club', breakdownHook: 'varied' } } });
    const m = noteOf(out).match(/Breakdown[^\n]*— ([A-Za-z ]+)$/m);
    if (adding.includes(m?.[1])) adds++;
  }
  assert(adds === 0, 'under a Sound Set (the phone\'s budget) Varied never draws a way that adds a part');
}

// ---- Breakdown Backing: Varied from Ways Era 4, every way drawn, never one the style rules out
{
  const { BACKING_WAYS } = await import('../tools/lib/banger/breakdown-ways.js');
  const seen = new Set(); const old = new Set();
  for (let seed = 1; seed <= 80; seed++) {
    const m = noteOf(generateBanger({ riff: RIFF, seed, options: { style: 'big-room', form: { template: 'club', breakdownHook: 'half', breakdownBacking: 'varied' } } })).match(/Breakdown[^\n]*— Half Speed(?: · (.+))?$/m);
    seen.add(m?.[1] || 'Pad and Choir');
    const o = noteOf(generateBanger({ riff: RIFF, seed, options: { style: 'big-room', waysEra: 3, form: { template: 'club', breakdownHook: 'half', breakdownBacking: 'varied' } } })).match(/Breakdown[^\n]*— Half Speed(?: · (.+))?$/m);
    old.add(o?.[1] || 'Pad and Choir');
  }
  assert(BACKING_WAYS.every((w) => seen.has(w.label)), `Varied draws every backing (${[...seen].join(', ')})`);
  assert([...old].join() === 'Pad and Choir', 'a request of an earlier Ways Era keeps the pad and choir');
  assert(normaliseBangerOptions({ form: { template: 'club' } }).options.form.breakdownBacking === 'classic', 'one naming its form without it, too');
}

// ---- the Lab: kept recipes play Half Speed, new ones Varied
{
  assert(RECIPE_EXPRESSION >= 6, 'a new Lab recipe carries expression 6 or later');
  let keptHalf = true; let newVaried = 0; let made = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const r = { notes: DEFAULT_SIMPLE, style: 'big-room', mood: 'anthemic', seed };
    const kept = makeBanger({ ...r, expression: 5 });
    const direct = makeBanger({ ...r, expression: 5 });
    if (JSON.stringify(kept.bank) !== JSON.stringify(direct.bank)) keptHalf = false;
    const fresh = makeBanger({ ...r, expression: 6 });
    made++;
    if (JSON.stringify(fresh.bank) !== JSON.stringify(kept.bank)) newVaried++;
  }
  assert(keptHalf, 'a kept recipe is made the same every time');
  assert(newVaried > made / 2, `a new recipe's breakdown is drawn: most differ from the kept recipe's Half Speed (${newVaried}/${made})`);
}

console.log(failed ? '\nbanger breakdown: FAILED' : '\nbanger breakdown: PASSED');
process.exit(failed ? 1 : 0);
