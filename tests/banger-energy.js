// Energy changes arrangement density, never the tune, core rhythm or master gain.
import assert from 'node:assert/strict';
import { generateBanger, normaliseBangerOptions } from '../tools/lib/banger/index.js';
import { BANGER_STYLES } from '../tools/lib/banger/styles/index.js';
import { expandOrder } from '../src/data/arrangements.js';
import { riffFromNotes, DEFAULT_SIMPLE } from '../src/game/banger/riff.js';
const riff = riffFromNotes(DEFAULT_SIMPLE);
const drops = new Set(['drop', 'drop2', 'drop3', 'reprise']);
function part(out, role) {
  const lane = out.laneOf[role];
  return expandOrder(out.bank.order).map(({ sec, half }) => {
    const section = out.bank.sections[sec];
    return ['notes', 'lengths'].map((kind) => {
      const key = kind === 'notes' ? lane : `${lane}Len`;
      return (section[key] || out.bank[key] || Array(32).fill(null)).slice(half * 16, half * 16 + 16).map((v) => v || null);
    });
  });
}
assert.equal(normaliseBangerOptions({}).options.energy, 'full');
assert(normaliseBangerOptions({ energy: 'bad' }).issues.length);
for (const style of BANGER_STYLES) {
  for (const seed of [3, 19]) {
    const make = (energy) => generateBanger({ riff, options: { style: style.id, ...(energy ? { energy } : {}) }, seed });
    const old = make(); const full = make('full'); const lean = make('lean'); const huge = make('huge'); const maximum = make('maximum');
    assert.deepEqual(full.bank, old.bank, `${style.id}: Full preserves notes`);
    assert.deepEqual(full.mix, old.mix, `${style.id}: Full preserves mix`);
    assert.deepEqual(full.arrangement, old.arrangement, `${style.id}: Full preserves automation`);
    for (const out of [lean, huge, maximum]) {
      assert.equal(out.mix.master, full.mix.master, `${style.id}: no master boost`);
      assert.deepEqual(out.form, full.form, `${style.id}: same structure`);
      for (const role of ['hook', 'bass', 'sub', 'kick', 'snare', 'clap', 'hats', 'ohats']) {
        assert.deepEqual(part(out, role), part(full, role), `${style.id}: ${out.banger.options.energy} keeps ${role}`);
      }
    }
    assert(Object.keys(lean.laneOf).length < Object.keys(full.laneOf).length, `${style.id}: Lean has fewer layers`);
    assert.notDeepEqual(huge.bank, full.bank, `${style.id}: Huge adds music`);
    assert.notDeepEqual(maximum.bank, huge.bank, `${style.id}: Maximum intensifies every drop`);
    const final = full.form.findLast((s) => drops.has(s.role));
    for (const role of new Set([...Object.keys(full.laneOf), ...Object.keys(huge.laneOf)])) {
      const a = part(full, role); const b = part(huge, role);
      for (const sec of full.form) {
        if (sec === final || ['build', 'build2', 'preChorus'].includes(sec.role)) continue;
        assert.deepEqual(b.slice(sec.from - 1, sec.to), a.slice(sec.from - 1, sec.to), `${style.id}: Huge leaves ${sec.role}/${role} alone`);
      }
    }
    const harmony = part(huge, 'third');
    assert(harmony.slice(final.from - 1 + Math.floor(final.bars / 2), final.to).some(([notes]) => notes.some(Boolean)), `${style.id}: harmony arrives in finale`);
    assert.deepEqual(make('huge').bank, huge.bank, `${style.id}: deterministic`);
    assert.deepEqual(make('maximum').bank, maximum.bank, `${style.id}: Maximum is deterministic`);
  }
  console.log(`ok: ${style.id} energy preserves core, shapes finale and keeps master level`);
}
console.log('BANGER ENERGY: PASSED');

// Old saves default to Full; every new energy choice survives save repair and editing.
const { installDom } = await import('./dom-stub.js');
installDom();
const { bangerState, saveDraft, keepBanger, reviseBanger, songFor } = await import('../src/game/banger/store.js');
const { makeBanger } = await import('../src/game/banger/make.js');
const storage = { data: {}, persist() {} };
assert.equal(bangerState(storage).draft.energy, 'full');
saveDraft({ ...bangerState(storage).draft, energy: 'huge' }, storage);
assert.equal(bangerState(storage).draft.energy, 'huge');
const recipe = { notes: DEFAULT_SIMPLE, style: 'trance', mood: 'uplifting', seed: 3, bpm: 138 };
const full = keepBanger(recipe, storage);
const huge = keepBanger({ ...recipe, energy: 'huge' }, storage);
assert.notEqual(full.n, huge.n, 'energy change keeps a separate song');
assert.equal(keepBanger({ ...recipe, energy: 'huge', seed: 4 }, storage), huge, 'same energy regenerates that song');
assert.equal(bangerState(storage).kept.find((r) => r.n === huge.n).energy, 'huge');
assert.deepEqual(songFor(huge).bank, makeBanger(huge).bank, 'saved energy replays correctly');
const before = songFor(huge);
reviseBanger(huge, { ...recipe, energy: 'lean' }, storage);
assert.equal(huge.energy, 'lean');
assert.notEqual(songFor(huge), before, 'editing energy invalidates the cached song');
assert.deepEqual(songFor(huge).bank, makeBanger(huge).bank);
console.log('BANGER ENERGY SAVE: PASSED');
