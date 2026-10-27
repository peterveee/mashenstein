import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';

// Run the production handlers without starting the Desk, a server, or audio.
const source = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const declaration = (name) => ast.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === name);
const code = (name) => { const node = declaration(name); assert.ok(node, name); return source.slice(node.start, node.end); };
class Element {
  constructor() { this.listeners = {}; this.children = []; this.isConnected = false; this.classList = { add() {}, remove() {}, contains() { return false; } }; }
  append(...children) { this.children.push(...children); }
  addEventListener(event, fn) { (this.listeners[event] ||= []).push(fn); }
  setAttribute() {}
  fire(event) { for (const fn of this.listeners[event] || []) fn(); }
}
const controls = [], timers = new Map(), edits = [];
let nextTimer = 0;
const env = {
  document: { createElement: () => new Element() },
  slider(options) {
    const control = { options, wrap: new Element(), readout: new Element(), label: new Element(), input: new Element() };
    controls.push(control); return control;
  },
  setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
  clearTimeout(id) { timers.delete(id); },
  applyArrangementEdit(next) { edits.push(next); },
};
const desk = new Function('env', `
  const { document, slider, setTimeout, clearTimeout, applyArrangementEdit } = env;
  let trackId = 'a', channelAdjustOpen = false;
  const channelAdjustDisposers = new Set();
  const seamFor = key => key === 'bass' ? { voiceKey: 'bassVoice' } : null;
  const PERCUSSION_LANES = [], baseLane = key => key;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const signed = String, timingBadge = String, timingText = String;
  const arrDraftOf = () => ({ song: trackId, plan: [0, 1] });
  const uniformRegionValue = () => 0;
  const presetHeadingFor = () => ({ name: 'Bass' });
  const write = (current, from, to, keys, value) => ({ ...current, keys, value });
  const transposeBars = write, offsetBars = write, gainBars = write, panBars = write;
  ${code('disposeChannelAdjust')}
  ${code('buildChannelAdjust')}
  return { build: buildChannelAdjust, dispose: disposeChannelAdjust, switchSong(id) { trackId = id; } };
`)(env);
const mount = () => { const panel = desk.build('bass'); panel.isConnected = true; return { panel, control: controls.at(-1) }; };
const settle = () => { const pending = [...timers.values()]; timers.clear(); for (const fn of pending) fn(); };

let { panel, control } = mount();
control.options.onInput(15); control.options.onInput(25);
assert.equal(timers.size, 1);
settle();
assert.deepEqual(edits.at(-1), { song: 'a', plan: [0, 1], keys: ['bass'], value: 25 });
control.input.fire('change');
assert.equal(edits.length, 1, 'change after a settled typed edit must not duplicate undo');
control.input.fire('pointerdown'); control.options.onInput(35);
assert.equal(timers.size, 0, 'range drag waits for release');
control.input.fire('change');
assert.equal(edits.length, 2);
for (const event of ['pointercancel', 'lostpointercapture', 'blur']) {
  control.input.fire('pointerdown'); control.options.onInput(40);
  control.input.fire(event); control.input.fire('change');
}
assert.equal(edits.length, 5, 'interrupted gestures commit once');
control.options.onInput(45); desk.switchSong('b'); settle();
assert.equal(edits.length, 5, 'old control must not edit another song');
desk.switchSong('a');
control.options.onInput(50); panel.isConnected = false; settle();
assert.equal(edits.length, 5, 'detached panel cannot commit');
panel.isConnected = true;
control.options.onInput(55);
const staleCallback = [...timers.values()][0];
desk.dispose();
assert.equal(timers.size, 0, 'teardown releases timers');
staleCallback(); control.input.fire('change');
assert.equal(edits.length, 5, 'disposed callbacks cannot revive after returning to the same song');
({ panel, control } = mount());
control.options.onInput(60); settle();
assert.equal(edits.at(-1).value, 60, 'replacement panel remains usable');
desk.dispose();
// Check the production lifecycle calls, in addition to exercising disposal above.
for (const name of ['buildDevices', 'loadTrack']) {
  assert.equal(declaration(name).body.body[0].expression.callee.name, 'disposeChannelAdjust', `${name} disposes old controls first`);
}

