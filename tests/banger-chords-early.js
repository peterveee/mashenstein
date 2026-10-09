// CHORDS EARLY (9 Oct 2026). Peter: "with our new styles sometimes there are no chords". In a Groove
// song the parts come in a layer at a time, and the chords came after the bass, at bar 17 of 64 —
// half a minute of no harmony — and left again at bar 49. For the chord-led styles (Deep House,
// Nu-Disco, Boogie, Downtempo) the chords now come with the second layer, at bar 9, and stay to bar
// 56. Acid House and Techno keep their sparse start. Held here: the switch moves only the chords;
// those four styles say it and no other does; and nothing made before it moves — a request that
// names its form but no Chords Early, and a Lab recipe kept before version 7, play as they did.
import { installDom } from './dom-stub.js';
installDom();
const { generateBanger, BANGER_GROUPS } = await import('../tools/lib/banger/index.js');
const { DEFAULT_LAYERS } = await import('../tools/lib/banger/form.js');
const { chordsEarly } = await import('../tools/lib/banger/sections.js');
const { styleDefaults } = await import('../tools/lib/banger/options.js');
const { styleFor } = await import('../tools/lib/banger/styles/index.js');
const { riffFromNotes } = await import('../src/game/banger/riff.js');
const { makeBanger, MAKER_STYLES, RECIPE_EXPRESSION } = await import('../src/game/banger/make.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const NOTES = [7, -1, 5, -1, 4, -1, 2, -1, 0, -1, 2, -1, 4, -1, 5, -1];
const EARLY = ['deep-house', 'nu-disco', 'electro-funk', 'downtempo'];
const has = (pat) => Array.isArray(pat) && pat.some((v) => v != null && !(Array.isArray(v) && !v.length));
/** The first and last bar any chords lane plays in. */
function chordSpan(t) {
  const barsPer = (t.bank.sections[0]?.kick?.length || 32) / 16;
  const bars = [];
  t.bank.order.forEach((idx, k) => {
    if (Object.entries(t.bank.sections[idx] || {}).some(([lane, pat]) => /^chords\d*$/.test(lane) && has(pat))) bars.push(k * barsPer + 1);
  });
  return bars.length ? [bars[0], bars.at(-1) + barsPer - 1] : null;
}
const same = (a, b) => JSON.stringify([a.bank, a.mix, a.arrangement]) === JSON.stringify([b.bank, b.mix, b.arrangement]);

// ---------------------------------------------------------------- the layer order
{
  const early = chordsEarly(DEFAULT_LAYERS);
  assert(early[1].includes('chords') && !early.slice(2).some((l) => l.includes('chords')) && early.length === DEFAULT_LAYERS.length
    && JSON.stringify(early.map((l) => l.filter((t) => t !== 'chords'))) === JSON.stringify(DEFAULT_LAYERS.map((l) => l.filter((t) => t !== 'chords'))),
  'Chords Early moves the chords into the second layer and nothing else');
  assert(chordsEarly([['kick'], ['chords', 'bass']]).length === 2 && chordsEarly([['kick', 'chords'], ['bass']])[0].includes('chords'),
    'and leaves chords that are already in by the second layer where they are');
  assert(JSON.stringify(chordsEarly([['kick'], ['bass'], ['chords']])) === JSON.stringify([['kick'], ['bass', 'chords']]), 'a layer the move empties goes');
  assert(BANGER_GROUPS.find((g) => g.id === 'form').fields.some((f) => f.key === 'chordsEarly'), 'the desk shows it: Form → Chords Early');
}

// ---------------------------------------------------------------- which styles say it
{
  const say = MAKER_STYLES.filter((s) => styleDefaults(styleFor(s.id)).form.chordsEarly).map((s) => s.id);
  assert(JSON.stringify(say.sort()) === JSON.stringify([...EARLY].sort()), `Deep House, Nu-Disco, Boogie and Downtempo say Chords Early, and no other style (${say})`);
}

// ---------------------------------------------------------------- the Lab: chords from bar 9
{
  let spans = [];
  for (const style of EARLY) for (const mood of ['anthemic', 'dreamy', 'dark']) for (const seed of [1, 2]) {
    spans.push([style, chordSpan(makeBanger({ notes: NOTES, mode: 'simple', style, mood, seed, voltage: 1, expression: RECIPE_EXPRESSION }))]);
  }
  assert(spans.every(([, s]) => s && s[0] === 9 && s[1] === 56), `a new Lab take in each comes in with chords at bar 9 and keeps them to bar 56 (${spans.map(([st, s]) => `${st}:${s}`).join(' ')})`);
  const kept = EARLY.map((style) => chordSpan(makeBanger({ notes: NOTES, mode: 'simple', style, mood: 'anthemic', seed: 1, voltage: 1, expression: 6 })));
  assert(kept.every((s) => s && s[0] === 17 && s[1] === 48), `a recipe kept before version 7 still waits for bar 17 (${kept.join(' ')})`);
  const acid = ['acid-house', 'techno'].map((style) => chordSpan(makeBanger({ notes: NOTES, mode: 'simple', style, mood: 'anthemic', seed: 1, voltage: 1, expression: RECIPE_EXPRESSION })));
  assert(acid.every((s) => s && s[0] === 17), `Acid House and Techno keep their sparse start (${acid.join(' ')})`);
}

// ---------------------------------------------------------------- the desk: nothing old moves
{
  const riff = riffFromNotes(NOTES, 'simpleSquare', 'simple');
  const make = (options) => generateBanger({ riff, options, seed: 3 });
  const named = make({ style: 'deep-house', mood: 'dreamy', form: { template: 'groove' } });
  const off = make({ style: 'deep-house', mood: 'dreamy', form: { template: 'groove', chordsEarly: false } });
  assert(same(named, off) && named.banger.options.form.chordsEarly === false && chordSpan(named)[0] === 17,
    'a desk request that names its form but no Chords Early was made before it: off, as it was');
  const fresh = make({ style: 'deep-house', mood: 'dreamy' });
  assert(fresh.banger.options.form.chordsEarly === true && chordSpan(fresh)[0] === 9, 'a new desk take on Deep House starts on the style\'s say: on');
  const asked = make({ style: 'big-room', mood: 'anthemic', form: { template: 'groove', chordsEarly: true } });
  const notAsked = make({ style: 'big-room', mood: 'anthemic', form: { template: 'groove', chordsEarly: false } });
  assert(chordSpan(asked)[0] < chordSpan(notAsked)[0], `and any style can ask for it (Big Room on Groove: bar ${chordSpan(asked)[0]}, not ${chordSpan(notAsked)[0]})`);
}

console.log(failed ? '\nBANGER CHORDS EARLY: FAILED' : '\nBANGER CHORDS EARLY: PASSED');
process.exit(failed ? 1 : 0);
