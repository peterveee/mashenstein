import assert from 'node:assert/strict';
import { applySectionEffects, captureSectionEffects } from '../tools/lib/banger/section-effects.js';
import { generateBanger, modifyBanger, describeModify } from '../tools/lib/banger/index.js';
import { styleFromBanger } from '../tools/lib/banger-seeds.js';
import { laneFx, posOf } from '../src/data/automation.js';
import { EFFECT_BY_ID } from '../src/engine/effects.js';
import { L } from '../tools/lib/banger/theory.js';
import { Rng } from '../src/engine/rng.js';
import { bangerReportHtml } from '../tools/mixer-banger-report.js';
import { deskBangerVariation } from '../tools/mixer-banger.js';
import { normaliseBangerOptions, goCrazyBangerOptions } from '../tools/lib/banger/options.js';

const manualOptions = normaliseBangerOptions({ sectionFx: { mode: 'off', firstEffect: 'pingpong', firstSection: 'intro' } }).options;
const wildOptions = deskBangerVariation(manualOptions, 'wild');
assert.equal(wildOptions.sectionFx.mode, 'auto', 'selecting Wild enables automatic section treatments');
assert.equal(wildOptions.sectionFx.firstEffect, 'pingpong', 'Wild preserves explicit section rules');
assert.equal(manualOptions.sectionFx.mode, 'off', 'variation choice does not mutate its input');
assert.equal(normaliseBangerOptions({ ...wildOptions, sectionFx: { ...wildOptions.sectionFx, mode: 'off' } }).options.sectionFx.mode,
  'off', 'Section FX can be disabled afterward while variation stays Wild');
assert.equal(deskBangerVariation(manualOptions, 'some').sectionFx.mode, 'off', 'other variation choices retain the independent Section FX choice');
assert.equal(deskBangerVariation(goCrazyBangerOptions(manualOptions), 'wild').sectionFx.mode, 'auto', 'the desk Go Crazy action enables Section FX too');

const dense = 'A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5';
const form = [{ role: 'intro', from: 1, to: 4 }, { role: 'drop', from: 5, to: 12 }];
const fixture = (settings = {}) => ({ options: { sectionFx: { mode: 'off', firstEffect: 'stack', firstPart: 'arp', firstSection: 'drop', ...settings } },
  style: {}, form, bars: Array.from({ length: 12 }, () => ({ arp: L(dense), hook: L(dense) })),
  laneOf: new Map([['hook', 'lead'], ['arp', 'lead2']]),
  mix: { lanes: { lead: {}, lead2: {} }, voice: { leadVoice: 'synthPluck', lead2Voice: 'synthPluck' } }, bpm: 120, rng: new Rng(42) });
const x = fixture(); const out = applySectionEffects(x);
const fx = laneFx(out.automation, 'lead2');
assert.equal(fx.length, 1);
assert.equal(fx[0].from, posOf(5, 0)); assert.equal(fx[0].to, posOf(13, 0));
assert.equal(fx[0].chain[0].id, 'pingpong');
assert.equal(fx[0].chain[0].params.division, 0.75, 'a three-sixteenth echo overlaps different pitches in a four-note arp');
assert.equal(fx[0].chain[0].params.wet, 0.22, 'density trims wet level instead of rejecting the phrase');
for (const e of fx[0].chain) assert.ok(Object.keys(e.params).every(k => EFFECT_BY_ID[e.id].params.includes(k)));
assert.ok(out.report.decisions[0].reason.includes('busy'));
assert.equal(x.automation, undefined, 'planner input is untouched');
for (const [range, a, z] of [['first', 5, 9], ['second', 9, 13], ['last2', 11, 13]]) {
  const result = applySectionEffects(fixture({ firstRange: range }));
  assert.equal(laneFx(result.automation, 'lead2')[0].from, posOf(a, 0));
  assert.equal(laneFx(result.automation, 'lead2')[0].to, posOf(z, 0));
}
const overlap = fixture(); overlap.automation = { lead2: { cuts: [[12, 15]], points: [[1, 0, 0]], fx: [
  { from: [7, 0], to: [9, 0], chain: [{ id: 'filter', params: { frequency: 800 } }, { id: 'delay', params: { wet: 0.5 } }] },
] } };
const merged = applySectionEffects(overlap);
assert.equal(laneFx(merged.automation, 'lead2').length, 3);
const middle = laneFx(merged.automation, 'lead2')[1];
assert.deepEqual(middle.chain.map(e => e.id), ['filter', 'pingpong', 'gain'], 'filter survives and a second delay is not stacked');
assert.deepEqual(merged.automation.lead2.cuts, overlap.automation.lead2.cuts);
assert.deepEqual(merged.automation.lead2.points, overlap.automation.lead2.points);

