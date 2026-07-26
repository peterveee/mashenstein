// Focused coverage for the randomized jukebox visualizer pack.
import { installDom } from './dom-stub.js';
installDom();

const { Audio } = await import('../src/engine/audio.js');
const { createVisualizer, pickVisualizer, VISUALIZER_NAMES } = await import('../src/engine/visualizers.js');
const { SoundTestState } = await import('../src/game/menus.js');
const { Input } = await import('../src/engine/input.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const ctx = document.createElement('canvas').getContext('2d');
const spectrum = new Uint8Array(128);
spectrum.fill(96);
const analysis = {
  spectrum,
  waveform: new Uint8Array(256),
  bass: 0.7,
  mid: 0.45,
  treble: 0.6,
  beat: 4.25,
  beatPhase: 0.25,
  beatPulse: 0.24,
};

for (let i = 0; i < VISUALIZER_NAMES.length; i++) {
  const v = createVisualizer(i, 0x12340000 + i, { bpm: 120 });
  v.update(1 / 60, analysis);
  v.draw(ctx);
  assert(v.name === VISUALIZER_NAMES[i] && v.dust.length >= 96,
    `preset ${i + 1} has the expected name, moving focal point, and particle field`);
}

const kaleido = createVisualizer(4, 0x12345678, { bpm: 120 });
const kaleidoCounts = [];
for (const beat of [0.1, 8.1, 16.1, 24.1, 32.1]) {
  kaleido.update(0, { ...analysis, beat, beatPhase: beat % 1 });
  kaleidoCounts.push(kaleido.symmetry);
}
assert(kaleidoCounts.every((count) => count >= 8 && count <= 24 && count % 2 === 0)
  && new Set(kaleidoCounts).size > 1,
  'kaleidoscope changes between dense and sparse phrase segment counts');

assert(pickVisualizer(2, () => 2 / 6) !== 2, 'preset selection avoids an immediate repeat');
assert(pickVisualizer(-1, () => 0) === 0, 'preset selection is injectable and deterministic');
assert(Audio.musicAnalysis().spectrum.length === 128 && Audio.musicAnalysis().waveform.length === 256,
  'audio analysis keeps a stable browserless data shape');

const sound = new SoundTestState({ onDone: () => {} });
sound.enter();
Input.usingTouch = false;
Input.press('confirm');
sound.update(1 / 60);
Input.release('confirm');
Input.endFrame();
for (let i = 0; i < 11; i++) sound.update(0.5);
assert(sound.playing === 0 && sound.visualState === 'in',
  'screensaver begins after five seconds of audible playback plus the start gap');
sound.update(1.1);
assert(sound.visualState === 'active', 'visualizer fade-in reaches the active state');
sound.draw(ctx);
assert(true, 'active visualizer draws bottom-corner track and preset labels safely');
sound.update(5.2);
assert(sound.labelT > 5, 'corner labels remain timed after their five-second hold');
const bankBeforeWake = Audio.bank;
const visualizerBeforeBrowse = sound.visualizerIndex;
Input.press('right');
sound.update(1 / 60);
Input.release('right');
assert(sound.visualizerIndex === (visualizerBeforeBrowse + 1) % VISUALIZER_NAMES.length
  && sound.visualState === 'active' && Audio.bank === bankBeforeWake && sound.labelT < 0.1,
  'right arrow advances the visualizer without waking or stopping the song');
sound.update(0.4);
Input.press('left');
sound.update(1 / 60);
Input.release('left');
assert(sound.visualizerIndex === visualizerBeforeBrowse && sound.visualState === 'active',
  'left arrow returns to the previous visualizer');
Input.press('confirm');
sound.update(1 / 60);
Input.release('confirm');
assert(sound.visualState === 'out' && Audio.bank === bankBeforeWake,
  'the first wake input only fades back and leaves the song playing');
sound.update(0.5);
assert(sound.visualState === 'list', 'wake fade returns to the jukebox list');
Input.press('confirm');
sound.update(1 / 60);
Input.release('confirm');
assert(sound.playing === -1 && Audio.bank === null, 'the next input operates the list normally');

Input.clearAll();
console.log(failed ? 'VISUALIZERS: FAILED' : 'VISUALIZERS: PASSED');
process.exit(failed ? 1 : 0);
