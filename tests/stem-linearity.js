// STEM LINEARITY: which group-bus processing stops a song's stems summing to its mix.
//
// tools/lib/stem-linearity.js, which tools/render-stems.js reads to explain a residual
// instead of printing a mysterious one (docs/group-buses-handover.md §7.1). Node only —
// the claim that a linear chain distributes over a sum is the engine's; this checks which
// chains the export calls linear, and which groups it holds to that.
import {
  LINEAR_EFFECTS, isLinearEffect, nonlinearGroupEffects, nonlinearGroupSummary,
} from '../tools/lib/stem-linearity.js';
import { EFFECTS } from '../src/engine/effects.js';

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const show = (found) => JSON.stringify(found.map(({ group, effect, where, members }) => ({ group, effect, where, members })));

// ---- The classification -------------------------------------------------------------

const LISTED = ['gain', 'peq', 'bell', 'vowel', 'filter', 'autofilter', 'delay', 'pingpong',
  'chandelay', 'chorus', 'chorus2', 'flanger', 'phaser', 'tremolo', 'vibrato', 'autopanner',
  'ringmod', 'widener', 'doubler', 'shifter', 'pitch', 'ambience', 'spring', 'reverb',
  'rhythmgate', 'stutter'];
const missing = LISTED.filter((id) => !LINEAR_EFFECTS.has(id));
assert(!missing.length, `every effect listed as linear is still an effect (${missing.join(', ') || 'none missing'})`);
const ids = new Set(EFFECTS.map((d) => d.id));
assert([...LINEAR_EFFECTS].every((id) => ids.has(id)), 'nothing counts as linear that is not in EFFECTS');

// Every effect is one or the other, on purpose: a new effect lands as NONLINEAR, and this
// fails until somebody decides which it is — the same discipline as the latency table.
const NONLINEAR = ['autowah', 'distortion', 'bitcrusher', 'tape', 'chebyshev', 'exciter',
  'compressor', 'noisegate', 'l7', 'msComp', 'mbCompN'];
const unclassified = EFFECTS.map((d) => d.id).filter((id) => !LINEAR_EFFECTS.has(id) && !NONLINEAR.includes(id));
assert(!unclassified.length, `every effect is classified (new: ${unclassified.join(', ') || 'none'})`);
assert(!LINEAR_EFFECTS.has('autowah'), 'Auto Wah is nonlinear: its envelope follows the input level');
assert(!isLinearEffect({ id: 'not-an-effect-yet' }), 'an unknown effect id counts as nonlinear');
assert(isLinearEffect({ id: 'vowel' }) && isLinearEffect({ id: 'vowel', params: { excite: 0 } })
  && !isLinearEffect({ id: 'vowel', params: { excite: 0.3 } }),
  'the Vowel Filter is linear until EXCITE drives its waveshaper');

// ---- Which groups the export holds to it ----------------------------------------------

const comp = { id: 'compressor', params: { threshold: -24, ratio: 4 } };
const drumsMix = (extra = {}) => ({
  lanes: { kick: { group: 'group1' }, snare: { group: 'group1' }, bass: {}, ...extra.lanes },
  groups: { group1: { effects: [comp] }, ...extra.groups },
  ...(extra.off ? { off: extra.off } : {}),
});
const stems = ['kick', 'snare', 'bass', 'lead'];

let found = nonlinearGroupEffects(drumsMix(), null, stems);
assert(found.length === 1 && found[0].group === 'group1' && found[0].effect === 'compressor'
  && found[0].where === 'insert' && found[0].members.join() === 'kick,snare',
  `a group compressor across kick + snare is one finding, Group 1 / compressor (${show(found)})`);
const summary = nonlinearGroupSummary(found);
assert(summary.length === 1 && summary[0].name === 'Group 1' && summary[0].effects.join() === 'Compressor'
  && summary[0].members.length === 2,
  `and it prints as "Group 1 runs Compressor across 2 stems" (${JSON.stringify(summary)})`);
assert(nonlinearGroupEffects(drumsMix(), null, new Set(stems)).length === 1, 'the stem lanes may be a Set');

found = nonlinearGroupEffects(drumsMix({ groups: { group1: { effects: [{ ...comp, bypass: true }] } } }), null, stems);
assert(!found.length, `a bypassed compressor is no finding (${show(found)})`);
found = nonlinearGroupEffects(drumsMix({ groups: { group1: { effects: [{ ...comp, mute: true }] } } }), null, stems);
assert(!found.length, `a muted compressor passes only the dry signal, so is no finding (${show(found)})`);

