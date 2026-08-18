/** Browserless contracts for the TNGR-2 wavetable catalogue and editor wiring. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  TNGR2_TABLES, isTngr2Table, tngr2TableName,
} from '../src/engine/tngr2/families.js';
import { VOICES } from '../src/data/voices.js';
import { panelSpec, fullLayout, quickRows } from '../tools/mixer-voice-editor.js';

const ids = Object.keys(TNGR2_TABLES);
assert.equal(ids.length, 16, 'TNGR-2 ships sixteen deterministic table families');
assert(ids.every(isTngr2Table), 'every shipped table id is accepted by the catalogue');
assert.equal(tngr2TableName('missing'), 'Basic Shapes', 'unknown tables fall back to Basic Shapes');


const presets = Object.values(VOICES).filter((v) => v.synth === 'TNGR-2');
assert.equal(presets.length, 43, 'the expanded bank contains 43 TNGR-2 presets');
assert.deepEqual(presets.reduce((out, v) => {
  out[v.category] = (out[v.category] || 0) + 1; return out;
}, {}), { Bass: 7, Lead: 8, Pad: 6, Keys: 8, Pluck: 3, Bells: 5, Orch: 4, FX: 2 },
'TNGR-2 presets cover showcase and conventional instrument categories');
const familiar = presets.filter((v) => /^(Round Bass|Picked Bass|Soft Piano|Bright Piano|Electric Keys|Music Bell|Church Bell|Celesta|Warm Strings|Soft Strings|Brass Section|Soft Horn|Plain Saw Synth|Plain Pulse Synth|Classic Square Synth)$/.test(v.label));
assert.equal(familiar.length, 15, 'the expanded bank includes fifteen familiar instruments');
// Osc B is present or absent — see the section switch in `_playTngr2`. A stored `on`
// flag would be a second switch with no pot behind it, so its absence is asserted.
assert(familiar.every((v) => (v.tngr2.oscA.unison ?? 1) === 1
  && (!v.tngr2.oscB || (v.tngr2.oscB.unison ?? 1) === 1)),
'familiar instruments avoid costly unison stacks');
assert(familiar.filter((v) => v.tngr2.oscB).length <= 5,
'most familiar instruments use only one oscillator');
assert(presets.every((v) => v.tngr2.oscB?.on === undefined),
'Osc B is switched by its presence, not by a stored flag with no control');
for (const voice of presets) {
  assert(voice.tngr2?.oscA && voice.tngr2?.amp && voice.tngr2?.filter,
    `${voice.id} has oscillator, amp and filter sections`);
  assert(isTngr2Table(voice.tngr2.oscA.table), `${voice.id} uses a known Osc A table`);
}

const sample = presets[0];
const panel = panelSpec(sample);
assert.equal(panel.groups.length, 7,
  'the strip editor exposes Osc A, Osc B, Motion, Filter, Filter Env, Amp and Effects');
assert.equal(panel.common.rows.some((r) => r.path === '$mode'), true,
  'TNGR-2 exposes shared key mode and glide controls');
const paths = panel.groups.flatMap((g) => g.rows).map((r) => r.path);
for (const path of ['$tngr2.oscA.stereo', '$tngr2.oscA.lfoAmount', '$tngr2.oscA.envAmount',
  '$tngr2.lfo1.rate', '$tngr2.lfo1.shape', '$tngr2.positionEnv.release']) {
  assert(paths.includes(path), `${path} is editable rather than a dead preset parameter`);
}
assert.equal(fullLayout(sample).total,
  new Set([...panel.common.rows, ...panel.groups.flatMap((g) => g.rows)].map((r) => r.path)).size,
  'the TNGR-2 full editor places every panel control exactly once');
const motion = quickRows({ synth: 'TNGR-2', tngr2: { oscA: { envAmount: 0, lfoAmount: 0 } } })
  .find((r) => r.path === '$tngr2.quick.motion');
const init = { synth: 'TNGR-2', tngr2: { oscA: { envAmount: 0, lfoAmount: 0 } } };
motion.write(0.4, init);
assert.equal(Math.max(Math.abs(init.tngr2.oscA.envAmount), Math.abs(init.tngr2.oscA.lfoAmount)), 0.4,
  'the Quick MOTION macro can raise an Init patch from zero');
motion.write(0, init);
assert.equal(init.tngr2.oscA.envAmount, 0, 'the Quick MOTION macro returns to silence');

// TNGR-2 is its worklet and nothing else: the native PeriodicWave path was retired once
// the worklet became the only path, so the rack must dispatch to the node and there must
// be no second synthesis path left to drift from it.
const source = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');
assert(source.includes("v.synth === 'TNGR-2'") && source.includes('_playTngr2Node'),
  'the voice rack dispatches TNGR-2 to its worklet lane');
assert(!source.includes('tngr2Wave('),
  'no native PeriodicWave renderer survives in the rack');
assert(!existsSync(new URL('../src/engine/tngr2.js', import.meta.url)),
  'the native compatibility module is gone');

console.log('TNGR-2: PASSED');
