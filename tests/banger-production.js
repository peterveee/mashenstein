import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';
import { generateBanger, normaliseBangerOptions, modifyBanger, describeModify,
  BANGER_STYLES, planTrackEffects, applyTrackEffects, productionFeatures } from '../tools/lib/banger/index.js';
import { L } from '../tools/lib/banger/theory.js';
import { Rng } from '../src/engine/rng.js';
import { VOICES } from '../src/data/voices.js';
import { makeBanger } from '../src/game/banger/make.js';
import { keepBanger, reviseBanger, songFor } from '../src/game/banger/store.js';
import { EFFECT_BY_ID } from '../src/engine/effects.js';
import { trackEffectProfiles } from '../tools/lib/banger-calibration.js';
import { profileKey, phraseFeatures, measuredPart } from '../tools/lib/banger/calibration.js';

installDom();
const sourceBars = ['A4:1 . . . E5:1 . . . C5:1 . . . . . . .', 'F4:1 . . . C5:1 . . . A4:1 . . . . . . .'];
const riff = { version: 1, source: { id: 'production-test', title: 'SPACE', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Pluck', kind: 'melodic', role: 'hook', meanPitch: 72, voice: 'synthPluck', voiceParams: null, engineKeys: null, strip: null, bars: sourceBars }] };
const generate = (mode, seed = 7, extra = {}) => generateBanger({ riff, options: { style: 'trance', production: { mode }, ...extra }, seed });
const clone = structuredClone;
const fixture = (roles = ['hook'], voice = 'synthPluck', part = L(sourceBars[0])) => ({
  style: { id: 'trance' }, options: { mood: 'dreamy', production: { mode: 'adventurous' } },
  mix: { fx: {}, lanes: Object.fromEntries(roles.map((r, i) => [`lead${i || ''}`, {}])),
    voice: Object.fromEntries(roles.map((r, i) => [`lead${i || ''}Voice`, voice])) },
  bars: Array.from({ length: 2 }, () => Object.fromEntries(roles.map(r => [r, part]))),
  laneOf: new Map(roles.map((r, i) => [r, `lead${i || ''}`])), riffParts: [{ key: 'lead', strip: null }], hookKey: 'lead', bpm: 120,
  rng: { stream: () => { const draws = [0.45, 0.5, 0.9]; return { next: () => draws.shift() }; } },
});

assert.equal(normaliseBangerOptions({}).options.production.mode, 'style');
assert.equal(normaliseBangerOptions({ production: { mode: 'adventurous', version: 99 } }).options.production.mode, 'style');
assert.equal(normaliseBangerOptions({ production: { mode: 'overhaul' } }).options.production.mode, 'overhaul');
assert.ok(normaliseBangerOptions({ production: { mode: 'anything' } }).issues.length);
const sparse = productionFeatures([L(sourceBars[0])], VOICES.synthPluck, 120);
const densePart = L('A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4');
assert.ok(sparse.space > 0.2 && sparse.density === 3);
assert.equal(productionFeatures([L(sourceBars[0]), null, null], VOICES.synthPluck, 120).density, 3);
assert.equal(productionFeatures([densePart], VOICES.synthPluck, 120).density, 16);
const f = fixture(); const before = clone(f.mix);
const plan = planTrackEffects(f);
assert.deepEqual(f.mix, before, 'planning must not mutate the mix');
assert.equal(plan.applied[0]?.treatment, 'echo');
const applied = applyTrackEffects(f);
const delay = f.mix.lanes.lead.effects.find(e => e.id === 'chandelay');
assert.equal(delay.params.division, 0.75);
assert.equal(f.mix.lanes.lead.send.delay, 0);
assert.equal(f.mix.lanes.lead.effects.at(-1).params.gain, -1.5);
assert.deepEqual(applied, plan);
const overhaulFixture = fixture();
overhaulFixture.options.production.mode = 'overhaul';
const overhaul = planTrackEffects(overhaulFixture);
assert.equal(overhaul.mode, 'overhaul');
assert.equal(overhaul.applied[0].effects.find(e => e.id === 'chandelay').params.mix, 0.28,
  'Full Overhaul applies a stronger eligible echo');
const calibrationContext = { voice: VOICES.synthPluck, lane: 'lead', strip: {}, fx: {}, bpm: 120, role: 'hook', id: 'synthPluck' };
const variants = trackEffectProfiles(calibrationContext, { id: 'trance' }, 'dreamy');
assert.ok(variants.some(v => v.production.treatment === 'echo') && variants.some(v => v.production.treatment === 'room'));
assert.equal(new Set(variants.map(profileKey)).size, variants.length, 'processed calibration variants are deduplicated');
assert.deepEqual(calibrationContext.strip, {}, 'discovery preserves the original context');
const calibrationBars = [L(sourceBars[0])];
const dryKey = profileKey(calibrationContext);
const measured = { version: 1, profiles: { [dryKey]: { validated: true,
  samples: [{ features: phraseFeatures(calibrationBars, 120), residual: 0.5, peakDb: -12 }] } } };
assert.ok(measuredPart({ data: measured, ...calibrationContext, bars: calibrationBars, predicted: -20 }));
assert.equal(measuredPart({ data: measured, ...calibrationContext, strip: f.mix.lanes.lead, bars: calibrationBars, predicted: -20 }), null,
  'a dry measured profile must not validate a processed treatment');
for (const entry of applied.applied) for (const e of entry.effects) {
  const def = EFFECT_BY_ID[e.id]; assert.ok(def, `engine supports ${e.id}`);
  assert.ok(Object.keys(e.params).every(key => def.params.includes(key)), `${e.id} uses actual engine parameters`);
}
const shared = fixture(); shared.mix.fx.delay = { sync: 1, division: 0.75, feedback: 0.2 };
applyTrackEffects(shared);
assert.ok(shared.mix.lanes.lead.send.delay > 0);
assert.ok(!shared.mix.lanes.lead.effects.some(e => e.id === 'chandelay'), 'a suitable shared return needs no second delay');
const authored = fixture(); authored.riffParts[0].strip = { send: { delay: 0 }, effects: [{ id: 'chorus', bypass: true }] };
authored.mix.lanes.lead = clone(authored.riffParts[0].strip);
const sourceEffects = clone(authored.mix.lanes.lead.effects);
assert.equal(applyTrackEffects(authored).applied[0]?.treatment, 'echo', 'Adventurous treats a simple source lead despite zero sends');
assert.deepEqual(authored.mix.lanes.lead.effects.slice(0, sourceEffects.length), sourceEffects, 'source inserts and bypass states survive');
authored.options.production.mode = 'subtle';
assert.equal(planTrackEffects(authored).roles[0].treatment, 'protected', 'Subtle still protects authored strips');
for (const u of [0, 0.2, 0.5, 0.999]) {
  const simple = fixture(); simple.rng.stream = () => ({ next: () => u });
  simple.riffParts[0].strip = { effects: [], send: { delay: 0, reverb: 0 } };
  assert.equal(planTrackEffects(simple).applied.length, 1, 'an eligible Adventurous hook never draws dry');
}
const bypass = fixture();
bypass.riffParts[0].strip = { effects: [{ id: 'chandelay', bypass: true }, { id: 'reverb', bypass: true }] };
bypass.mix.lanes.lead = clone(bypass.riffParts[0].strip);
assert.equal(planTrackEffects(bypass).applied.length, 0, 'explicit bypass choices protect their effect families');
const send = fixture(); send.mix.lanes.lead.send = { delay: 0.6, reverb: 0.6 };
assert.equal(planTrackEffects(send).applied.length, 0, 'prominent inherited sends do not earn stacked ambience');
const low = fixture(); low.laneOf.set('hook', 'bass'); low.mix.lanes.bass = {}; low.mix.voice.bassVoice = 'synthPluck';
assert.equal(planTrackEffects(low).applied.length, 0);
const busy = fixture(['hook'], 'synthPluck', densePart); busy.mix.lanes.lead.send = { delay: 0.25, reverb: 0.3 };
applyTrackEffects(busy);
assert.equal(busy.mix.lanes.lead.send.delay, 0, 'busy tracks can turn inherited delay off');
assert.equal(busy.mix.lanes.lead.send.reverb, 0.12);
assert.ok(!busy.mix.lanes.lead.effects, 'busy tracks earn no added inserts');
const existing = fixture(); existing.mix.lanes.lead.effects = [{ id: 'delay' }, { id: 'reverb' }];
assert.equal(planTrackEffects(existing).applied.length, 0, 'existing inserts are not duplicated');
const combo = fixture(); combo.combo = { label: 'Hand tuned' };
assert.equal(planTrackEffects(combo).applied.length, 0);
const long = fixture(['hook'], 'simpleSawtooth', L('A4:16 . . . . . . . . . . . . . . .'));
assert.ok(planTrackEffects(long).applied.every(e => e.treatment !== 'echo'), 'sustained notes should not earn rhythmic echoes');
assert.equal(planTrackEffects(long).applied[0]?.treatment, 'lush', 'a simple held Adventurous lead can get chorus');
long.mix.voiceParams = { leadVoice: { ...clone(VOICES.simpleSawtooth), chorus: { mix: 0 } } };
assert.equal(planTrackEffects(long).applied[0]?.treatment, 'lush', 'zero internal chorus is not an already-wide sound');
const wide = fixture(['pad'], 'simpleSawtooth', L('A4:16 . . . . . . . . . . . . . . .'));
assert.equal(planTrackEffects(wide).applied[0]?.treatment, 'lush');

let pairs = 0; const treatments = new Set();
for (const style of BANGER_STYLES) for (const seed of [1, 7, 19]) {
  const off = generate('style', seed, { style: style.id });
  const omitted = generateBanger({ riff, options: { style: style.id }, seed });
  assert.deepEqual(off.mix, omitted.mix, 'legacy recipes retain their mix');
  for (const mode of ['subtle', 'adventurous', 'overhaul']) {
    const on = generate(mode, seed, { style: style.id });
    const again = generate(mode, seed, { style: style.id });
    assert.deepEqual(on.mix, again.mix); assert.deepEqual(on.trackEffects, again.trackEffects);
    assert.deepEqual(on.bank, off.bank, 'effects do not reshuffle notes');
    assert.deepEqual(on.mix.voice, off.mix.voice, 'effects do not reshuffle sounds');
    assert.deepEqual(on.arrangement, off.arrangement, 'transitions stay separate');
    assert.equal(on.trackEffects.mode, mode);
    assert.ok(on.trackEffects.applied.length <= (mode === 'subtle' ? 2 : mode === 'adventurous' ? 4 : 8));
    for (const e of on.trackEffects.applied) {
      treatments.add(e.treatment);
      assert.ok(!e.role.startsWith('riff:'));
      assert.ok(!['bass', 'kick', 'snare', 'sub'].includes(e.role));
    }
    pairs++;
  }
}
assert.ok(treatments.has('echo') && treatments.has('room') && treatments.has('lush') && treatments.has('upfront'));
const deskRiff = clone(riff);
deskRiff.parts[0].strip = { eq: { high: 2 }, effects: [{ id: 'exciter', bypass: true }], send: { delay: 0, reverb: 0 } };
for (const seed of [1, 7, 19, 40]) {
  const deskRoll = generateBanger({ riff: deskRiff, options: { style: 'trance', production: { mode: 'adventurous' } }, seed });
  assert.ok(deskRoll.trackEffects.applied.some(e => e.role === 'hook'), 'real desk source strips receive an Adventurous hook treatment');
  const hookLane = deskRoll.trackEffects.roles.find(e => e.role === 'hook').lane;
  assert.deepEqual(deskRoll.mix.lanes[hookLane].effects[0], deskRiff.parts[0].strip.effects[0]);
  assert.deepEqual(deskRoll.mix.lanes[hookLane].eq, deskRiff.parts[0].strip.eq);
}

const off = generate('style', 19); const on = generate('adventurous', 19);
assert.ok(on.trackEffects.applied.length);
const current = { ...clone(off), banger: clone(off.banger) };
for (const strip of Object.values(current.mix.lanes)) { strip.gain = -12; strip.pan = -0.25; strip.eq = { high: 2 }; }
const merged = modifyBanger({ current, next: on, base: off.banger.prints });
assert.ok(merged.ok && merged.report.production.length);
for (const e of on.trackEffects.applied) {
  const strip = merged.mix.lanes[e.lane];
  assert.equal(strip.gain, -12); assert.equal(strip.pan, -0.25); assert.deepEqual(strip.eq, { high: 2 });
  assert.deepEqual(strip.effects, on.mix.lanes[e.lane].effects);
}
assert.match(describeModify(merged.report), /Track Effects/);
const editedLane = on.trackEffects.applied[0].lane;
merged.mix.lanes[editedLane].effects = [{ id: 'filter', params: { frequency: 1234 } }];
const same = modifyBanger({ current: merged, next: on, base: on.banger.prints });
assert.deepEqual(same.mix.lanes[editedLane].effects, merged.mix.lanes[editedLane].effects, 'unchanged decisions retain hand edits');
const reverted = modifyBanger({ current: merged, next: off, base: on.banger.prints });
assert.deepEqual(reverted.mix.lanes[editedLane].effects, off.mix.lanes[editedLane].effects);
assert.ok(reverted.report.handEditedProduction.length);
const rerolled = generateBanger({ riff, options: on.banger.options, seed: on.banger.seed, rerolls: { production: 61 } });
assert.deepEqual(rerolled.bank, on.bank); assert.deepEqual(rerolled.mix.voice, on.mix.voice); assert.deepEqual(rerolled.arrangement, on.arrangement);
const old = clone(current); for (const p of Object.values(old.banger.prints.roles)) delete p.production;
assert.deepEqual(modifyBanger({ current: old, next: off, base: old.banger.prints }).mix, old.mix);

const notes = Array(16).fill(null); notes[0] = 2; notes[4] = 4; notes[8] = 3;
const recipe = { notes, mode: 'simple', style: 'trance', mood: 'dreamy', seed: 19, bpm: 138 };
assert.deepEqual(makeBanger(recipe).mix, makeBanger({ ...recipe, production: { mode: 'style', version: 1 } }).mix);
const save = { data: {}, persist() {} };
const kept = keepBanger({ ...recipe, production: { mode: 'adventurous', version: 1 } }, save);
assert.equal(kept.production.mode, 'adventurous');
const cached = songFor(kept);
assert.deepEqual(cached.mix, makeBanger(JSON.parse(JSON.stringify(kept))).mix);
reviseBanger(kept, { ...recipe, production: { mode: 'style', version: 1 } }, save);
assert.notEqual(songFor(kept), cached, 'changing production invalidates the cached song');
console.log(`BANGER PRODUCTION: passed (${pairs} seeded style/mode pairs; phrase rules, mixer parameters, legacy recipes, save/cache and modification)`);
