// Sidechain Pump auditions (10 Oct 2026): the Lab's pump three ways, on the same take.
//
//   A   as it is: a quarter-note Rhythmic Gate on the chords. Until 10 Oct 2026 its 160 ms swell
//       held at the bottom for a sixteenth and JUMPED most of the way up (0.35 flat for 117 ms at
//       128 BPM, then 0.84 in one sample); the gate is fixed now, so A and A2 render the same, and
//       the files rendered before the fix are the only record of the jump.
//   A2  the same grid pump without the jump: a Sidechain Duck on TRIGGER Every 1/4, so it pumps
//       on the grid whatever the kick does, exactly as A means to.
//   B   a Sidechain Duck keyed to the KICK, the same shape (the gate's DECAY is the duck's ATTACK,
//       its ATTACK the duck's RELEASE, the same DEPTH).
//
// A against A2 is the jump alone; A2 against B is following the kick alone — the same wherever
// the kick is on every beat, apart in breakdowns, builds and broken beats.
//
//   node tools/render-sidechain-auditions.js [style …]
//
// Writes work/auditions/sidechain/<style>-A-gate.wav, -A2-grid-smooth.wav, -B-kick-duck.wav,
// -reel.wav (A, A2, B, two seconds apart) and a manifest naming the bars and how far apart each
// pair is in each bar. Generator untouched: the swap is made on the generated mix and bank, so
// nothing is version-locked yet.
import { mkdirSync, writeFileSync } from 'node:fs';
import { installDom } from '../tests/dom-stub.js';
installDom();
const { generateBanger } = await import('./lib/banger/index.js');
const { riffFromNotes, DEFAULT_SIMPLE } = await import('../src/game/banger/riff.js');
const { hookSoundFor, defaultMoodFor } = await import('../src/game/banger/make.js');
const { openRenderer } = await import('./lib/render-bank-browser.js');
const { wavBuffer, SR } = await import('./lib/wav.js');

// Each style, and the bars to hear (1-based, inclusive) out of its Club form.
const around = (role, before, after) => (form) => {
  const s = form.find((f) => f.role === role);
  const next = form.find((f) => f.from > s.to && f.role.startsWith('drop'));
  return [s.from - before, (next ? next.from : s.to) + after];
};
const SHOWS = {
  // Four on the floor: the same in the drops, apart in the breakdown and the build.
  'big-room': { span: around('breakdown', 2, 3), why: 'four on the floor — the breakdown and build into drop 2' },
  'deep-house': { span: around('breakdown', 2, 3), why: 'the gentle pad pump — the breakdown and build into the last drop' },
  // Broken kicks: the duck follows the kick, the gate follows the grid. Pump switched on for dnb.
  dnb: { span: (form) => { const d = form.find((f) => f.role === 'drop'); return [d.from - 2, d.from + 7]; },
    why: 'a broken kick, Sidechain Pump switched on — the build into the first drop' },
  chipstep: { span: (form) => { const d = form.find((f) => f.role === 'drop'); return [d.from - 2, d.from + 7]; },
    why: 'its own pump on the PWM chords — the build into the first drop' },
};
const styles = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOWS);
const SEED = 11;

/** The same mix, every quarter-note gate a duck on `trigger` (a track, or the grid). */
const ducked = (mix, trigger) => {
  let swapped = 0;
  const swap = (e) => {
    if (e?.id !== 'rhythmgate' || Number(e.params?.division) !== 1) return e;
    swapped++;
    const p = e.params;
    return { ...e, id: 'duck', params: { trigger, depth: p.depth, attack: p.decay, hold: 0, release: p.attack } };
  };
  const lanes = Object.fromEntries(Object.entries(mix.lanes || {})
    .map(([k, l]) => [k, l.effects ? { ...l, effects: l.effects.map(swap) } : l]));
  return { mix: { ...mix, lanes }, swapped };
};

