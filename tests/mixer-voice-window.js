import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
const source = readFileSync(new URL('../tools/mixer-voice-editor-window.js', import.meta.url), 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const code = name => { const node = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name); return source.slice(node.start, node.end); };
const create = new Function('playing', 'opened', `
  const calls = [], mix = {};
  const VOICES = { library: { id: 'library', kind: 'tone', label: 'Library', waveform: 'sine' } };
  const library = JSON.stringify(VOICES.library);
  const isPlaying = () => playing;
  const trackId = () => 'song', track = () => ({ bank: {} });
  const seamFor = () => ({ voiceKey: 'bassVoice' });
  const mixFor = () => mix, editMix = fn => fn(mix);
  const registerCopy = () => { if (mix.voiceParams) VOICES.local = { ...mix.voiceParams.bassVoice, id: 'local', songLocal: true }; };
  const rebank = () => { if (playing) { calls.push('rebank'); registerCopy(); } };
  const applyToEngine = () => { calls.push('apply'); registerCopy(); };
  const laneVoiceId = () => mix.voiceParams ? 'local' : 'library';
  const voiceEditor = { laneKey: 'bass', editing: 'old', voice: {}, fullOpen: false,
    isOpen: () => opened, open(id) { calls.push('open:' + id); return false; } };
  const dismissVoiceEditor = () => calls.push('dismiss');
  const closeMenu = () => {}, selectLane = () => {}, targetLabel = key => key;
  const defaultVoiceOf = () => null, isQuickVoice = () => false, toast = () => {};
  ${code('editVoice')}
  ${code('syncVoiceEditorToLane')}
  return { editVoice, syncVoiceEditorToLane, calls, mix, VOICES, library };
`);
for (const playing of [false, true]) {
  for (const operation of ['editVoice', 'syncVoiceEditorToLane']) {
    const desk = create(playing, operation === 'syncVoiceEditorToLane');
    desk[operation]('bass');
    assert.equal(desk.mix.voiceParams.bassVoice.waveform, 'sine');
    assert.equal(desk.VOICES.local.songLocal, true);
    assert.equal(JSON.stringify(desk.VOICES.library), desk.library, 'library preset is unchanged');
    assert.ok(desk.calls.includes('open:local'), 'editor is pointed at the copied voice');
    assert.equal(desk.calls.filter(x => x === 'apply').length, playing ? 0 : 1);
    assert.equal(desk.calls.filter(x => x === 'rebank').length, playing ? 1 : 0);
  }
}
console.log('MIXER VOICE WINDOW: PASSED');
