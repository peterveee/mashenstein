// BUILD TYPE and BEFORE THE DROP (generator v11, 9 Oct 2026) — the build no longer always the snare
// roll straight into the drop. Checked as promises: every way in the tables can be asked for, in the
// dialog and (a build's) in the Form row, and plays what it says; Varied draws every way, never the
// same for both builds of a song, and never a pair that undoes itself (though a pair picked by name
// plays as asked); the draws move no note outside the builds; a bar before the
// drop that falls silent has no run-up effect over it; and nothing made before it moves — a request
// that names its form but neither switch is the snare roll, straight in.
import { installDom } from './dom-stub.js';
installDom();
const { generateBanger, normaliseBangerOptions, BANGER_REROLLS, BANGER_GROUPS } = await import('../tools/lib/banger/index.js');
const { BUILD_WAYS, DROP_IN_WAYS, BUILD_WAY } = await import('../tools/lib/banger/build-ways.js');
const { BREAKDOWN_WAYS } = await import('../tools/lib/banger/breakdown-ways.js');
const { SECTION_TYPES } = await import('../tools/lib/banger/form-types.js');
const { expandOrder } = await import('../src/data/arrangements.js');
const { laneFx, MASTER_KEY } = await import('../src/data/automation.js');

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
const make = (buildWay, dropIn = 'straight', seed = 7) => generateBanger({ riff: RIFF, seed,
  options: { style: 'big-room', variation: 'faithful', form: { template: 'club', buildWay, dropIn } } });
const barPart = (out, role, bar1) => {
  const lane = out.banger.laneOf[role];
  if (!lane) return [];
  const plan = expandOrder(out.bank.order)[bar1 - 1];
  const sec = out.bank.sections[plan.sec];
  return (sec[lane] || out.bank[lane] || []).slice(plan.half * 16, plan.half * 16 + 16);
};
const steps = (notes) => notes.map((v, i) => [i, v]).filter(([, v]) => v != null && v !== false && !(Array.isArray(v) && !v.length)).map(([i]) => i);
const buildOf = (out) => out.form.find((f) => f.role === 'build');
const rolesIn = (out, bar1) => Object.keys(out.banger.laneOf).filter((role) => steps(barPart(out, role, bar1)).length);
const noteOf = (out) => (Array.isArray(out.note) ? out.note.join('\n') : String(out.note));

// ---- the options
{
  const form = normaliseBangerOptions({}).options.form;
  assert(form.buildWay === 'varied' && form.dropIn === 'varied', 'a new request\'s builds are Varied, and so is the bar before each drop');
  const old = normaliseBangerOptions({ form: { template: 'club' } }).options.form;
  assert(old.buildWay === 'roll' && old.dropIn === 'straight', 'a request that names its form but neither switch was made before them: the snare roll, straight in');
  assert([...BUILD_WAYS.map((w) => ({ buildWay: w.id })), ...DROP_IN_WAYS.map((w) => ({ dropIn: w.id }))]
    .every((f) => !normaliseBangerOptions({ form: f }).issues.length), 'every way can be asked for by name');
  const fields = BANGER_GROUPS.find((g) => g.id === 'form').fields;
  const listed = (key) => fields.find((f) => f.key === key).options.map(([id]) => id);
  const plays = SECTION_TYPES.build.variants.map(([id]) => id);
  assert(BUILD_WAYS.every((w) => listed('buildWay').includes(w.id) && plays.includes(w.id)) && DROP_IN_WAYS.every((w) => listed('dropIn').includes(w.id)),
    'every way is in the dialog\'s lists, and every build way in a build\'s Plays list');
  assert(['build', 'dropIn'].every((st) => BANGER_REROLLS.some((r) => r.stream === st)), 'Modify This Take can draw the builds again, and the bars before the drops');
}

