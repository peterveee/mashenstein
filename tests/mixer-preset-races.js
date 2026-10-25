import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
const source = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const node = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'setLaneVoice');
const functionSource = source.slice(node.start, node.end);
const cancelNode = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'cancelPendingLaneVoices');
const cancelSource = source.slice(cancelNode.start, cancelNode.end);
function makeDesk() {
  const requests = [];
  const Audio = { warmLaneVoice(lane, voice) { let resolve; const promise = new Promise(r => { resolve = r; }); requests.push({ lane, voice, resolve }); return promise; } };
  const desk = new Function('Audio', `
    let laneVoiceTicket = 0, trackId = 'a', playing = true;
    const pendingLaneVoices = new Map();
    const mixes = { a: {}, b: {} };
    const VOICES = { one: { label: 'One' }, two: { label: 'Two' }, three: { label: 'Three' } };
    const seamFor = key => ({ voiceKey: key + 'Voice' });
    const mixFor = id => mixes[id];
    const editMix = fn => fn(mixes[trackId]);
    const rebank = () => {}, syncVoiceEditorToLane = () => false;
    const buildRack = () => {}, buildArrangement = () => {}, refreshLaneIdentity = () => {};
    const stepSeq = { refresh() {} }, pianoRoll = stepSeq, kitRoll = stepSeq;
    const syncNotesPanel = () => {}, refreshOsk = () => {}, toast = () => {}, targetLabel = key => key;
    const applyToEngine = () => {};
    ${cancelSource}
    ${functionSource}
    return { pick: (lane, id) => setLaneVoice(lane, id, { redraw: false, autoCopy: false }),
      cancel: cancelPendingLaneVoices,
      switchSong(id) { cancelPendingLaneVoices(); trackId = id; },
      mixes, pending: () => pendingLaneVoices.size };
  `)(Audio);
  return { ...desk, requests };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
let desk = makeDesk();
desk.pick('bass', 'one'); desk.pick('bass', 'two');
desk.requests[1].resolve(); await flush(); desk.requests[0].resolve(); await flush();
assert.equal(desk.mixes.a.voice.bassVoice, 'two', 'last choice on a lane wins out of order');
desk = makeDesk();
desk.pick('bass', 'one'); desk.pick('lead', 'two');
desk.requests[1].resolve(); await flush(); desk.requests[0].resolve(); await flush();
assert.equal(desk.mixes.a.voice.bassVoice, 'one', 'choosing a different lane must not cancel the first lane');
assert.equal(desk.mixes.a.voice.leadVoice, 'two');
assert.equal(desk.pending(), 0, 'settled warmups release their records');
desk = makeDesk(); desk.pick('bass', 'one'); desk.cancel();
desk.requests[0].resolve(); await flush(); assert.equal(desk.mixes.a.voice, undefined, 'undo cancels pending selection');
desk = makeDesk(); desk.pick('bass', 'one'); desk.switchSong('b'); desk.switchSong('a');
desk.requests[0].resolve(); await flush(); assert.equal(desk.mixes.a.voice, undefined, 'returning to the same song cannot revive a stale choice');
console.log('MIXER PRESET RACES: PASSED');
