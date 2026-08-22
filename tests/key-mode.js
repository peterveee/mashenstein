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
assert(source.includes('slot.gateKey === noteKey')
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
assert(source.includes('const base = f * shift * ensembleVary((v.humanize || {}).pitch, time, 16);')
  && source.includes('this._retargetLayerLegato(prev, base, time, noteDur, v, hold);')
  && source.includes('this._rekeyHeldNote(prev, key);'),
  'and the note-off passes to the key that took the gate — last note priority');

// ---- ONE INSTRUMENT, SEVERAL FINGERS ----------------------------------------
//
// The other half of last note priority, and the half that was missing everywhere: a MONO
// or LEGATO preset answers every key on the lane through ONE instrument, so a note-off
// has to ask whether the key coming up is the one SPEAKING before it does anything at
// all. It cost the FM classes the whole sound — hold a chord, let go of any one of the
// three keys and the note stopped — and it cost MRDR-3 and TNGR-2 the top of it: letting
// go of the key you were actually holding cut a note two fingers were still on.
//
// Pinned in the source because the failure is a live one. Nothing sequenced can reach it
// — a played note has a length and no note-off — so no render, no bounce and no offline
// test can see it, and it is only there under a finger.
assert(source.includes('const fingerDown = (host, key, hz) => {')
  && source.includes('const fingerUp = (host, key) => {'),
  'the rack has ONE vocabulary for the keys still down on one instrument');
assert((source.match(/fingerDown\(/g) || []).length === 4,
  'and all three paths keep it: pooled, MRDR-3 native, TNGR-2 lane');
assert(source.includes('const { next, wasOwner } = fingerUp(slot, noteKey);')
  && source.includes('const { next } = fingerUp(record, noteKey);')
  && source.includes('const { next, wasOwner } = fingerUp(fingers, noteKey);'),
  'and all three ask the same question when a key comes up');
// LETTING GO NEVER STARTS A NOTE. The fall-back moves the pitch and leaves the envelope
// where it stands, in MONO as well as LEGATO — single trigger, which is what a mono synth
// with a keyboard on it does. A second attack out of a gesture that was a release is the
// thing this must never become.
assert(source.includes('slot.synth.setNote(next.hz, at);')
  && source.includes('this._retargetLayerPitch(record, next.hz, at, record.glide || 0);')
  && source.includes("tngr2NoteOn(lane, { at: off, hz: next.hz, velocity: 1, eventId, regate: false });"),
  'the fall-back moves the pitch on every path and re-strikes on none');
// LEGATO under a finger is legato. The pooled classes reach a different branch from the
// sequencer's, and without this the mode was MONO with another name on the pill.
assert(source.includes('if (legato && slot.fingers?.length) {')
  && source.includes('cancelToneEnvelopes(slot.synth, t);'),
  'a pooled LEGATO key takes the note over rather than striking it again');
// The pooled legato branch stays on the sequencer's gate for the opposite reason: it
// schedules a release, which must never land on a key that is still down.
assert(source.includes('} else if (legato && gated) {'),
  'the pooled legato retarget is gated, never fingered');
assert(source.includes('for (const { param, level, tail = 0, fade = 0.004 } of prev.gates || [])')
  && source.includes('legatoGates.push({ param: g.gain, level: lvl, tail, fade: 0.004 });'),
  'MRDR-3 carries THROUGH layer gates to the active legato note end');



console.log('KEY MODE: PASSED');
