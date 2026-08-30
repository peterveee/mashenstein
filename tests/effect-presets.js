// Source-backed defaults: the catalogue and the DEV writer must agree without
// requiring a browser or touching the checked-in preset file during the test.
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EFFECTS, EFFECT_BY_ID, effectPresetNames, resolveEffectPreset,
  resolveEffectSnapshot, matchEffectPreset, bellResponse, peqResponse, PEQ_BANDS,
} from '../src/engine/effects.js';
import { AUXES, AUX_DEFAULTS } from '../src/engine/mixer.js';
import { EFFECT_PRESETS } from '../src/data/effect-presets.js';
import {
  readEffectPresets, writeEffectPresetsAtomic, normalizeKnownDefaults,
} from '../tools/lib/effect-presets-source.js';

let failed = false;
const assert = (ok, msg) => {
  if (!ok) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

for (const def of EFFECTS) {
  const entry = EFFECT_PRESETS.inserts[def.id];
  assert(entry && entry.default, `${def.id} has a source default`);
  for (const key of def.params) {
    assert(Object.prototype.hasOwnProperty.call(entry.default, key), `${def.id}.${key} is present`);
    assert(JSON.stringify(def.defaults[key]) === JSON.stringify(entry.default[key]),
      `${def.id}.${key} is the effective catalogue default`);
  }
}

for (const aux of AUXES) {
  const entry = EFFECT_PRESETS.returns[aux.id];
  assert(entry && entry.default, `${aux.id} return has a source default`);
  for (const key of aux.presetParams || []) {
    assert(JSON.stringify(entry.default[key]) === JSON.stringify(AUX_DEFAULTS[aux.id][key]),
      `${aux.id}.${key} is the effective return default`);
  }
}

const mixerSource = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
// The card builder and the surfaces it chooses between moved out of the entry — see
// tools/mixer-effect-cards.js.
const cardsSource = readFileSync(new URL('../tools/mixer-effect-cards.js', import.meta.url), 'utf8');
assert(mixerSource.includes("fetch('/effect-default-save'"), 'DEV card save posts to the effect-default route');
assert(mixerSource.includes('Save new default settings for ${name}'), 'the dialog uses the requested title');
assert(mixerSource.includes("scope: 'returns'"), 'pinned return cards use the return preset namespace');
assert(cardsSource.includes("if ((def.params || []).length)"),
  'every parameterized effect card exposes a Default reset row');

const vowelPresetNames = effectPresetNames('vowel');
assert(vowelPresetNames.length === 5, 'vowel ships five named effect presets');
for (const name of vowelPresetNames) {
  const resolved = resolveEffectPreset('vowel', name);
  assert(resolved && EFFECT_BY_ID.vowel.params.every((key) => Object.hasOwn(resolved, key)),
    `vowel preset ${name} resolves every declared parameter`);
  assert(matchEffectPreset('vowel', resolved) === name,
    `vowel preset ${name} matches its resolved snapshot`);
}
const customVowel = resolveEffectSnapshot('vowel', { waveform: 'square', excite: 0.5 });
assert(matchEffectPreset('vowel', customVowel) === null,
  'a changed vowel snapshot is identified as Custom');
assert(resolveEffectPreset('vowel', 'missing') === null,
  'an unknown named preset resolves to null');

// The two EQ cards. Both call their untouched state Flat in the PRESET row, and both
// resolve every parameter they declare — an EQ preset that left a band out would be an
// EQ preset that sounded different depending on what the card had been doing before.
for (const [id, expect] of [['peq', 11], ['bell', 8]]) {
  const names = effectPresetNames(id);
  assert(names.length === expect, `${id} ships ${expect} named EQ presets`);
  assert(EFFECT_BY_ID[id].defaultPresetName === 'Flat',
    `${id} names its default preset Flat`);
  for (const name of names) {
    const resolved = resolveEffectPreset(id, name);
    assert(resolved && EFFECT_BY_ID[id].params.every((key) => Object.hasOwn(resolved, key)),
      `${id} preset ${name} resolves every declared parameter`);
    assert(matchEffectPreset(id, resolved) === name,
      `${id} preset ${name} matches its resolved snapshot`);
  }
}
// Flat is the catalogue default and therefore has to BE flat: an inserted, untouched EQ
// must render exactly the samples the strip already had.
const probe = [40, 100, 400, 1000, 3000, 8000, 14000];
const flatBell = bellResponse(resolveEffectPreset('bell', 'Default'), probe);
const flatPeq = peqResponse(resolveEffectPreset('peq', 'Default'), probe);
assert([...flatBell, ...flatPeq].every((db) => Math.abs(db) < 1e-9),
  'both EQ cards are exactly flat at their Flat preset');
// And a preset called Bass Boost boosts bass. Cheap to state, and the only check that
// would catch a frequency and a gain transposed in the data file.
const bassBell = bellResponse(resolveEffectPreset('bell', 'Bass Boost'), probe);
assert(bassBell[1] > 4 && Math.abs(bassBell[5]) < 0.5,
  'the Bell EQ Bass Boost lifts 100Hz and leaves 8kHz alone');
const trebleBell = bellResponse(resolveEffectPreset('bell', 'Treble Boost'), probe);
assert(trebleBell[5] > 4 && Math.abs(trebleBell[1]) < 0.5,
  'the Bell EQ Treble Boost lifts 8kHz and leaves 100Hz alone');
const smiley = peqResponse(resolveEffectPreset('peq', 'Smiley'), probe);
assert(smiley[0] > 3 && smiley[6] > 3 && smiley[2] < -1,
  'the Channel EQ Smiley lifts both ends and dips the mids');
// THE FIFTH BAND, and the one property that could break silently when it was added.
// `n` is an identity and not a position — the middle band is band 5 sitting third — so
// the node and the graph agree only as long as both key off `b.n`. makeParametricEq used
// to key off the array index, which was the same four numbers until it wasn't.
assert(PEQ_BANDS.length === 5
  && PEQ_BANDS.map((b) => b.n).join(',') === '1,2,5,3,4'
  && PEQ_BANDS.map((b) => b.f).every((f, i, all) => i === 0 || f > all[i - 1]),
  'the Channel EQ has five bands, listed low to high, with the middle one numbered 5');
const midOnly = peqResponse({ ...EFFECT_BY_ID.peq.defaults, g5: 12, q5: 4 }, probe);
assert(midOnly[3] > 10 && Math.abs(midOnly[0]) < 0.2 && Math.abs(midOnly[6]) < 0.2,
  'band 5 is the 1kHz band — a boost on it moves 1kHz and leaves both ends alone');
const honk = resolveEffectPreset('peq', 'Honk Cut');
assert(honk.f5 === 900 && honk.g5 === -6
  && [honk.g1, honk.g2, honk.g3, honk.g4].every((g) => g === 0),
  'Honk Cut is the middle band on its own, with the other four left flat');

const ambiencePresetNames = effectPresetNames('ambience');
assert(ambiencePresetNames.includes('Small') && ambiencePresetNames.includes('Dark')
  && ambiencePresetNames.includes('Glass Room') && ambiencePresetNames.includes('Deep Space'),
  'ambience ships the bright and dark extended-range presets');
for (const name of ambiencePresetNames) {
  const resolved = resolveEffectPreset('ambience', name);
  assert(resolved && EFFECT_BY_ID.ambience.params.every((key) => Object.hasOwn(resolved, key)),
    `ambience preset ${name} resolves every declared parameter`);
  assert(matchEffectPreset('ambience', resolved) === name,
    `ambience preset ${name} matches its resolved snapshot`);
}

const springPresetNames = effectPresetNames('spring');
assert(springPresetNames.includes('Splash') && springPresetNames.includes('Classic')
  && springPresetNames.includes('Dark Tank') && springPresetNames.includes('Boing'),
  'spring reverb ships distinct spring-character presets');
for (const name of springPresetNames) {
  const resolved = resolveEffectPreset('spring', name);
  assert(resolved && EFFECT_BY_ID.spring.params.every((key) => Object.hasOwn(resolved, key)),
    `spring preset ${name} resolves every declared parameter`);
  assert(matchEffectPreset('spring', resolved) === name,
    `spring preset ${name} matches its resolved snapshot`);
}

// Common cards have a small starter library as well as the universal Default reset.
// Keep these source-backed and complete so selecting one never inherits a value from a
// previous hand-tuned state.
const commonPresetExpectations = {
  gain: ['Boost', 'Cut', 'Mono'],
  delay: ['Slapback', 'Echo', 'Long Echo'],
  pingpong: ['Slapback', 'Wide Echo'],
  chorus: ['Subtle', 'Wide', 'Slow Ensemble'],
  chorus2: ['Subtle', 'Wide'],
  distortion: ['Warm', 'Crunch'],
  widener: ['Subtle', 'Wide'],
  reverb: ['Small Room', 'Plate', 'Hall', 'Dark Chamber', 'Bright Plate', 'Wide Hall'],
  spring: ['Splash', 'Classic', 'Dark Tank', 'Boing'],
  compressor: ['Gentle', 'Punch', 'Vocal'],
  noisegate: ['Gentle Gate', 'Gated Reverb'],
  msComp: ['Glue', 'Center Punch', 'Wide & Open', 'Stereo Tame', 'Vocal Focus', 'Techno Pump'],
  filter: ['Low-pass Clean', 'High-pass Clean'],
};
for (const [id, expected] of Object.entries(commonPresetExpectations)) {
  const names = effectPresetNames(id);
  assert(expected.every((name) => names.includes(name)),
    `${id} ships its common named presets`);
  assert(matchEffectPreset(id, EFFECT_BY_ID[id].defaults) === 'Default',
    `${id} identifies its catalogue defaults as Default`);
  for (const name of expected) {
    const resolved = resolveEffectPreset(id, name);
    assert(resolved && EFFECT_BY_ID[id].params.every((key) => Object.hasOwn(resolved, key)),
      `${id} preset ${name} resolves every declared parameter`);
    assert(matchEffectPreset(id, resolved) === name,
      `${id} preset ${name} matches its resolved snapshot`);
  }
}

const characterPresetExpectations = {
  rhythmgate: ['Tight Pulse', 'Chop'],
  flanger: ['Subtle Sweep', 'Jet'],
  phaser: ['Slow Sweep', 'Wide Phase'],
  tremolo: ['Gentle Pulse', 'Hard Chop'],
  autofilter: ['Gentle Sweep', 'Acid'],
  bitcrusher: ['Lo-Fi', '8-bit', 'Console'],
  tape: ['Warm', 'Worn'],
  ringmod: ['Bell', 'Robot'],
  exciter: ['Air', 'Presence'],
  doubler: ['Tight Double', 'Wide Double'],
  shifter: ['Subtle Shift', 'Metallic'],
  pitch: ['Octave Up', 'Octave Down'],
};
for (const [id, expected] of Object.entries(characterPresetExpectations)) {
  const names = effectPresetNames(id);
  assert(expected.every((name) => names.includes(name)),
    `${id} ships its character presets`);
  for (const name of expected) {
    const resolved = resolveEffectPreset(id, name);
    assert(resolved && EFFECT_BY_ID[id].params.every((key) => Object.hasOwn(resolved, key)),
      `${id} preset ${name} resolves every declared parameter`);
    assert(matchEffectPreset(id, resolved) === name,
      `${id} preset ${name} matches its resolved snapshot`);
  }
}

const nativeMultibandPresetNames = effectPresetNames('mbCompN');
assert(nativeMultibandPresetNames.length === 5,
  'native multiband ships five named presets');
for (const name of nativeMultibandPresetNames) {
  const resolved = resolveEffectPreset('mbCompN', name);
  assert(resolved && EFFECT_BY_ID.mbCompN.params.every((key) => Object.hasOwn(resolved, key)),
    `native multiband preset ${name} resolves every declared parameter`);
  assert(matchEffectPreset('mbCompN', resolved) === name,
    `native multiband preset ${name} matches its resolved snapshot`);
}
assert(cardsSource.includes('function multibandControls')
  && cardsSource.includes("def.id === 'mbCompN'")
  && !cardsSource.includes("def.id === 'mbComp'"),
  'the native multiband card uses the grouped control surface');
assert(EFFECT_BY_ID.mbComp === EFFECT_BY_ID.mbCompN
  && !Object.keys(EFFECT_BY_ID).includes('mbComp'),
  'old mbComp drafts resolve through a hidden native compatibility alias');

const normalized = normalizeKnownDefaults({ wet: 0.25, removed: 99 }, ['wet', 'tone'], { wet: 0.5, tone: 12000 });
assert(JSON.stringify(normalized) === JSON.stringify({ wet: 0.25, tone: 12000 }),
  'normalization drops removed keys and fills newly added keys');

const dir = mkdtempSync(join(tmpdir(), 'mash-effect-presets-'));
const path = join(dir, 'effect-presets.js');
try {
  const candidate = {
    inserts: {
      chorus: {
        default: { ...EFFECT_BY_ID.chorus.defaults, staleParameter: 99 },
        presets: { warm: { wet: 0.7 } },
      },
    },
    returns: {},
  };
  await writeEffectPresetsAtomic(candidate, path);
  const roundTrip = await readEffectPresets(path);
  assert(roundTrip.inserts.chorus.presets.warm.wet === 0.7,
    'named presets survive a default rewrite');
  assert(roundTrip.inserts.chorus.default.staleParameter === 99,
    'the source writer preserves data it does not own');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failed) process.exit(1);
console.log('EFFECT PRESETS: PASSED');