const calls = [];
const mix = { lanes: {} };
const effectDesk = new Function('env', `
  const { calls, mix } = env;
  const clipboard = { data: { effects: [{ id: 'delay', params: { wet: 0.4 } }] } };
  const trackId = 'a', selectedLane = 'bass';
  const deskTempo = () => 120, followPickedEffect = () => {};
  const editMix = fn => fn(mix), storeEffects = (m, key, list) => { m[key] = list; };
  const isGroupKey = key => key.startsWith('__group:'), groupIdOf = key => key.slice(8);
  const record = (kind, key, list, bpm) => calls.push({ kind, key, list, bpm });
  const Audio = { mixer: {
    setMasterEffects: (list, bpm) => record('master', '__master', list, bpm),
    setAuxEffects: (key, list, bpm) => record('aux', key, list, bpm),
    setGroupEffects: (key, list, bpm) => record('group', key, list, bpm),
    lane: key => ({ setEffects: (list, bpm) => record('lane', key, list, bpm) }),
  } };
  const buildRack = () => {}, buildArrangement = () => {}, buildDevices = () => {};
  const syncArrangementEffectShortcut = () => {}, refreshRackEffectSlots = () => {};
  const $ = () => ({ classList: { contains: () => false } });
  const targetLabel = key => key, toast = () => {};
  const applyToEngine = () => { throw Error('must not apply the whole mix'); };
  ${code('setEffects')}
  ${code('pasteEffects')}
  return { pasteEffects, clipboard };
`)({ calls, mix });
for (const [key, kind, target] of [['bass', 'lane', 'bass'], ['__master', 'master', '__master'], ['__aux:delay', 'aux', 'delay'], ['__group:drums', 'group', 'drums']]) {
  effectDesk.pasteEffects(key);
  assert.equal(calls.at(-1).kind, kind); assert.equal(calls.at(-1).key, target);
  assert.equal(calls.at(-1).bpm, 120);
  assert.deepEqual(mix[key], effectDesk.clipboard.data.effects);
  assert.notEqual(mix[key], effectDesk.clipboard.data.effects, 'clipboard is not shared with the draft');
}
assert.equal(calls.length, 4, 'one targeted chain update per paste');
effectDesk.clipboard.data.effects = [];
effectDesk.pasteEffects('bass'); assert.deepEqual(calls.at(-1).list, []);

const voiceCalls = [];
const voiceDesk = new Function('calls', `
  let playing = true;
  const trackId = 'a', track = { title: 'A' }, mix = {};
  const seamFor = key => key === 'bass' ? { voiceKey: 'bassVoice' } : null;
  const editMix = fn => fn(mix), mixFor = () => mix;
  const rebank = () => { if (playing) calls.push('rebank'); };
  const applyToEngine = () => calls.push('apply');
  const syncVoiceEditorToLane = () => {}, buildRack = () => {}, refreshOsk = () => {};
  const targetLabel = key => key, toast = () => {};
  ${code('saveVoiceToSong')}
  return { save: saveVoiceToSong, stop() { playing = false; }, mix };
`)(voiceCalls);
assert.equal(voiceDesk.save('bass', { label: 'Bass', cutoff: 123 }), true);
assert.deepEqual(voiceCalls, ['rebank']);
assert.equal(voiceDesk.mix.voiceParams.bassVoice.cutoff, 123);
voiceDesk.stop(); voiceDesk.save('bass', { label: 'Bass', cutoff: 456 });
assert.deepEqual(voiceCalls, ['rebank', 'apply'], 'stopped audition bank still refreshes');
assert.equal(voiceDesk.mix.voiceParams.bassVoice.cutoff, 456);
assert.equal(voiceDesk.save('missing', {}), false);
console.log('MIXER CHANNEL EDITS: PASSED');
