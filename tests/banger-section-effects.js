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
assert.equal(wildOptions.sectionFx.mode, 'off', 'selecting Wild preserves the independent Spot FX control');
assert.equal(wildOptions.sectionFx.firstEffect, 'pingpong', 'Wild preserves explicit section rules');
assert.equal(manualOptions.sectionFx.mode, 'off', 'variation choice does not mutate its input');
assert.equal(normaliseBangerOptions({ ...wildOptions, sectionFx: { ...wildOptions.sectionFx, mode: 'off' } }).options.sectionFx.mode,
  'off', 'Section FX can be disabled afterward while variation stays Wild');
assert.equal(deskBangerVariation(manualOptions, 'some').sectionFx.mode, 'off', 'other variation choices retain the independent Section FX choice');
assert.equal(deskBangerVariation(goCrazyBangerOptions(manualOptions), 'wild').sectionFx.mode, 'off', 'the desk Go Crazy action preserves the Spot FX control');

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

for (const mode of ['subtle', 'expressive', 'wild']) {
  const normalized = normaliseBangerOptions({ sectionFx: { mode } });
  assert.equal(normalized.options.sectionFx.mode, mode);
  const first = applySectionEffects(fixture({ mode, firstEffect: 'none' }));
  const second = applySectionEffects(fixture({ mode, firstEffect: 'none' }));
  assert.deepEqual(first, second, 'section intensity is deterministic');
  assert.ok(first.report.decisions.some(d => d.status === 'Applied'));
}

// The Trance policy covers a musical job in each region, under the same intensity
// setting used by the desk and Voltage. Existing send ambience reduces the extra layer.
const tranceFixture = fixture({ mode: 'expressive', firstEffect: 'none' });
tranceFixture.style = { id: 'trance' };
tranceFixture.form = [{ role: 'intro', from: 1, to: 4 }, { role: 'build', from: 5, to: 8 }, { role: 'breakdown', from: 9, to: 12 }];
tranceFixture.laneOf.set('pad', 'pad');
tranceFixture.mix.lanes.pad = { send: { reverb: 0.6 } };
tranceFixture.mix.lanes.lead2.send = { delay: 0.3 };
tranceFixture.bars.forEach(b => { b.pad = L('A4 - - - - - - - - - - - - - - -'); });
const tranceResult = applySectionEffects(tranceFixture);
assert.equal(tranceResult.report.decisions.filter(d => d.status === 'Applied').length, 3);
const echo = laneFx(tranceResult.automation, 'lead2').find(s => s.chain[0].id === 'delay');
assert.equal(echo.chain[0].params.division, 0.75);
assert.ok(echo.chain[0].params.wet < 0.08, 'existing send and busy arp restrain the extra echo');
const sweep = laneFx(tranceResult.automation, 'lead2').find(s => s.chain[0].id === 'filter');
assert.equal(sweep.from, 64); assert.equal(sweep.to, 128);
assert.equal(sweep.chain[0].params.sweep, 1);
assert.ok(sweep.chain[0].params.sweepTo > sweep.chain[0].params.frequency);
const space = laneFx(tranceResult.automation, 'pad')[0];
assert.equal(space.from, 128); assert.equal(space.to, 192);
assert.ok(space.chain[0].params.decay > 2);
assert.ok(space.chain[0].params.wet < 0.07);
assert.deepEqual(tranceResult, applySectionEffects(tranceFixture), 'Trance region choices regenerate exactly');
const manualTrance = structuredClone(tranceFixture);
manualTrance.options.sectionFx.mode = 'off';
assert.equal(applySectionEffects(manualTrance).report.decisions.length, 0);
console.log('TRANCE SECTION FX: passed (dotted echo, build sweep, breakdown space, send balance and determinism)');

const { styleSectionRequests, colourSectionChain } = await import('../tools/lib/banger/section-style-fx.js');
const regions = ['intro', 'build', 'drop', 'breakdown', 'build', 'drop', 'verse', 'outro']
  .map((role, i) => ({ role, from: i * 4 + 1, to: (i + 1) * 4 }));
const regional = id => styleSectionRequests({ id, form: regions, kindOf: f => f.role,
  start: f => (f.from - 1) * 16, end: f => f.to * 16, active: () => true, mode: 'expressive', wetScale: 0.85 });
