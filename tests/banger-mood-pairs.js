// MOOD PAIRS — one mood, then another taking over part of the song, under a name of their own
// (tools/lib/banger/moods.js MOOD_PAIRS, 7 Oct 2026). Held here: the Lab's ELEMENT lists them after
// the moods; each plays as its first mood with the second as Second Mood and Switch At; its line
// names where the change comes in the words of the song's form; every pair makes a song in every
// style; and a Groove, which has no drops, changes at its fullest sections.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { MOOD_PAIRS, firstMood } = await import('../tools/lib/banger/moods.js');
const { BANGER_MOODS } = await import('../tools/lib/banger/options.js');
const { generateBanger } = await import('../tools/lib/banger/index.js');
const { riffFromNotes } = await import('../src/game/banger/riff.js');
const { MAKER_MOODS, MAKER_STYLES, makeBanger, pairDescription } = await import('../src/game/banger/make.js');
const { bangerNameFor } = await import('../src/game/banger/store.js');
const { BangerMakerState } = await import('../src/game/banger/maker.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const NOTES = [7, -1, 5, -1, 4, -1, 2, -1, 0, -1, 2, -1, 4, -1, 5, -1];
const riff = riffFromNotes(NOTES, 'simpleSquare', 'simple');
const moodIds = new Set(BANGER_MOODS.map((m) => m.id));

// ---------------------------------------------------------------- the pairs
{
  const pairs = Object.entries(MOOD_PAIRS);
  assert(pairs.length === 6 && pairs.every(([id, p]) => !moodIds.has(id) && moodIds.has(p.first) && moodIds.has(p.second) && p.first !== p.second
    && ['choruses', 'final', 'breakdown'].includes(p.switch)), 'six pairs, each of two different moods and a Switch At, none named like a mood');
  assert(MAKER_MOODS.length === BANGER_MOODS.length + 6 && MAKER_MOODS.length % 4 === 0, 'ELEMENT lists 32: the moods and the six pairs');
  const singles = MAKER_MOODS.filter((m) => !m.pair);
  const paired = MAKER_MOODS.filter((m) => m.pair);
  const sorted = (list) => list.every((m, i) => i === 0 || list[i - 1].label.localeCompare(m.label) <= 0);
  assert(MAKER_MOODS.slice(-6).every((m) => m.pair) && sorted(singles) && sorted(paired), 'the moods alphabetically, then the pairs alphabetically');
  assert(firstMood('victory') === 'dark' && firstMood('dark') === 'dark', 'a pair starts in its first mood');
}

// ---------------------------------------------------------------- its line follows the form
{
  assert(pairDescription('breakthrough', 'pop') === 'Moody, turning Uplifting in every chorus'
    && pairDescription('breakthrough', 'club') === 'Moody, turning Uplifting in every drop'
    && pairDescription('breakthrough', 'groove') === 'Moody, turning Uplifting at every peak'
    && pairDescription('victory', 'anthem') === 'Dark, turning Heroic for the last drop'
    && pairDescription('awakening', 'pop') === 'Hypnotic, turning Euphoric from the middle 8',
  'a pair says where its second mood comes in, in the words of the form: choruses, drops or peaks');
  Input.usingTouch = false;
  const maker = new BangerMakerState({ onDone: () => {}, onMade: () => {} });
  maker.enter();
  maker.setInfusion(null);
  maker.setStyle('nu-disco');
  const line = () => maker.moodItems().find((m) => m.id === 'breakthrough').description;
  assert(/every chorus$/.test(line()), 'ELEMENT\'s line for a Pop Song formula says choruses');
  maker.setInfusion('big-room');
  assert(/every drop$/.test(line()), 'and with a Club INFUSION — the form is the infusion\'s — drops');
}

// ---------------------------------------------------------------- it plays as Second Mood
{
  for (const [id, p] of Object.entries(MOOD_PAIRS)) {
    const rec = { notes: NOTES, mode: 'simple', style: 'big-room', mood: id, seed: 5, voltage: 1, expression: 4 };
    const viaPair = makeBanger(rec);
    const first = makeBanger({ ...rec, mood: p.first });
    if (JSON.stringify(viaPair.bank) === JSON.stringify(first.bank)) assert(false, `${id} plays something besides ${p.first}`);
  }
  assert(true, 'every pair plays something its first mood alone does not');
  const out = generateBanger({ riff, seed: 4, options: { style: 'nu-disco', mood: 'moody', form: { template: 'pop', mood2: 'uplifting', moodSwitch: 'choruses' } } });
  const plain = generateBanger({ riff, seed: 4, options: { style: 'nu-disco', mood: 'moody', form: { template: 'pop' } } });
  assert(JSON.stringify(out.bank) !== JSON.stringify(plain.bank), 'a Pop Song with Choruses Only changes mood in its choruses');
  // A Groove has no drops: its fullest sections are its choruses.
  const groove = (mood2) => generateBanger({ riff, seed: 4, options: { style: 'deep-house', mood: 'moody', form: { template: 'groove', ...(mood2 ? { mood2, moodSwitch: 'choruses' } : {}) } } });
  assert(JSON.stringify(groove('uplifting').bank) !== JSON.stringify(groove(null).bank), 'a Groove changes mood at its peaks');
}
{
  // Every pair in every style makes a song.
  const bad = [];
  for (const st of MAKER_STYLES) {
    for (const id of Object.keys(MOOD_PAIRS)) {
      try { makeBanger({ notes: NOTES, mode: 'simple', style: st.id, mood: id, seed: 2, voltage: 2, expression: 4 }); } catch (e) { bad.push(`${st.id}/${id}: ${e.message}`); }
    }
  }
  assert(!bad.length, `every pair in every style makes a song${bad.length ? ` — ${bad.slice(0, 4).join('; ')}` : ''}`);
}
{
  const save = { data: {}, persist() {} };
  const name = bangerNameFor({ mood: 'victory' }, save, () => 0);
  const dark = bangerNameFor({ mood: 'dark' }, save, () => 0);
  assert(name === dark, `a pair's song is named for the mood it starts in (${name})`);
}

if (failed) { console.error('BANGER MOOD PAIRS: FAILED'); process.exit(1); }
console.log('BANGER MOOD PAIRS: PASSED');