const dir = new URL('../work/auditions/sidechain/', import.meta.url);
mkdirSync(dir, { recursive: true });
const manifest = { note: 'A = the Lab\'s pump today (a quarter-note gate, with its jump), A2 = the same grid pump without the jump, B = a Sidechain Duck keyed to the kick. Per bar, how far apart in dB under the first (null = the same samples). Raw engine output.', renders: [] };
const renderer = await openRenderer();
try {
  for (const style of styles) {
    const show = SHOWS[style] || { span: around('breakdown', 2, 3), why: 'the breakdown and the build after it' };
    const mood = defaultMoodFor(style);
    const riff = riffFromNotes(DEFAULT_SIMPLE, hookSoundFor(style, mood, SEED), 'simple');
    const song = generateBanger({ riff, seed: SEED, options: { style, mood, form: { template: 'club' }, fx: { pump: true } } });
    const kick = song.laneOf?.kick || 'kick';
    const b = ducked(song.mix, kick);
    if (!b.swapped) { console.log(`${style}: no quarter-note pump to swap — skipped`); continue; }
    const last = song.form[song.form.length - 1].to;
    const [from, to] = show.span(song.form).map((x, i) => (i ? Math.min(last, x) : Math.max(1, x)));
    const range = { startStep: (from - 1) * 16, endStep: to * 16 };
    const opts = { arrangement: song.arrangement, trackId: null, range, tail: 1.5 };
    const a = await renderer.render(song.bank, { ...opts, mix: song.mix });
    const a2 = await renderer.render(song.bank, { ...opts, mix: ducked(song.mix, '1/4').mix });
    const d = await renderer.render(song.bank, { ...opts, mix: b.mix });
    // How far apart two renders are, bar by bar: the difference against the first, in dB
    // (null is the same samples).
    const bar = (60 / song.bank.bpm) * 4 * SR;
    const apart = (x, y) => Array.from({ length: to - from + 1 }, (_, n) => {
      let diff = 0, sig = 0;
      for (let i = Math.floor(n * bar); i < Math.min(x.outL.length, Math.floor((n + 1) * bar)); i++) {
        diff += (x.outL[i] - y.outL[i]) ** 2; sig += x.outL[i] ** 2;
      }
      return sig > 0 && diff > 0 ? +(10 * Math.log10(diff / sig)).toFixed(1) : null;
    });
    const roles = Array.from({ length: to - from + 1 }, (_, n) => song.form.find((f) => from + n >= f.from && from + n <= f.to)?.role || '');
    const jump = apart(a, a2);
    const follow = apart(a2, d);
    const gap = new Float32Array(2 * SR);
    const cat = (...xs) => {
      const o = new Float32Array(xs.reduce((t, x) => t + x.length, 0) + gap.length * (xs.length - 1));
      let at = 0;
      for (const x of xs) { o.set(x, at); at += x.length + gap.length; }
      return o;
    };
    writeFileSync(new URL(`${style}-A-gate.wav`, dir), wavBuffer([a.outL, a.outR]));
    writeFileSync(new URL(`${style}-A2-grid-smooth.wav`, dir), wavBuffer([a2.outL, a2.outR]));
    writeFileSync(new URL(`${style}-B-kick-duck.wav`, dir), wavBuffer([d.outL, d.outR]));
    writeFileSync(new URL(`${style}-reel.wav`, dir), wavBuffer([cat(a.outL, a2.outL, d.outL), cat(a.outR, a2.outR, d.outR)]));
    manifest.renders.push({ style, why: show.why, bars: `${from}–${to}`, kick, swapped: b.swapped,
      bars_: roles.map((role, n) => ({ bar: from + n, role, jumpDb: jump[n], followDb: follow[n] })) });
    console.log(`${style}: bars ${from}–${to} (${show.why}), ${b.swapped} gate(s) swapped`);
    const row = (xs) => xs.map((x, n) => `${from + n}${roles[n][0]}:${x ?? '=='}`).join(' ');
    console.log('  A vs A2 (the jump), dB:   ', row(jump));
    console.log('  A2 vs B (the kick), dB:   ', row(follow));
  }
} finally { await renderer.close(); }
writeFileSync(new URL('manifest.json', dir), JSON.stringify(manifest, null, 2) + '\n');