const seed = { bank: { order: [] }, banger: { style: 'trance', laneOf: { arp: 'lead2' }, form }, mix: {},
  arrangement: { automation: { lead2: { fx: [{ from: [9, 0], to: [13, 0], chain: fx[0].chain }] } } } };
const captured = captureSectionEffects(seed);
assert.equal(captured.rules[0].from, 0.5);
assert.equal(captured.rules[0].to, 1);
assert.deepEqual(styleFromBanger(seed).channels.sectionFx, captured, 'Use as Style and Save as Combo capture the templates');
const inlineSeed = structuredClone(seed);
inlineSeed.arrangement = { order: [{ s: 0, bars: 12, inlineFx: { lead2: [{ id: 'pingpong', params: { sync: 1, division: 1, wet: 0.2 } }] } }] };
assert.ok(captureSectionEffects(inlineSeed).rules.length, 'legacy inline snapshots become style presets too');
const rescaled = fixture({ mode: 'style', firstEffect: 'none' });
rescaled.style.sectionFx = captured;
rescaled.form = [{ role: 'drop', from: 1, to: 4 }, { role: 'drop2', from: 5, to: 8 }];
const restored = applySectionEffects(rescaled);
assert.deepEqual(laneFx(restored.automation, 'lead2').map(s => [s.from, s.to]), [[32, 64], [96, 128]], 'relative second halves follow resized and repeated drops');
rescaled.options.sectionFx = { mode: 'style', firstEffect: 'room', firstPart: 'arp', firstSection: 'drop' };
const manual = applySectionEffects(rescaled);
assert.ok(laneFx(manual.automation, 'lead2').some(s => s.chain.some(e => e.id === 'reverb')));
rescaled.options.sectionFx.firstEffect = 'pingpong';
assert.ok(applySectionEffects(rescaled).report.decisions.some(e => e.status === 'Overridden'), 'manual echo precedence is visible in the report');
const silent = fixture(); silent.bars = silent.bars.map(() => ({}));
assert.equal(applySectionEffects(silent).report.decisions[0].status, 'Skipped');
const absent = applySectionEffects(fixture({ firstSection: 'verse' }));
assert.match(absent.report.decisions[0].reason, /No matching section/);
const auto = fixture({ mode: 'auto', firstEffect: 'none' });
const automatic = applySectionEffects(auto);
assert.ok(automatic.report.decisions.some(e => e.status === 'Applied'), 'busy phrases are eligible for automatic echo');
assert.deepEqual(automatic, applySectionEffects({ ...auto, rng: new Rng(42) }));

const riff = { version: 1, source: { id: 'section-test', title: 'ARP', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Arp lead', kind: 'melodic', role: 'hook', meanPitch: 72, voice: 'synthPluck', voiceParams: null, engineKeys: null, strip: null, bars: [dense, dense] }] };
const make = sectionFx => generateBanger({ riff, seed: 19, options: { style: 'trance', sectionFx } });
const before = make({ mode: 'off' });
const after = make({ mode: 'off', firstEffect: 'stack', firstPart: 'hook', firstSection: 'drop' });
assert.deepEqual(before.bank, after.bank); assert.deepEqual(before.mix, after.mix);
assert.notDeepEqual(before.arrangement, after.arrangement);
assert.deepEqual(after, make(after.banger.options.sectionFx));
const modified = modifyBanger({ current: before, next: after, base: before.banger.prints });
assert.ok(modified.ok); assert.deepEqual(modified.arrangement.automation, after.arrangement.automation);
assert.match(describeModify(modified.report), /Spot FX/);
assert.ok(bangerReportHtml({ banger: after.banger }, after.mix).includes('Section FX'));
const lane = after.banger.laneOf.hook;
modified.arrangement.automation[lane].cuts = [[2, 0]];
const untouched = modifyBanger({ current: modified, next: after, base: after.banger.prints });
assert.deepEqual(untouched.arrangement.automation[lane], modified.arrangement.automation[lane], 'unchanged decision preserves manual automation');
const removed = modifyBanger({ current: modified, next: before, base: after.banger.prints });
assert.ok(removed.report.handEditedSectionFx.length, 'replacing edited automation is reported');
console.log('BANGER SECTION FX: passed (busy echoes, placement, inheritance, overlaps, deterministic generation and modification)');
