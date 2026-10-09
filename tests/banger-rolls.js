// BANGER ROLLS — every rolling style builds into its drop its own way (6 Oct 2026).
//
// Ten styles used to share Big Room's snare roll note for note, on the same swell, and every
// build ended on the same stutter. Held here: each style that rolls by default has a roll of
// its own; every roll fills in bar by bar and leaves the last bar's hole empty; the swell is
// the style's own depth and curve; a style with a sweep opens a filter on the snare across
// every build; and the run-up into each drop varies build to build.
import { generateBanger } from '../tools/lib/banger/index.js';
import { BANGER_STYLES } from '../tools/lib/banger/styles/index.js';
import { styleDefaults } from '../tools/lib/banger/options.js';
import { ROLL_SWELL } from '../tools/lib/banger/fx.js';
import { laneFx, laneCurve } from '../src/data/automation.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const riff = { version: 1, source: { id: 't', title: 'T', from: 0, to: 1, bpm: 128 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch: 74,
    bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .', 'D5:4 . . . A4:2 . . . F5:2 . . . E5:2 . . .'] }] };

const hits = (s) => [...s].filter((c) => c === 'x').length;
const rolling = BANGER_STYLES.filter((st) => styleDefaults(st).drums.rolls);
assert(rolling.length >= 10, `the rolling styles are found (${rolling.map((st) => st.id).join(', ')})`);

const keys = rolling.map((st) => JSON.stringify(st.drums.rolls));
const twins = rolling.filter((st, i) => keys.indexOf(keys[i]) !== i).map((st) => st.id);
assert(twins.length === 0, `every rolling style has a roll of its own${twins.length ? ` — shared by ${twins.join(', ')}` : ''}`);

assert(rolling.every((st) => st.drums.rolls.length === 5 && st.drums.rolls.every((s) => /^[x.]{16}$/.test(s))),
  'every roll is five bars of sixteen steps');
const slow = rolling.filter((st) => !st.drums.rolls.slice(0, 4).every((s, i, a) => i === 0 || hits(s) >= hits(a[i - 1])));
assert(slow.length === 0, `every roll fills in bar by bar to the bar before the last${slow.length ? ` — not ${slow.map((st) => st.id).join(', ')}` : ''}`);
const loud = rolling.filter((st) => st.drums.rolls[4].slice(12) !== '....');
assert(loud.length === 0, `every roll leaves the last bar's hole empty${loud.length ? ` — not ${loud.map((st) => st.id).join(', ')}` : ''}`);

const swells = new Set(rolling.map((st) => JSON.stringify(st.drums.rollSwell || ROLL_SWELL)));
assert(swells.size >= 5, `the swells differ by style (${swells.size} kinds)`);

// What the generator writes: the style's swell on the snare across its builds (a Pop Song's
// are its pre-choruses), and its sweep.
for (const id of ['trance', 'chipstep', 'synthwave', 'big-room']) {
  const st = rolling.find((s) => s.id === id);
  const out = generateBanger({ riff, options: { style: id, length: 'long' }, seed: 4 });
  const snare = out.laneOf.snare;
  const auto = out.arrangement.automation;
  const swell = st.drums.rollSwell || ROLL_SWELL;
  const pts = laneCurve(auto?.[snare])?.points || [];
  assert(pts.some((p) => Math.abs(p.db - swell.from) < 0.01 && (swell.shape === 'even' || pts.some((q) => q.shape === swell.shape))),
    `${id}: its roll swells from ${swell.from} dB (${swell.shape})`);
  const sweeps = laneFx(auto, snare).filter((x) => x.chain.some((e) => e.id === 'filter' && e.params.sweep));
  assert(st.drums.rollSweep ? sweeps.length > 0 : sweeps.length === 0,
    `${id}: ${st.drums.rollSweep ? 'a filter opens on the snare across its builds' : 'no filter on its snare'}`);
}

// Stutter Before Drop's run-ups: every build into a drop gets one, drawn from the classic
// stutter and its variations, never the same one twice running; the Machine-Gun Sweep only
// in a style that has it.
{
  const { MASTER_KEY } = await import('../src/data/automation.js');
  const kind = (chains) => {
    const ids = chains.flat().map((e) => e.id);
    const c = chains.flat();
    if (c.some((e) => e.params?.stop)) return 'tapeStop';
    if (ids.includes('reverb')) return 'wash';
    if (c.some((e) => e.id === 'filter' && e.params.sweepTo === 200)) return 'machineGun';
    if (c.some((e) => e.id === 'filter' && e.params.sweep)) return 'sweep';
    if (c.some((e) => e.id === 'stutter' && e.params.slice === 0.5)) return ids.includes('filter') ? 'ramp' : 'repeat';
    if (ids.includes('stutter')) return 'stutter';
    return null;
  };
  const seen = new Map(); let builds = 0; let bare = 0; let twice = 0; const gunIn = new Set();
  for (const id of ['big-room', 'trance', 'dnb', 'chipstep', 'future-bass', 'moombahton']) for (let seed = 1; seed <= 8; seed++) {
    // Straight In: a way before the drop that silences the bar silences its run-up (build-ways.js).
    const form = { ...styleDefaults(BANGER_STYLES.find((s) => s.id === id)).form, dropIn: 'straight' };
    const out = generateBanger({ riff, options: { style: id, length: 'long', form }, seed });
    const fx = laneFx(out.arrangement.automation, MASTER_KEY);
    // The Club form's builds (a Pop Song's pre-choruses take its transitions' run-ups).
    const into = out.form.filter((f, i) => /^build/.test(f.role) && /drop/.test(out.form[i + 1]?.role || ''));
    let last = null;
    for (const b of into) {
      const k = kind(fx.filter((x) => x.to === b.to * 16 || (x.from >= (b.to - 1) * 16 && x.to <= b.to * 16)).map((x) => x.chain));
      builds++;
      if (!k) { bare++; continue; }
      seen.set(k, (seen.get(k) || 0) + 1);
      if (k === last) twice++;
      if (k === 'machineGun') gunIn.add(id);
      last = k;
    }
  }
  assert(bare === 0, `every build into a drop has a run-up (${builds - bare} of ${builds})`);
  const mix = [...seen].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
  assert(seen.size >= 6 && [...seen.values()].every((n) => n < builds * 0.5), `the run-ups vary, none on every build (${mix})`);
  assert(twice === 0, 'no build repeats the run-up of the build before it');
  assert([...gunIn].every((id) => rolling.find((st) => st.id === id).machineGunSweep), `the Machine-Gun Sweep only where the style has it (${[...gunIn].join(', ')})`);
}

if (failed) process.exit(1);
