// INTRO TYPE, TUNE FIRST and RISER TYPE (generator v11, 9 Oct 2026) — Peter: a casual audience, not
// DJs, so no intro of bars of kick and bass before anything to hum; and variety for the riser.
// Checked as promises: every intro way has the riff or the chords from its first two bars and plays
// what it says; under Tune First, Build in Layers opens on the riff two bars a part and a Groove plays
// its riff from the first bar (the rest arriving as its layers say); every riser way is a voice of the
// song's own, struck its own length before the drop; Varied draws every intro and riser; and nothing
// made before moves — a request that names its form (or effects) without them is the riff intro, the
// slow layers, the noise riser.
import { installDom } from './dom-stub.js';
installDom();
const { generateBanger, normaliseBangerOptions, BANGER_REROLLS, BANGER_GROUPS } = await import('../tools/lib/banger/index.js');
const { INTRO_WAYS } = await import('../tools/lib/banger/intro-ways.js');
const { RISER_WAYS, DROP_HIT_WAYS, RISER_FX_WAYS } = await import('../tools/lib/banger/build-ways.js');
const { RISER_FX } = await import('../tools/lib/banger/fx.js');
const { laneFx } = await import('../src/data/automation.js');
const { SECTION_TYPES } = await import('../tools/lib/banger/form-types.js');
const { riserVoice, riser } = await import('../tools/lib/banger/theory.js');
const { expandOrder } = await import('../src/data/arrangements.js');
const { voltageRollsFor } = await import('../src/game/banger/make.js');

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
const gen = (options, seed = 7) => generateBanger({ riff: RIFF, seed, options: { style: 'big-room', ...options } });
const classic = { template: 'club', breakdownHook: 'half', buildWay: 'roll', dropIn: 'straight' };
const barPart = (out, role, bar1) => {
  const lane = out.banger.laneOf[role];
  if (!lane) return [];
  const plan = expandOrder(out.bank.order)[bar1 - 1];
  const sec = out.bank.sections[plan.sec];
  return (sec[lane] || out.bank[lane] || []).slice(plan.half * 16, plan.half * 16 + 16);
};
const steps = (notes) => notes.map((v, i) => [i, v]).filter(([, v]) => v != null && v !== false && !(Array.isArray(v) && !v.length)).map(([i]) => i);
const plays = (out, role, bar1) => steps(barPart(out, role, bar1)).length > 0;
const TUNE = ['hook', 'pad', 'saws', 'piano', 'arp'];
const tuneIn = (out, bar1) => TUNE.some((r) => plays(out, r, bar1));
const noteOf = (out) => (Array.isArray(out.note) ? out.note.join('\n') : String(out.note));

// ---- the options
{
  const f = normaliseBangerOptions({}).options;
  assert(f.form.introWay === 'varied' && f.form.tuneFirst === true && f.fx.riserWay === 'varied', 'a new request: Varied intro and riser, Tune First on');
  const old = normaliseBangerOptions({ form: { template: 'club' }, fx: { stutter: true } }).options;
  assert(old.form.introWay === 'riff' && old.form.tuneFirst === false && old.fx.riserWay === 'noise',
    'a request that names its form and effects without them was made before: the riff intro, the slow build-ups, the noise riser');
  const fields = (g) => BANGER_GROUPS.find((x) => x.id === g).fields;
  const listed = (g, key) => fields(g).find((x) => x.key === key).options.map(([id]) => id);
  assert(INTRO_WAYS.every((w) => listed('form', 'introWay').includes(w.id) && SECTION_TYPES.intro.variants.some(([id]) => id === w.id))
    && RISER_WAYS.every((w) => listed('fx', 'riserWay').includes(w.id)),
  'every intro way is in the dialog and an intro\'s Plays list, every riser in the dialog');
  assert(['intro', 'riser'].every((st) => BANGER_REROLLS.some((r) => r.stream === st)), 'Modify This Take can draw the intro and the riser again');
}

