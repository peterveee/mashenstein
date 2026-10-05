import assert from 'node:assert/strict';
import { CREATIVE_DRUM_KITS, creativeLabKits } from '../src/data/creative-drum-kits.js';
import { VOICES, voicesFor } from '../src/data/voices.js';
import { KITS as MIXER_KITS } from '../tools/mixer-step-seq.js';
import { BANGER_SOUNDS } from '../tools/lib/banger/sounds.js';
import { generateBanger } from '../tools/lib/banger/index.js';
const riff = { version: 1, source: { id: 'kit-audition', title: 'Kit audition', from: 0, to: 0, bpm: 128 }, bars: 1, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch: 74,
    bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .'] }] };
assert.equal(CREATIVE_DRUM_KITS.length, 8);
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
console.log('creative-drum-kits: all 8 kits calibrated, offered and generated correctly');