for (const id of ['big-room', 'future-bass', 'chipstep', 'downtempo', 'nu-disco']) {
  const requests = regional(id);
  assert.ok(requests.length >= 3, `${id} supplies musical region treatments`);
  assert.deepEqual(requests, regional(id));
  for (const request of requests) {
    assert.ok(request.a >= (request.f.from - 1) * 16 && request.z <= request.f.to * 16 && request.z > request.a);
    for (const effect of request.chain) {
      assert.ok(EFFECT_BY_ID[effect.id]);
      assert.ok(Object.keys(effect.params).every(k => EFFECT_BY_ID[effect.id].params.includes(k)));
    }
  }
  if (['big-room', 'chipstep'].includes(id)) {
    assert.ok(requests.every(r => r.f.role === 'build'), 'transition treatments leave drop downbeats clear');
    assert.ok(requests.filter(r => r.chain[0].id === 'stutter').every(r => r.z - r.a === 4), 'repeats occupy only the last beat');
  }
}
const future = regional('future-bass');
assert.equal(future.filter(r => r.chain[0].id === 'rhythmgate').length, 1);
assert.equal(future.find(r => r.chain[0].id === 'rhythmgate').f.from, 17, 'gate leads into the second drop');
assert.ok(future.some(r => r.f.role === 'breakdown' && r.chain[0].id === 'chorus2'));
const opening = regional('big-room')[0].chain;
assert.ok(colourSectionChain(structuredClone(opening), 'dark')[0].params.sweepTo
  < colourSectionChain(structuredClone(opening), 'euphoric')[0].params.sweepTo);
const room = [{ id: 'reverb', params: { decay: 1, wet: 0.1 } }];
assert.ok(colourSectionChain(room, 'dreamy')[0].params.decay > 1);
for (const style of ['big-room', 'future-bass', 'chipstep', 'downtempo', 'nu-disco']) {
  const settings = { riff, seed: 19, options: { style, sectionFx: { mode: 'expressive' } } };
  const song = generateBanger(settings);
  assert.deepEqual(song.arrangement, generateBanger(settings).arrangement);
  assert.ok(song.banger.sectionEffects.decisions.some(d => d.status === 'Applied'), `${style} applies effects in a generated song`);
}
console.log('STYLE SECTION FX: passed (five styles, boundaries, second-drop gate, moods and generated songs)');

const { limitSectionEchoes } = await import('../tools/lib/banger/section-style-fx.js');
for (const [mode, budget] of Object.entries({ subtle: 0.14, expressive: 0.2, wild: 0.25 })) {
  for (const busy of [false, true]) for (const send of [0, 0.3, 0.8]) {
    const chain = [{ id: 'delay', params: { wet: 0.4, feedback: 0.7 } },
      { id: 'pingpong', params: { wet: 0.4, feedback: 0.4 } }];
    limitSectionEchoes(chain, { mode, busy, send });
    const total = chain.reduce((sum, e) => sum + Math.tan(e.params.wet * Math.PI / 2) / (1 - e.params.feedback), 0);
    assert.ok(total <= budget * (busy ? 0.65 : 1) / (1 + 2 * send) + 1e-12);
    assert.ok(chain.every(e => e.params.feedback <= 0.28));
  }
}
for (const style of ['trance', 'future-bass', 'downtempo', 'nu-disco', 'synthwave']) {
  for (const mood of ['dreamy', 'dark', 'euphoric']) {
    const song = generateBanger({ riff, seed: 19, options: { style, mood, sectionFx: { mode: 'wild' } } });
    for (const d of song.banger.sectionEffects.decisions.filter(d => d.status === 'Applied' && d.origin === 'Automatic')) {
      for (const e of d.chain.filter(e => ['delay', 'pingpong'].includes(e.id))) {
        assert.ok(e.params.feedback <= 0.28);
        assert.ok(Math.tan(e.params.wet * Math.PI / 2) / (1 - e.params.feedback) <= 0.25 + 1e-12,
          `${style}/${mood} stays within the echo budget after mood and Voltage scaling`);
      }
    }
  }
}
console.log('SPOT ECHO LEVELS: passed (feedback tails, busy phrases, existing sends and mood scaling)');

const { chooseSectionRequests } = await import('../tools/lib/banger/section-style-fx.js');
const candidates = regional('future-bass');
const chosen = seed => chooseSectionRequests(candidates, 2, new Rng(seed));
assert.deepEqual(chosen(12), chosen(12), 'same seed keeps the exact region choices and strengths');
const placements = new Set(Array.from({ length: 20 }, (_, seed) => JSON.stringify(chosen(seed).map(r => [r.treatment, r.a]))));
assert.ok(placements.size > 3, 'fresh seeds vary the selected treatments and region occurrences');
for (let seed = 0; seed < 20; seed++) {
  const selection = chosen(seed);
  assert.equal(selection.length, 2);
  assert.equal(new Set(selection.map(r => r.treatment)).size, 2);
  assert.ok(selection.every(r => r.wetScale >= 0.85 * 0.8 && r.wetScale <= 0.85));
}
console.log('SPOT FX RANDOMNESS: passed (varied moments, bounded strength and exact replay)');
