/**
 * KEY MODE is a three-way musical control, not a boolean with a glide side effect.
 * Keep this browserless: the renderer suites cover the audio graph, while this pins the
 * saved vocabulary and the two distinct envelope paths in the source.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { panelSpec } from '../tools/mixer-voice-editor.js';

const row = panelSpec({ synth: 'MonoSynth' }).common.rows.find((r) => r.path === '$mode');
assert(row, 'the synth note card exposes KEY MODE');
assert.deepEqual(row.options, ['poly', 'legato', 'mono'],
  'KEY MODE offers POLY, LEGATO and MONO in that order');
assert.equal(panelSpec({ synth: 'MonoSynth' }).pillLabels.legato, 'LEGATO',
  'the LEGATO pill spells out the full mode name');

const mrdrRows = panelSpec({ synth: 'MRDR-3', layer: { osc1: { unison: 1 } } }).common.rows;
const rowFor = (path) => mrdrRows.find((r) => r.path === path);
assert.equal(rowFor('$vibrato.delay').when({ synth: 'MRDR-3', vibrato: { depth: 1 } }), true,
  'native vibrato delay follows the vibrato depth switch');
assert.equal(rowFor('$vibrato.spread').when({
  synth: 'MRDR-3', layer: { osc1: { unison: 1 } }, vibrato: { depth: 1 },
}), false, 'spread stays hidden when there is only one unison voice');
assert.equal(rowFor('$vibrato.spread').when({
  synth: 'MRDR-3', layer: { osc1: { unison: 2 } }, vibrato: { depth: 1 },
}), true, 'spread appears when unison gives it voices to separate');
assert.equal(row.read({ mono: true }), 'mono', 'old boolean presets still open as MONO');

const source = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');
assert(source.includes("const legato = mode === 'legato';"),
  'the engine has a distinct LEGATO path');
assert(source.includes("if (mode === 'mono' && prev && prev.stopAt > time)"),
  'MONO still chokes an overlapping old note');
assert(source.includes('slot.activeUntil') && source.includes('slot.synth.setNote'),
  'LEGATO keeps the pooled envelope and retargets its pitch');
assert(source.includes('_retargetLayerLegato'),
  'MRDR-3 has a native legato handoff rather than stacking a second note');

// GLIDE is FINGERED, and the same sentence on both paths that have one: a note slides
// only when it starts while the previous note is still GATED. Pinned in the source
// because the alternative — an ungated glide origin — is silent and sounds almost right:
// MRDR-3 used to slide in from whatever the lane last played, bars of rest ago, and from
// the far side of a loop wrap or a seek.
assert(source.includes('const gated = mono && (slot.activeUntil || 0) > t;')
  && source.includes('slot.synth.portamento = overlap ? glide : 0;'),
  'the pooled path offers a glide only across an overlapping note');
assert(source.includes('const gated = !!prev && prev.gateUntil > time;')
  && source.includes('const glideFrom = overlap && glideTime(v) > 0 ? prev.freq : null;'),
  'and MRDR-3 tests the same overlap rather than gliding from any past note');
assert(source.includes('entry.slot.gateKey === noteKey')
  && source.includes('record.gateKey === noteKey'),
  'and a key coming up closes the gate, so a held note cannot glide into one played later');

// A FINGER IS NOT A LENGTH. A held note's gate outlasts the nominal length it was
// scheduled with, on both paths — reading only the sequencer's gate cost the keyboard its
// glide a fifth of a second into every key press. Two facts, both spelled out.
assert(source.includes('const fingered = mono && slot.gateKey != null;')
  && source.includes('const fingered = !!prev && prev.gateKey != null;')
  && (source.match(/const overlap = gated \|\| fingered;/g) || []).length === 2,
  'a key still down counts as overlap on both paths, not just the sequencer gate');
// And the retarget must not re-arm a release on a note nobody has let go of: stopping its
// sources at the nominal length is what made LEGATO on the keyboard cut out mid-key.
assert(/if \(hold\) \{\s*\n\s*prev\.freq = base;\s*\n\s*prev\.gateUntil = Infinity;\s*\n\s*prev\.stopAt = Infinity;\s*\n\s*return;/.test(source),
  'a held legato handover moves the pitch and nothing else — no release, no source stop');
assert(source.includes('_retargetLayerLegato(prev, f * shift * vary((v.humanize || {}).pitch, time, 16), time, noteDur, v, hold);')
  && source.includes('if (hold) this._rekeyHeldNote(prev, `${laneKey}|${f.toFixed(2)}`);'),
  'and the note-off passes to the key that took the gate — last note priority');
// The pooled legato branch stays on the sequencer's gate for the opposite reason: it
// schedules a release, which must never land on a key that is still down.
assert(source.includes('} else if (legato && gated) {'),
  'the pooled legato retarget is gated, never fingered');
assert(source.includes('for (const { param, level, tail = 0, fade = 0.004 } of prev.gates || [])')
  && source.includes('legatoGates.push({ param: g.gain, level: lvl, tail, fade: 0.004 });'),
  'MRDR-3 carries THROUGH layer gates to the active legato note end');



console.log('KEY MODE: PASSED');
