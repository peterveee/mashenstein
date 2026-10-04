import assert from 'node:assert/strict';
import { generateBanger, modifyBanger } from '../tools/lib/banger/index.js';
import { normaliseBangerOptions, keepStructure } from '../tools/lib/banger/options.js';
import { buildForm, identifySections } from '../tools/lib/banger/form.js';
import * as edit from '../tools/lib/banger/form-edit.js';
import { expandSectionRules, sectionEffectPreset, sectionEffectRange, applySectionEffects } from '../tools/lib/banger/section-effects.js';
import { laneFx, posOf } from '../src/data/automation.js';
import { L } from '../tools/lib/banger/theory.js';
import { Rng } from '../src/engine/rng.js';
import { styleFor } from '../tools/lib/banger/styles/index.js';
const phrase = 'A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5';
const riff = { version: 1, source: { id: 'section-test', title: 'ARP', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Arp lead', kind: 'melodic', role: 'hook', meanPitch: 72, voice: 'synthPluck', voiceParams: null, engineKeys: null, strip: null, bars: [phrase, phrase] }] };
const make = options => generateBanger({ riff, seed: 19, options: { style: 'trance', form: { template: 'club' }, ...options } });
const base = make({ sectionFx: { mode: 'off' } });
const drops = base.form.filter(f => f.type === 'drop');
assert.ok(drops.length > 1);
const f = drops[0];
const row = { part: 'hook', range: 'whole', enabled: true, presetId: 'generic:pingpong', chain: sectionEffectPreset('pingpong') };
row.chain[0].params.wet = .37;
const assignments = { [f.id]: [row] };
const after = make({ sectionFx: { mode: 'off', assignments } });
assert.deepEqual(after.bank, base.bank);
assert.deepEqual(after.mix, base.mix);
assert.deepEqual(after.form, base.form);
assert.equal(after.banger.options.form.sections, null, 'effects do not create a drawn form');
const fx = laneFx(after.arrangement.automation, after.banger.laneOf.hook).filter(s => s.chain.some(e=>e.id==='pingpong'));
assert.equal(fx[0].from, posOf(f.from, 0));
assert.equal(fx.at(-1).to, posOf(f.to+1, 0));
assert.equal(fx[0].chain[0].params.wet, .37);
assert.equal(after.banger.sectionEffects.decisions[0].sectionId, f.id);
assert.deepEqual(after.banger.sectionEffects.decisions[0].chain, row.chain);
assert.ok(!fx.some(x => x.from >= posOf(drops[1].from, 0)), 'other Drop has no explicit echo');
const reopened = make(JSON.parse(JSON.stringify(after.banger.options)));
assert.deepEqual(reopened, after);
assert.equal(generateBanger({ riff, seed: 23, options: after.banger.options }).banger.options.sectionFx.assignments[f.id][0].chain[0].params.wet, .37, 'Another Take retains assignment');
for (const range of ['first', 'second', 'last2']) {
  const [a, z] = sectionEffectRange(f, range);
  const partial = make({ sectionFx: { mode: 'off', assignments: { [f.id]: [{ ...row, range }] } } });
  const actual = laneFx(partial.arrangement.automation, after.banger.laneOf.hook).find(s => s.chain.some(e=>e.id==='pingpong'));
  assert.equal(actual.from, a); assert.deepEqual(partial.banger.sectionEffects.decisions[0].to, [(z / 16) + 1, 0]);
}
const disabled = make({ sectionFx: { mode: 'off', assignments: { [f.id]: [{ ...row, enabled: false }] } } });
assert.equal(disabled.banger.sectionEffects.decisions[0].status, 'Disabled');
const silent = make({ sectionFx: { mode: 'off', assignments: { [f.id]: [{ ...row, part: 'choir' }] } } });
assert.match(silent.banger.sectionEffects.decisions[0].reason, /absent or silent/);
const legacy = { mode: 'off', firstEffect: 'pingpong', firstPart: 'hook', firstSection: 'drop', firstRange: 'whole', secondEffect: 'echo', secondPart: 'hook', secondSection: 'drop', secondRange: 'second' };
const migrated = expandSectionRules(legacy, base.form);
assert.equal(migrated[f.id].length, 2);
const old = make({ sectionFx: legacy });
const newRecipe = make({ sectionFx: { mode: 'off', assignments: migrated } });
assert.deepEqual(newRecipe.bank, old.bank);
assert.deepEqual(newRecipe.arrangement, old.arrangement, 'legacy rule precedence and density treatment preserved');
const list = edit.fromForm(base.form, true);
const idx = list.findIndex(x => x.id === f.id);
const moved = edit.moveSection(list, idx, 0);
const changed = edit.setSection(edit.resizeSection(moved, 0, 4), 0, { label: 'Echo solo' });
assert.equal(changed[0].id, f.id);
assert.equal(edit.setSection(changed, 0, { type: 'chorus' })[0].id, f.id);
const structural = make({ form: { template: 'club', sections: changed }, sectionFx: { mode: 'off', assignments } });
const structuralFx = structural.banger.sectionEffects.decisions.find(x => x.sectionId === f.id);
assert.equal(structuralFx.section, 'Echo solo');
assert.deepEqual(structuralFx.from, [1, 0]);
assert.deepEqual(structuralFx.to, [changed[0].bars + 1, 0]);
assert.deepEqual(keepStructure(after.banger.options, base.banger.options).sectionFx.assignments, assignments);
const hand = structuredClone(base); hand.arrangement.automation = { [after.banger.laneOf.hook]: { fx: [{ from: [f.from,0], to: [f.to+1,0], chain: [{id:'filter',params:{frequency:700}}] }] } };
const modified = modifyBanger({ current: hand, next: after, base: base.banger.prints });
assert.ok(modified.report.handEditedSectionFx.length);
assert.equal(laneFx(modified.arrangement.automation, after.banger.laneOf.hook)[0].chain[0].id, 'pingpong');
const invalid = normaliseBangerOptions({ sectionFx: { assignments: { x: [{ ...row, chain: Array(7).fill(row.chain[0]) }] } } });
assert.ok(invalid.issues.length);
const snap = normaliseBangerOptions({ sectionFx: { assignments } }).options.sectionFx.assignments;
row.chain[0].params.wet = .8;
assert.equal(snap[f.id][0].chain[0].params.wet, .37, 'recipe copies settings');
const opts = normaliseBangerOptions({ style:'trance', form:{template:'anthem'} }).options;
assert.ok(buildForm(opts,64,styleFor('trance')).every(x => x.id.startsWith('anthem:')));
assert.equal(new Set(identifySections(base.form).map(x=>x.id)).size, base.form.length);
const fixture = {
  options:{sectionFx:{mode:'style',assignments:{block:[{...row,chain:sectionEffectPreset('pingpong')}]}}},
  form:[{id:'block',type:'drop',role:'drop',label:'Only drop',from:1,to:4}],
  bars:Array.from({length:4},()=>({hook:L(phrase)})), laneOf:new Map([['hook','lead']]),
  mix:{lanes:{lead:{}},voice:{leadVoice:'synthPluck'}},bpm:120,rng:new Rng(42),
  style:{sectionFx:{version:1,rules:[{role:'hook',section:'drop',from:0,to:1,chain:[{id:'filter',params:{type:'lowpass',frequency:800}},{id:'delay',params:{wet:.5}}]}]}}
};
const precedence = applySectionEffects(fixture);
assert.deepEqual(laneFx(precedence.automation,'lead')[0].chain.map(e=>e.id),['filter','pingpong','gain']);
assert.match(precedence.report.decisions[0].reason,/overridden/);
assert.equal(precedence.report.decisions[0].status,'Applied','unrelated inherited filter still plays');
const fullChain = ['filter','tremolo','autopanner','phaser','distortion','chorus2'].map(id=>({id,params:{}}));
const originalAutomation={lead:{points:[[1,0,0]],cuts:[[3,15]],fx:[{from:[1,0],to:[5,0],chain:fullChain}]}};
const limited = applySectionEffects({...fixture,style:{},automation:originalAutomation});
assert.deepEqual(limited.automation,originalAutomation,'chain limit keeps unrelated automation intact');
assert.equal(limited.report.decisions[0].status,'Skipped');
assert.match(limited.report.decisions[0].skips[0].reason,/exceeds 6/);
assert.equal(normaliseBangerOptions({sectionFx:{assignments:{block:[{...row,chain:[{id:'filter',params:{type:'lowpass',frequency:900}}]}]}}}).issues.length,0);
console.log('SECTION ASSIGNMENTS: passed (independent blocks, snapshots, ranges, legacy, structure, recipes and Modify)');
