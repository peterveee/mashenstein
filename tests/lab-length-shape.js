// LENGTH AND SHAPE IN THE LAB (Peter, 10 Oct 2026): MUTATION's chooser also picks the song's length and
// form. Held here, below the maker's screen (tests/jukebox-banger.js drives the chooser): a recipe keeps
// them as `songLength` and `shape`, absent meaning DEFAULT — the formula's own, as every recipe before them,
// so nothing kept moves; the made song has them; a picked shape is never rolled away by the voltage; an
// INFUSION's DEFAULT is the Club form, and a picked shape overrides it; the store keeps them through the draft, a keep, a
// revise and the song cache; anything unreadable is DEFAULT.
import { installDom } from './dom-stub.js';
installDom();

const make = await import('../src/game/banger/make.js');
const { makeBanger, voltageRollsFor, labDefaults, LAB_LENGTHS, LAB_SHAPES, RECIPE_EXPRESSION, MAKER_STYLES } = make;
const store = await import('../src/game/banger/store.js');
const { styleDefaults } = await import('../tools/lib/banger/options.js');
const { styleFor } = await import('../tools/lib/banger/styles/index.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const notes = [0, -1, 2, -1, 4, -1, 2, -1, 0, -1, 4, -1, 7, -1, 4, -1];
const recipe = (extra = {}) => ({ notes, mode: 'simple', style: 'big-room', mood: 'anthemic', seed: 7, voltage: 1, expression: RECIPE_EXPRESSION, ...extra });
const bars = (song) => song.form.at(-1).to;
const types = (song) => song.form.map((f) => f.type);

assert(LAB_LENGTHS.map((l) => l.id).join() === 'short,medium,long,xlong' && LAB_SHAPES.map((t) => t.id).join() === 'club,pop,anthem,groove',
  'LENGTH is Short, Medium, Long, Extra Long; SHAPE is Club, Pop Song, Anthem, Groove');
assert(LAB_LENGTHS.map((l) => l.label).join() === 'Radio Edit,Single,Album Version,12 Inch', 'named for records: Radio Edit, Single, Album Version, 12 Inch');
assert(make.labLengthHint('long', 'big-room') === '112 bars, about 3:30 at 128 BPM' && make.labLengthHint('short', 'dnb') === '48 bars, about 1:05 at 174 BPM',
  `a LENGTH's hint is its bars and about how long they run at the formula's tempo (${make.labLengthHint('long', 'big-room')})`);

{
  // DEFAULT is the formula's own, which is what a recipe without them makes
  const wrong = MAKER_STYLES.filter((s) => {
    const own = labDefaults(s.id);
    const d = styleDefaults(styleFor(s.id));
    return own.songLength !== d.length || own.shape !== d.form.template;
  }).map((s) => s.id);
  assert(!wrong.length, `DEFAULT is every formula's own length and form${wrong.length ? ` (${wrong.join(', ')})` : ''}`);
  assert(labDefaults('big-room', 'trance').shape === 'club' && labDefaults('big-room', 'trance').songLength === 'long',
    'with an INFUSION, DEFAULT is the Club form and the infusion\'s length (Trance: Long)');
  const plain = makeBanger(recipe());
  assert(JSON.stringify(makeBanger(recipe({ songLength: null, shape: null })).mix) === JSON.stringify(plain.mix)
    && JSON.stringify(makeBanger(recipe({ songLength: 'huge', shape: 'opera' })).mix) === JSON.stringify(plain.mix),
    'no LENGTH or SHAPE, or ones the Lab does not offer, is the song made without them');
}
{
  // they reach the song
  const lengths = Object.fromEntries(LAB_LENGTHS.map((l) => [l.id, bars(makeBanger(recipe({ songLength: l.id })))]));
  assert(lengths.short === 48 && lengths.medium === 64 && lengths.long === 112 && lengths.xlong === 160, `LENGTH is the song's bars (${JSON.stringify(lengths)})`);
  assert(bars(makeBanger(recipe({ style: 'synthwave', mood: 'nostalgic', songLength: 'xlong' }))) === 160
    && bars(makeBanger(recipe({ style: 'deep-house', mood: 'moody', songLength: 'xlong' }))) === 160, 'Extra Long is 160 bars in a Pop Song and a Groove too');
  const pop = types(makeBanger(recipe({ shape: 'pop' })));
  const groove = types(makeBanger(recipe({ shape: 'groove', songLength: 'short' })));
  assert(pop.includes('verse') && pop.includes('chorus') && !pop.includes('drop'), 'SHAPE Pop Song makes Big-Room House a Pop Song');
  assert(groove.every((t) => t === 'groove') && bars(makeBanger(recipe({ shape: 'groove', songLength: 'short' }))) === 48, 'and Groove a short Groove');
  const trance = makeBanger(recipe({ style: 'trance', mood: 'uplifting', shape: 'club', songLength: 'short' }));
  assert(bars(trance) === 48 && types(trance).includes('drop'), 'Trance picked Short and Club is 48 bars of the Club form');
  const infused = types(makeBanger(recipe({ infusion: 'trance' })));
  const infusedPop = types(makeBanger(recipe({ infusion: 'trance', shape: 'pop' })));
  const infusedGroove = types(makeBanger(recipe({ infusion: 'trance', shape: 'groove' })));
  assert(infused.includes('drop') && !infused.includes('verse'), 'an INFUSION on DEFAULT plays the Club form');
  assert(infusedPop.includes('verse') && infusedPop.includes('chorus') && infusedGroove.every((t) => t === 'groove'),
    'and a picked SHAPE overrides it: a Pop Song, a Groove');
}
{
  // a picked SHAPE is never rolled away; one not picked rolls as ever
  const seeds = Array.from({ length: 300 }, (_, i) => (i * 2654435761) >>> 0 || 1);
  const moved = seeds.filter((s) => {
    const t = voltageRollsFor('reggaeton', 'anthemic', 3, s, null, RECIPE_EXPRESSION, null, 'groove').form?.template;
    return t && t !== 'groove';
  }).length;
  const rolled = seeds.filter((s) => voltageRollsFor('reggaeton', 'anthemic', 3, s, null, RECIPE_EXPRESSION).form?.template !== undefined
    && voltageRollsFor('reggaeton', 'anthemic', 3, s, null, RECIPE_EXPRESSION).form.template !== 'pop').length;
  assert(moved === 0 && rolled > 0, `Overload never rolls a picked SHAPE away, and still rolls an unpicked one (${rolled} of ${seeds.length})`);
  const halfTime = seeds.some((s) => voltageRollsFor('reggaeton', 'anthemic', 3, s, null, RECIPE_EXPRESSION, null, 'club').form?.halfTime);
  assert(halfTime, 'a picked Club form can still roll the half-time switch, which is the Club form\'s');
  const same = seeds.every((s) => {
    const a = voltageRollsFor('big-room', 'anthemic', 3, s, null, RECIPE_EXPRESSION);
    const b = voltageRollsFor('big-room', 'anthemic', 3, s, null, RECIPE_EXPRESSION, null, 'club');
    const strip = (r) => JSON.stringify({ ...r, form: r.form ? { ...r.form, template: undefined } : undefined });
    return a.form?.template && a.form.template !== 'club' ? true : strip(a) === strip(b);
  });
  assert(same, 'picking the formula\'s own SHAPE moves no other roll');
}
{
  // the store
  const data = {};
  const save = { data, persist() {} };
  store.saveDraft({ ...store.bangerState(save).draft, songLength: 'long', shape: 'anthem' }, save);
  assert(store.bangerState(save).draft.songLength === 'long' && store.bangerState(save).draft.shape === 'anthem', 'the draft keeps LENGTH and SHAPE');
  data.bangers.draft.songLength = 'enormous'; data.bangers.draft.shape = 'sonata';
  const d = store.bangerState(save).draft;
  assert(!('songLength' in d) && !('shape' in d), 'one the Lab does not offer reads as DEFAULT');
  const rec = store.keepBanger({ ...recipe(), bpm: 128, songLength: 'short', shape: 'groove', fresh: true }, save);
  assert(rec.songLength === 'short' && rec.shape === 'groove', 'a kept song keeps them');
  const plain = store.keepBanger({ ...recipe({ seed: 8 }), bpm: 128, fresh: true }, save);
  assert(!('songLength' in plain) && !('shape' in plain), 'and one made on DEFAULT carries neither');
  const song = store.songFor(rec);
  assert(bars(song) === 48 && types(song).every((t) => t === 'groove'), 'the kept song is made with them');
  store.reviseBanger(rec, { ...recipe({ seed: 9 }), bpm: 128, songLength: 'long' });
  assert(rec.songLength === 'long' && !('shape' in rec) && bars(store.songFor(rec)) === 112,
    'a revised song takes the pencil\'s LENGTH and SHAPE, and the cache makes it again');
}

console.log(failed ? '\nlab length and shape: FAILED' : '\nlab length and shape: PASSED');
process.exit(failed ? 1 : 0);