// ---- each build way
{
  const roll = make('roll');
  const bd = buildOf(roll);
  assert(bd && bd.bars === 4, `a four-bar build to hear them in (${bd?.bars})`);
  const bars = (out, role) => Array.from({ length: bd.bars }, (_, i) => steps(barPart(out, role, bd.from + i)));

  const kick = make('kick');
  const kk = bars(kick, 'kick');
  assert(bars(kick, 'snare').every((s) => !s.length) && kk[3].length === 16 && kk[2].length === 8,
    `Kick Roll: no snare, the kick in eighths then sixteenths (${kk.map((s) => s.length).join(' ')})`);

  const dotted = bars(make('dotted'), 'snare');
  assert(dotted[0].join() === '0,4,8,12' && dotted[1].join() === '0,3,6,9,12,15' && dotted[3].length === 16,
    `Dotted Roll: quarters, dotted eighths, sixteenths (${dotted.map((s) => s.length).join(' ')})`);

  const loop = make('loop');
  const lastHook = barPart(loop, 'hook', bd.to);
  const firstHook = barPart(loop, 'hook', bd.from);
  assert(steps(lastHook).length > 0 && lastHook.every((v, s) => s < 2 || JSON.stringify(v) === JSON.stringify(lastHook[s - 2]))
    && firstHook.every((v, s) => s < 8 || JSON.stringify(v) === JSON.stringify(firstHook[s - 8])),
  'Hook Loop: the hook\'s opening looped — half a bar at first, half a beat in the last bar');
  assert(bars(loop, 'snare')[2].length >= bars(loop, 'snare')[0].length, 'Hook Loop: over the roll');

  const muffled = make('muffled');
  const sweep = laneFx(muffled.arrangement.automation, MASTER_KEY)
    .filter((x) => x.from === (bd.from - 1) * 16 && x.chain.some((e) => e.id === 'filter' && e.params.sweep));
  assert(bars(muffled, 'kick').every((s) => s.length) && bars(muffled, 'snare').every((s) => !s.length) && sweep.length,
    'Muffled Groove: the groove steady, no roll, the whole mix under a low-pass that opens');

  const drumless = make('drumless');
  assert(['kick', 'clap', 'snare', 'hats'].every((r) => bars(drumless, r).every((s) => !s.length)) && bars(drumless, 'hook').some((s) => s.length),
    'Drumless: no drums, the tune climbing alone');
}

// ---- each way before the drop
{
  const runupOver = (out, bar1) => laneFx(out.arrangement.automation, MASTER_KEY)
    .some((x) => x.from >= (bar1 - 1) * 16 + 8 && x.to <= bar1 * 16 && x.chain.some((e) => ['stutter', 'reverb'].includes(e.id) || e.params?.sweep));
  const at = (way) => { const out = make('roll', way); return { out, last: buildOf(out).to }; };
  const after = (out, bar1, from, skip = []) => rolesIn(out, bar1).filter((r) => r !== 'riser' && !skip.includes(r) && steps(barPart(out, r, bar1)).some((s) => s >= from));

  const straight = at('straight');
  assert(after(straight.out, straight.last, 12).length > 2 && runupOver(straight.out, straight.last), 'Straight In: everything to the bar line, the run-up over it');
  const gap = at('gap');
  assert(!after(gap.out, gap.last, 12).length && !runupOver(gap.out, gap.last), 'The Gap: nothing on the last beat, and no run-up');
  const pause = at('pause');
  assert(!after(pause.out, pause.last, 8).length, 'The Pause: nothing on the last two beats');
  const dropout = at('dropout');
  const gone = ['kick', 'bass', 'sub', 'clap'].filter((r) => steps(barPart(dropout.out, r, dropout.last)).some((s) => s >= 8));
  assert(!gone.length && steps(barPart(dropout.out, 'snare', dropout.last)).some((s) => s >= 8), 'Drop-Out: the kick, bass and clap out for the last two beats, the roll carrying on');
  const pickup = at('pickup');
  const ph = steps(barPart(pickup.out, 'hook', pickup.last));
  assert(!after(pickup.out, pickup.last, 12, ['hook']).length && ph.includes(14) && ph.includes(15), 'Hook Pickup: only the hook on the last beat, walking up into the drop');
  const solo = at('solo');
  assert(rolesIn(solo.out, solo.last).every((r) => r === 'hook' || r === 'riser') && !runupOver(solo.out, solo.last), 'Hook Alone: the last bar is the hook on its own');
}