// ---- each intro way
{
  for (const w of INTRO_WAYS) {
    const out = gen({ length: 'long', form: { ...classic, introWay: w.id } });
    const intro = out.form.find((s) => s.role === 'intro');
    assert(intro && (tuneIn(out, intro.from) || tuneIn(out, intro.from + 1)) && new RegExp(`Intro — ${w.label}`).test(noteOf(out)),
      `${w.label}: the riff or the chords from the first two bars, and the take's note says so`);
  }
  const cold = gen({ form: { ...classic, introWay: 'cold' } });
  const ci = cold.form.find((s) => s.role === 'intro');
  assert(['hook', 'bass', 'kick'].every((r) => plays(cold, r, ci.from)), 'Cold Open: the hook, the bass and the kick from the first bar');
  const arp = gen({ form: { ...classic, introWay: 'arp' } });
  const ai = arp.form.find((s) => s.role === 'intro');
  assert(plays(arp, 'arp', ai.from) && !plays(arp, 'hook', ai.from) && plays(arp, 'hook', ai.to), 'Arp Intro: the arp first, the riff joining halfway');
  const pad = gen({ form: { ...classic, introWay: 'pad' } });
  const pi = pad.form.find((s) => s.role === 'intro');
  assert(plays(pad, 'hook', pi.from) && plays(pad, 'pad', pi.from) && [...Array(pi.bars).keys()].every((i) => !plays(pad, 'kick', pi.from + i)),
    'Riff over Pad: the riff and its chords from the first bar, no kick');
}

// ---- Tune First
{
  const layers = (tuneFirst) => gen({ length: 'long', form: { ...classic, layers: 'always', tuneFirst } });
  const on = layers(true); const off = layers(false);
  const ion = on.form.find((s) => s.role === 'intro'); const ioff = off.form.find((s) => s.role === 'intro');
  assert(plays(on, 'hook', ion.from) && !plays(on, 'kick', ion.from) && plays(on, 'kick', ion.from + 2),
    `Build in Layers under Tune First: the riff opens alone, the kick two bars later (${ion.bars} bars)`);
  assert(!plays(off, 'hook', ioff.from) && plays(off, 'kick', ioff.from) && ioff.bars > ion.bars,
    `without it, the kick first and the riff last, four bars a part (${ioff.bars} bars)`);
  const groove = (tuneFirst) => generateBanger({ riff: RIFF, seed: 3, options: { style: 'deep-house', length: 'long', form: { template: 'groove', tuneFirst } } });
  const g = groove(true); const g0 = groove(false);
  assert(plays(g, 'hook', 1) && !plays(g0, 'hook', 1), 'a Groove under Tune First plays its riff from the first bar; without it, not');
  // Groove Pace: Every 4 Bars — a part more every four bars from the first groove, while it rises.
  const paced = (groovePace) => generateBanger({ riff: RIFF, seed: 3, options: { style: 'deep-house', length: 'long', form: { template: 'groove', tuneFirst: true, groovePace } } });
  const firstBass = (out) => { for (let b = 1; b <= 64; b++) if (plays(out, 'bass', b)) return b; return 99; };
  assert(firstBass(paced('four')) < firstBass(paced('eight')), `Groove Pace: Every 4 Bars brings the bass in sooner (bar ${firstBass(paced('four'))} against ${firstBass(paced('eight'))})`);
  const lab = (v) => [...Array(400).keys()].map((s) => voltageRollsFor('big-room', 'anthemic', 3, s + 1, null, v)).filter((r) => r.form?.grooveIntro).length;
  assert(lab(8) === 0 && lab(7) > 0, 'the Lab never rolls the Drums & Bass Intro from recipe expression 8 (it did before)');
}