found = nonlinearGroupEffects(drumsMix({ groups: { group1: { effects: [
  { id: 'peq', params: {} }, { id: 'reverb', params: { wet: 0.3 } }, { id: 'delay', params: {} },
  { id: 'gain', params: { gain: -3 } }, { id: 'vowel', params: { excite: 0 } },
] } } }), null, stems);
assert(!found.length, `only linear effects on a group is no finding (${show(found)})`);

found = nonlinearGroupEffects(drumsMix({
  lanes: { lead: {}, lead2: { group: 'group3' }, pad: { group: 'group3' } },
  groups: { group3: { effects: [{ id: 'distortion', params: {} }] } },
}), null, stems);
assert(found.length === 1 && found[0].group === 'group1',
  `a nonlinear group whose members are not among the stems is no finding (${show(found)})`);

found = nonlinearGroupEffects(drumsMix({ lanes: { snare: {} } }), null, stems);
assert(!found.length,
  `a group with ONE stem in it is no finding: alone in its stem or alone in the group, same input (${show(found)})`);

found = nonlinearGroupEffects(drumsMix({ off: ['snare'] }), null, stems);
assert(!found.length, `a deleted (off) member does not count (${show(found)})`);
found = nonlinearGroupEffects(drumsMix({ lanes: { hats: { group: 'group1' } }, off: ['snare'] }), null, [...stems, 'hats']);
assert(found.length === 1 && found[0].members.join() === 'kick,hats',
  `and is left out of the members it is counted against (${show(found)})`);

found = nonlinearGroupEffects(drumsMix({ lanes: { snare: { group: 'group1', mute: true } } }), null, stems);
assert(!found.length, `a muted member is silent in its stem and the mix alike, so does not count (${show(found)})`);
found = nonlinearGroupEffects(drumsMix({ groups: { group1: { mute: true, effects: [comp] } } }), null, stems);
assert(!found.length, `a muted group is no finding (${show(found)})`);

// Spot FX: the group's sections on the arrangement, under `__group:<id>`.
const leadsMix = {
  lanes: { lead: { group: 'group2' }, lead2: { group: 'group2' }, kick: {} },
  groups: { group2: { effects: [{ id: 'chorus', params: {} }] } },
};
const dist = { id: 'distortion', params: { distortion: 0.4 } };
const arrangement = { automation: { '__group:group2': { fx: [
  { from: [8, 0], to: [9, 0], chain: [{ id: 'filter', params: {} }, dist] },
  { from: [12, 0], to: [13, 0], chain: [dist] },
] } } };
found = nonlinearGroupEffects(leadsMix, arrangement, ['lead', 'lead2', 'kick']);
assert(found.length === 2 && found.every((f) => f.group === 'group2' && f.effect === 'distortion' && f.where === 'Spot FX'),
  `a distortion in a __group:group2 Spot FX section is found, where 'Spot FX' (${show(found)})`);
const s2 = nonlinearGroupSummary(found);
assert(s2.length === 1 && s2[0].name === 'Group 2' && s2[0].effects.join() === 'Distortion (Spot FX)',
  `two sections with the same distortion print as one name (${JSON.stringify(s2)})`);
assert(!nonlinearGroupEffects(leadsMix, null, ['lead', 'lead2', 'kick']).length,
  'with no arrangement only the inserts are checked');
found = nonlinearGroupEffects({ ...leadsMix, lanes: { ...leadsMix.lanes, lead2: {} } }, arrangement, ['lead', 'lead2', 'kick']);
assert(!found.length, `a Spot FX distortion over one member is no finding (${show(found)})`);

const both = nonlinearGroupEffects({
  lanes: { ...drumsMix().lanes, ...leadsMix.lanes, kick: { group: 'group1' } },
  groups: { ...drumsMix().groups, ...leadsMix.groups },
}, arrangement, ['kick', 'snare', 'lead', 'lead2']);
assert(nonlinearGroupSummary(both).map((g) => g.name).join() === 'Group 1,Group 2',
  'two groups report in their fixed order, one line each');

assert(!nonlinearGroupEffects(null, null, stems).length && !nonlinearGroupEffects({}, {}, []).length,
  'a song with no mix, or no groups, has nothing to say');

if (failed) { console.error('STEM LINEARITY: FAILED'); process.exit(1); }
console.log('STEM LINEARITY: PASSED');
