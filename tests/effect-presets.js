// Source-backed defaults: the catalogue and the DEV writer must agree without
// requiring a browser or touching the checked-in preset file during the test.
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EFFECTS, EFFECT_BY_ID, effectPresetNames, resolveEffectPreset,
  resolveEffectSnapshot, matchEffectPreset,
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
assert(mixerSource.includes("fetch('/effect-default-save'"), 'DEV card save posts to the effect-default route');
assert(mixerSource.includes('Save new default settings for ${name}'), 'the dialog uses the requested title');
assert(mixerSource.includes("scope: 'returns'"), 'pinned return cards use the return preset namespace');

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
