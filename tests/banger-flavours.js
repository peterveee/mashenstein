// BANGER FLAVOURS — a style's other arrangements (tools/lib/banger/styles/flavours.js, 6 Oct 2026).
//
// Afro House is the first: Organic (its own), Melodic and Tech. The mood picks one, the desk
// can name one or draw one, and the Lab rolls one with the voltage so a re-roll can land
// somewhere unexpected. Held here: each flavour is a recipe of its own on its own sounds; the
// mood, the name and the seed choose it, the same way every time; it really changes the music
// (chord lengths, the bass, the parts); and the Lab's surprises follow the voltage.
import { BANGER_SOUNDS } from '../tools/lib/banger/sounds.js';
import { generateBanger } from '../tools/lib/banger/index.js';
import { BANGER_STYLES, BANGER_FLAVOURS, styleFor, flavourOf, flavoursFor, moodFlavour } from '../tools/lib/banger/styles/index.js';
import { normaliseBangerOptions } from '../tools/lib/banger/options.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const riff = { version: 1, source: { id: 't', title: 'T', from: 0, to: 1, bpm: 122 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch: 74,
    bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .', 'D5:4 . . . A4:2 . . . F5:2 . . . E5:2 . . .'] }] };
const make = (options, seed = 3) => generateBanger({ riff, options: { style: 'afro-house', ...options }, seed });

// ---- what a flavour is
const afro = styleFor('afro-house');
assert(BANGER_FLAVOURS.length >= 2 && BANGER_FLAVOURS.every((f) => f.base && f.flavour && f.id === `${f.base}-${f.flavour}` && BANGER_SOUNDS[f.id]
  && !BANGER_STYLES.includes(f) && styleFor(f.id) === f),
'every flavour is a recipe of its own, named <style>-<flavour>, with its own sounds — and not in the style list');
assert(flavoursFor('afro-house').map((f) => f.id).join() === 'organic,melodic,tech' && flavoursFor('big-room').length === 0,
  'Afro House is Organic (its own), Melodic and Tech; a style without flavours lists none');

// ---- what chooses one
assert(moodFlavour(afro, 'moody') === 'organic' && moodFlavour(afro, 'uplifting') === 'melodic' && moodFlavour(afro, 'dark') === 'tech'
  && moodFlavour(afro, 'funky') === 'organic', 'the mood picks the flavour: Moody organic, Uplifting melodic, Dark tech, an unnamed mood the style\'s own');
assert(normaliseBangerOptions({ style: 'afro-house' }, afro).options.flavour === 'mood', 'By Mood is the default');
assert(flavourOf(afro, 'style') === null && flavourOf(afro, 'organic') === null && flavourOf(afro, 'tech')?.id === 'afro-house-tech',
  'Style\'s Own and the own flavour are the style itself; a flavour named is that flavour');
{
  const drawn = Array.from({ length: 60 }, (_, i) => flavourOf(afro, 'random', { seed: i + 1 })?.flavour || 'organic');
  assert(new Set(drawn).size === 3 && drawn.every((f, i) => f === (flavourOf(afro, 'random', { seed: i + 1 })?.flavour || 'organic')),
    `Random draws every flavour across seeds, the same one for the same seed (${['organic', 'melodic', 'tech'].map((f) => drawn.filter((x) => x === f).length).join('/')})`);
}
assert(flavourOf(styleFor('big-room'), 'random', { seed: 5 }) === null && flavourOf(styleFor('afro-house-tech'), 'mood', { mood: 'uplifting' }) === null,
  'a style without flavours plays its own whatever is asked, and a flavour asked for by its id plays itself');

// ---- what it changes
{
  const organic = make({ mood: 'moody' });
  const melodic = make({ mood: 'uplifting' });
  const tech = make({ mood: 'dark' });
  assert(!organic.banger.flavour && melodic.banger.flavour === 'melodic' && tech.banger.flavour === 'tech'
    && melodic.banger.style === 'afro-house-melodic' && melodic.summary.style === 'Afro House · Melodic',
  'a take says which flavour it is, in its recipe and its header');
  assert(organic.bank.bpm === 122 && melodic.bank.bpm === 120 && tech.bank.bpm === 124, 'each flavour at its own tempo: 122, 120, 124');
  const labels = (o) => Object.values(o.mix.labels).join('|');
  assert(/CONGA/.test(labels(melodic)) && /TOMS Tribal/.test(labels(tech)) && /DJEMBE Tone/.test(labels(organic))
    && /STAB/.test(labels(tech)) && !/STAB/.test(labels(organic)),
  'each plays its own parts: djembe in the organic, congas in the melodic, tribal toms and an off-beat stab (the pad remapped) in the tech');
  // The same mood under two flavours: Melodic holds each chord two bars, Tech one chord six.
  const melo = styleFor('afro-house-melodic').progressions.moody.minor.map(String);
  const tch = styleFor('afro-house-tech').progressions.moody.minor.map(String);
  assert(melo.every((c, i) => c === melo[i - (i % 2)]) && tch.slice(0, 6).every((c) => c === tch[0]),
    'Melodic holds every chord for two bars and Tech one chord for six — the mood still picks which chords');
  const named = make({ mood: 'moody', flavour: 'tech' });
  assert(named.banger.flavour === 'tech' && named.bank.bpm === 124, 'a flavour named on the desk wins over the mood\'s');
}

// ---- the Lab: no control, a surprise by the voltage
{
  const { labFlavour, FLAVOUR_SURPRISE } = await import('../src/game/banger/make.js');
  const count = (v) => Array.from({ length: 300 }, (_, i) => labFlavour('afro-house', 'moody', i + 1, v)).filter((f) => f !== 'organic').length;
  const by = [0, 1, 2, 3].map(count);
  assert(FLAVOUR_SURPRISE[0] === 0 && by[0] === 0 && by[1] > 0 && by[3] > by[1] && labFlavour('afro-house', 'uplifting') === 'melodic'
    && labFlavour('big-room', 'moody', 4, 3) === null,
  `the Lab plays the mood's flavour, and now and then another — never on Safe, more often the higher the voltage (${by.join(', ')} of 300)`);
}

if (failed) { console.error('\nbanger-flavours: FAILED'); process.exit(1); }
console.log('\nbanger-flavours: all passed');