// ---- Varied
{
  const builds = Object.fromEntries(BUILD_WAYS.map((w) => [w.label, 0]));
  const ins = Object.fromEntries(DROP_IN_WAYS.map((w) => [w.label, 0]));
  let same = 0; let songs = 0; let moved = false;
  for (let seed = 1; seed <= 80; seed++) {
    const out = generateBanger({ riff: RIFF, seed, options: { style: 'big-room', form: { template: 'club', breakdownHook: 'half', buildWay: 'varied', dropIn: 'varied' } } });
    const lines = noteOf(out).split('\n').filter((l) => /Build[^—]*— /.test(l)).map((l) => l.split('— ')[1].split(' · '));
    for (const [b, d] of lines) { builds[b]++; ins[d]++; }
    if (lines.length === 2) { songs++; if (lines[0][0] === lines[1][0] || lines[0][1] === lines[1][1]) same++; }
    if (seed <= 10) {
      const plain = generateBanger({ riff: RIFF, seed, options: { style: 'big-room', form: { template: 'club', breakdownHook: 'half', buildWay: 'roll', dropIn: 'straight' } } });
      const inBuild = (b) => out.form.some((f) => /^build/.test(f.role) && b >= f.from && b <= f.to);
      for (const role of Object.keys(plain.banger.laneOf)) {
        for (let b = 1; b <= out.form[out.form.length - 1].to; b++) {
          if (!inBuild(b) && JSON.stringify(barPart(out, role, b)) !== JSON.stringify(barPart(plain, role, b))) moved = true;
        }
      }
    }
  }
  assert(Object.values(builds).every((n) => n > 0) && Object.values(ins).every((n) => n > 0),
    `Varied draws every build way and every way into the drop (${JSON.stringify(builds)} ${JSON.stringify(ins)})`);
  assert(songs > 0 && same === 0, `the two builds of a song never climb the same way, nor go in the same way (${songs} songs)`);
  assert(!moved, 'the draws move no note outside the builds');
}

// ---- the pairs Varied never draws
{
  const idOf = Object.fromEntries([...BUILD_WAYS, ...DROP_IN_WAYS, ...BREAKDOWN_WAYS].map((w) => [w.label, w.id]));
  const bad = []; let pairs = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const out = generateBanger({ riff: RIFF, seed, options: { style: 'big-room', form: { template: 'club', breakdownHook: 'varied', buildWay: 'varied', dropIn: 'varied' } } });
    let prev = null;
    for (const line of noteOf(out).split('\n')) {
      const m = line.match(/\d+\s+(Breakdown|Build[^—]*) — (.+)$/);
      if (!m) { if (/\d+–\d+/.test(line)) prev = null; continue; }
      if (m[1] === 'Breakdown') { prev = idOf[m[2]]; continue; }
      const [b, d] = m[2].split(' · ').map((l) => idOf[l]);
      const w = BUILD_WAY[b];
      pairs++;
      if ((w.notInto || []).includes(d)) bad.push(`${b} into ${d}`);
      if (prev && (w.notAfter === true || (w.notAfter || []).includes(prev))) bad.push(`${b} after a ${prev} breakdown`);
      prev = null;
    }
  }
  assert(pairs > 200 && !bad.length, `Varied never draws a pair that undoes itself (${pairs} builds${bad.length ? `: ${bad.slice(0, 4).join(', ')}` : ''})`);
  const asked = make('kick', 'dropout');
  const last = buildOf(asked).to;
  assert(!steps(barPart(asked, 'kick', last)).some((x) => x >= 8), 'a pair picked by name plays as asked (Kick Roll into Drop-Out)');
}

console.log(failed ? '\nbanger builds: FAILED' : '\nbanger builds: PASSED');
process.exit(failed ? 1 : 0);