// ---- Riser Type
{
  assert(JSON.stringify(riserVoice('noise', 128, 0)) === JSON.stringify(riser(2 * 240 / 128)), 'the Noise Riser is the riser it always was');
  const riserBar = (out) => {
    const build = out.form.find((s) => s.role === 'build');
    for (let b = 1; b <= build.to; b++) { const st = steps(barPart(out, 'riser', b)); if (st.length) return (b - 1) * 16 + st[0]; }
    return null;
  };
  for (const w of RISER_WAYS) {
    const out = gen({ form: classic, fx: { riserWay: w.id } });
    const drop = out.form.find((s) => s.role === 'drop');
    const at = riserBar(out);
    const lane = out.banger.laneOf.riser;
    assert(at === (drop.from - 1) * 16 - w.bars * 16 && out.mix.voiceParams[`${lane}Voice`]?.label === w.label,
      `${w.label}: struck ${w.bars} bar${w.bars === 1 ? '' : 's'} before the drop, on its own voice`);
  }
  // The Stutter Riser: gated from each hit, quickening into the drop.
  const st = gen({ form: classic, fx: { riserWay: 'stutter' } });
  const gates = laneFx(st.arrangement.automation, st.banger.laneOf.riser).flatMap((x) => x.chain).filter((e) => e.id === 'rhythmgate').map((e) => e.params.division);
  assert(gates.join().startsWith('0.5,0.25,0.125'), `Stutter Riser: the riser gated, eighths then sixteenths then thirty-seconds (${gates.slice(0, 3)})`);
  // A tonal riser lands on the note its section starts on — a lifted final drop's on a second lane.
  const fifths = gen({ form: { ...classic, keyLift: 'whole' }, fx: { riserWay: 'fifths' } }, 5);
  const v1 = fifths.mix.voiceParams[`${fifths.banger.laneOf.riser}Voice`]; const v2 = fifths.mix.voiceParams[`${fifths.banger.laneOf.riser2}Voice`];
  const semis = (hz) => Math.round(12 * Math.log2(hz / 440)) + 69;
  assert(v1 && v2 && semis(v1.osc2.to) - semis(v1.osc.to) === 7 && (semis(v2.osc.to) - semis(v1.osc.to) + 12) % 12 === 2,
    'Fifths Riser: root and fifth, and the risers into the lifted drop land a whole step up, on a second riser lane');
  const flat = gen({ form: { ...classic, keyLift: 'none' }, fx: { riserWay: 'pitch' } }, 5);
  assert(!flat.banger.laneOf.riser2, 'with no lift, one riser lane');

  // ---- Riser FX (Spot FX): an effect over every riser for as long as it climbs; over a Stutter Riser, after the gate
  for (const w of RISER_FX_WAYS.filter((x) => x.id !== 'none')) {
    const out = gen({ form: classic, fx: { riserWay: 'noise' }, spot: { riser: w.id } });
    const secs = laneFx(out.arrangement.automation, out.banger.laneOf.riser);
    assert(secs.length && secs.every((x) => x.to - x.from === 32 && x.chain.at(-1)?.id === RISER_FX[w.id].id), `Riser FX ${w.label}: over each two-bar riser`);
  }
  const gatedFx = gen({ form: classic, fx: { riserWay: 'stutter' }, spot: { riser: 'flanger' } });
  assert(laneFx(gatedFx.arrangement.automation, gatedFx.banger.laneOf.riser).every((x) => x.chain[0].id === 'rhythmgate' && x.chain[1]?.id === 'flanger'),
    'a Stutter Riser through the Jet Flanger: the gate, then the flanger');
  const lifted = gen({ form: { ...classic, keyLift: 'whole' }, fx: { riserWay: 'fifths' }, spot: { riser: 'echo' } }, 5);
  assert(laneFx(lifted.arrangement.automation, lifted.banger.laneOf.riser2).some((x) => x.chain.some((e) => e.id === 'delay')), 'and the second riser lane gets it too');
  assert(normaliseBangerOptions({ spot: { intoDrop: 'style' } }).options.spot.riser === 'none', 'a request naming its Spot FX without Riser FX has none');

  // ---- the style and mood rules: Varied never draws a way the song's style or mood rules out
  const { unsuited } = await import('../tools/lib/banger/ways.js');
  const ruled = [];
  for (const [style, mood] of [['deep-house', 'dreamy'], ['nu-disco', 'disco'], ['chipstep', 'playful'], ['big-room', 'lofi']]) {
    const fitOf = { style, mood, soundSet: 'style' };
    const no = { riser: unsuited(RISER_WAYS, fitOf), fx: unsuited(RISER_FX_WAYS, fitOf), hit: unsuited(DROP_HIT_WAYS, fitOf) };
    for (let seed = 1; seed <= 25; seed++) {
      const out = generateBanger({ riff: RIFF, seed, options: { style, mood, form: { template: 'club' }, fx: { riserWay: 'varied', dropHit: 'varied' }, spot: { riser: 'varied' } } });
      const n = noteOf(out);
      const riser = RISER_WAYS.find((w) => n.includes(`Riser: ${w.label}`))?.id;
      const fx = RISER_FX_WAYS.find((w) => n.includes(`through ${w.label}`))?.id;
      const hit = DROP_HIT_WAYS.find((w) => n.includes(`Drop hit: ${w.label}.`))?.id;
      if (no.riser.includes(riser) || no.fx.includes(fx) || no.hit.includes(hit)) ruled.push(`${style}/${mood}:${riser},${fx},${hit}`);
    }
  }
  assert(!ruled.length && unsuited(RISER_WAYS, { style: 'deep-house' }).includes('stutter') && unsuited(RISER_WAYS, { style: 'big-room', mood: 'dreamy' }).includes('pitch')
    && unsuited(RISER_WAYS, { style: 'megadrive' }).includes('wind') && !unsuited(RISER_WAYS, { style: 'big-room', mood: 'anthemic' }).length,
  `the style and mood rules hold: no stutter, tonal riser, metallic rise or bitcrush for the chill ones, no wind or wash for chip, Big Room takes everything${ruled.length ? ` (${ruled.slice(0, 3)})` : ''}`);

  // ...and on the breakdown's, the builds' and the intro's from Ways Era 3 (a first-era request keeps its draws).
  const { BREAKDOWN_WAYS } = await import('../tools/lib/banger/breakdown-ways.js');
  const { BUILD_WAYS } = await import('../tools/lib/banger/build-ways.js');
  const wrong = [];
  for (const [style, mood] of [['deep-house', 'dreamy'], ['reggaeton', 'fiesta'], ['techno', 'dark'], ['italo-disco', 'disco']]) {
    const fitOf = { style, mood, soundSet: 'style' };
    const nb = unsuited(BREAKDOWN_WAYS, fitOf); const nu = unsuited(BUILD_WAYS, fitOf); const ni = unsuited(INTRO_WAYS, fitOf);
    for (let seed = 1; seed <= 20; seed++) {
      const n = noteOf(generateBanger({ riff: RIFF, seed, options: { style, mood, form: { template: 'club', breakdownHook: 'varied', buildWay: 'varied', introWay: 'varied' } } }));
      for (const w of BREAKDOWN_WAYS) if (nb.includes(w.id) && new RegExp(`Breakdown[^\n]*— ${w.label}$`, 'm').test(n)) wrong.push(`${style}: ${w.label}`);
      for (const w of BUILD_WAYS) if (nu.includes(w.id) && new RegExp(`Build[^\n]*— ${w.label}`, 'm').test(n)) wrong.push(`${style}: ${w.label}`);
      for (const w of INTRO_WAYS) if (ni.includes(w.id) && new RegExp(`Intro — ${w.label}$`, 'm').test(n)) wrong.push(`${style}: ${w.label}`);
    }
  }
  assert(!wrong.length && unsuited(BUILD_WAYS, { style: 'reggaeton' }).includes('kick') && unsuited(BREAKDOWN_WAYS, { style: 'techno' }).includes('piano'),
    `the rules hold on the breakdowns, builds and intros too — no Kick Roll in reggaeton, no piano hook in techno, no Gated Hook in deep house${wrong.length ? ` (${wrong.slice(0, 4)})` : ''}`);

  // ---- Drop Hit
  for (const w of DROP_HIT_WAYS) {
    const out = gen({ form: classic, fx: { riserWay: 'noise', dropHit: w.id } });
    const lane = out.banger.laneOf.impact;
    const ok = w.id === 'style' ? !out.mix.voiceParams?.[`${lane}Voice`] && !DROP_HIT_WAYS.some((x) => x.voice && x.voice === out.mix.voice[`${lane}Voice`])
      : w.voice ? out.mix.voice[`${lane}Voice`] === w.voice : out.mix.voiceParams[`${lane}Voice`]?.label === 'Sub Drop';
    assert(ok, `Drop Hit ${w.label}: the impact plays it`);
  }
  const old = gen({ form: classic, fx: { stutter: true } });
  assert(!DROP_HIT_WAYS.some((x) => x.voice && x.voice === old.mix.voice[`${old.banger.laneOf.impact}Voice`]), 'a request naming its effects without Drop Hit keeps the style\'s own impact');

  const seen = new Set(); const intros = new Set(); const hits = new Set();
  for (let seed = 1; seed <= 90; seed++) {
    const out = gen({}, seed);
    const r = noteOf(out).match(/Riser: (.+)\./); if (r) seen.add(r[1].split(', through')[0]);
    const i = noteOf(out).match(/Intro — (.+)$/m); if (i) intros.add(i[1]);
    const h = noteOf(out).match(/Drop hit: (.+)\./); if (h) hits.add(h[1]);
  }
  assert(RISER_WAYS.every((w) => seen.has(w.label)) && INTRO_WAYS.every((w) => intros.has(w.label)) && DROP_HIT_WAYS.every((w) => hits.has(w.label)),
    `Varied draws every riser, intro and drop hit (${[...seen].join(', ')} · ${[...intros].join(', ')} · ${[...hits].join(', ')})`);
}

console.log(failed ? '\nbanger intros: FAILED' : '\nbanger intros: PASSED');
process.exit(failed ? 1 : 0);
