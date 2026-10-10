import assert from 'node:assert/strict';
import { CREATIVE_DRUM_KITS, creativeLabKits } from '../src/data/creative-drum-kits.js';
import { VOICES, voicesFor } from '../src/data/voices.js';
import { KITS as MIXER_KITS } from '../tools/mixer-step-seq.js';
import { BANGER_SOUNDS } from '../tools/lib/banger/sounds.js';
import { generateBanger } from '../tools/lib/banger/index.js';
const riff = { version: 1, source: { id: 'kit-audition', title: 'Kit audition', from: 0, to: 0, bpm: 128 }, bars: 1, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch: 74,
    bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .'] }] };
assert.equal(CREATIVE_DRUM_KITS.length, 15);
for (const kit of CREATIVE_DRUM_KITS) {
  assert.deepEqual(MIXER_KITS.find(([label]) => label === kit.label)?.[1], kit.voices);
  for (const [lane, id] of Object.entries(kit.voices)) {
    const v = VOICES[id];
    assert(v?.kind === 'drum' && v.level > 0 && v.peak > 0 && v.peak !== 1, `${id}: calibrated native voice`);
    assert(voicesFor(lane).some(v => v.id === id), `${id}: offered in mixer`);
    if (kit.key === 'pocket-pixel') assert(!v.drive && !v.crusher && !v.metal && (!v.osc || v.osc.type === 'triangle'), `${id}: clean pocket synthesis`);
  }
  for (const style of Object.values(BANGER_SOUNDS)) assert.deepEqual(style.kits[kit.key], creativeLabKits()[kit.key]);
  const song = generateBanger({ riff, seed: 2, options: { drums: { source: 'replace', kit: kit.key } } });
  assert.equal(song.banger.options.drums.kit, kit.key, 'recipe retains the selection');
  for (const [lane, label] of Object.entries(song.mix.labels)) {
    if (label === 'KICK') assert.equal(song.mix.voice[`${lane}Voice`], kit.voices.kick, 'generated song plays selected kit');
  }
  assert(Object.values(song.mix.voice).includes(kit.voices.kick));
}
console.log('creative-drum-kits: all 15 kits calibrated, offered and generated correctly');

// The kit ROLLS (tools/lib/banger/kit-rolls.js): every style rolls the five machine kits plus
// creative kits that exist; a Lab recipe before expression 11 rolls from the five alone.
{
  const { BASE_KIT_ROLLS, STYLE_KIT_ROLLS, kitRollsFor } = await import('../tools/lib/banger/kit-rolls.js');
  const { BANGER_STYLES } = await import('../tools/lib/banger/styles/index.js');
  const { voltageRollsFor } = await import('../src/game/banger/make.js');
  const creative = new Set(CREATIVE_DRUM_KITS.map((k) => k.key));
  for (const [style, list] of Object.entries(STYLE_KIT_ROLLS)) {
    assert(BANGER_STYLES.some((s) => s.id === style), `${style}: a style the generator has`);
    assert(list.every((k) => creative.has(k)), `${style}: rolls only creative kits that exist`);
  }
  const drawn = (version) => new Set(Array.from({ length: 300 }, (_, i) => voltageRollsFor('dnb', 'moody', 3, i + 1, null, version).drums?.kit).filter(Boolean));
  assert([...drawn(10)].every((k) => ['studio', '909', '808', 'ds', 'cr78'].includes(k)), 'a recipe before 11 rolls from the old five alone, DS included');
  assert(['ds', 'studio'].every((k) => !BASE_KIT_ROLLS.includes(k) && ![...drawn(11)].includes(k)), 'from 11 nothing rolls the retired DS or Studio kits');
  const v11 = drawn(11);
  assert([...v11].every((k) => kitRollsFor('dnb').includes(k)) && ['breakbeat', 'neuro'].some((k) => v11.has(k)),
    'from 11 a take rolls its style\'s creative kits too');
  console.log('creative-drum-kits: kit rolls per style hold');
}

// THE LAB'S MIXER (club-voices.js): the DRUMS button reaches every kit; the DICE only the style's.
{
  const { ClubVoices } = await import('../src/game/banger/club-voices.js');
  const { kitRollsFor } = await import('../tools/lib/banger/kit-rolls.js');
  const song = { soundsId: 'dnb', laneOf: {}, bank: {}, mix: { order: ['kick'], voice: { kickVoice: 'ds909KickPunch' } } };
  const v = new ClubVoices(song, { style: 'dnb' });
  const all = v.choices('drums').map((c) => c.kit), rolled = v.rollChoices('drums').map((c) => c.kit);
  assert(CREATIVE_DRUM_KITS.every((k) => all.includes(k.key) === (k.lab !== false)) && ['909', '808', 'cr78'].every((k) => all.includes(k)) && !all.includes('ds') && !all.includes('studio'),
    'the DRUMS button steps through every kit the Lab offers, and none of the desk-only eight');
  const { voltageRollsFor: rollsFor } = await import('../src/game/banger/make.js');
  const bigRoom = new Set(Array.from({ length: 300 }, (_, i) => rollsFor('big-room', 'anthemic', 3, i + 1, null, 11).drums?.kit).filter(Boolean));
  assert(!bigRoom.has('glasshouse') && !bigRoom.has('neon-origami'), 'the Lab never rolls a desk-only kit');
  assert(rolled.join() === all.join() && all.indexOf('breakbeat') < all.indexOf('brushes'),
    'the DICE can land on any kit the Lab offers, the ones that suit the style listed first');
  console.log('creative-drum-kits: the Lab mixer offers and rolls every Lab kit; the desk-only eight stay off');
}

// A Style Kit that is one of the named kits goes by its name, and is not listed twice.
{
  const { ClubVoices } = await import('../src/game/banger/club-voices.js');
  const v = new ClubVoices({ soundsId: 'dnb-jungle', laneOf: {}, bank: {}, mix: { order: ['kick'], voice: {} } }, { style: 'dnb' });
  const labels = v.choices('drums').map((c) => c.label);
  assert(labels[0] === 'BREAKBEAT KIT' && labels.filter((l) => l === 'BREAKBEAT KIT').length === 1 && !labels.includes('STYLE KIT'),
    'Jungle\'s own kit reads BREAKBEAT KIT, once');
  console.log('creative-drum-kits: a Style Kit that is a named kit goes by its name');
}
