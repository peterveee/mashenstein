// The title marquee's cord shorts out on the song's clock, not a wall clock,
// and does it less often than the old free-running timer did.
import { installDom } from './dom-stub.js';
installDom();

const { TitleState } = await import('../src/game/menus.js');
const { Audio } = await import('../src/engine/audio.js');
const { save } = await import('../src/engine/save.js');
const { TITLE_THEME } = await import('../src/data/cabinets.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();

// Drive the title for a simulated minute against a fake song clock, counting
// the short-out cues. bpm comes from the real title bank so the rate this
// asserts is the rate the player actually gets.
function buzzesPerMinute(settings) {
  save.settings.reducedFlashing = !!settings.reducedFlashing;
  const beatsPerSec = TITLE_THEME.bpm / 60;
  let beat = 0;
  const realBeat = Audio.songBeat.bind(Audio);
  const realSfx = Audio.sfx.bind(Audio);
  Audio.songBeat = () => beat;
  let buzzes = 0;
  Audio.sfx = (name) => { if (name === 'neonBuzz') buzzes++; };
  const title = new TitleState({ save, onSlotChosen() {}, onOvertime() {}, onSettings() {}, onHowTo() {}, onGuide() {}, onSoundTest() {}, attractDelay: 1e9 });
  title.enter();
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 60; i++) { beat += dt * beatsPerSec; title.update(dt); }
  Audio.songBeat = realBeat;
  Audio.sfx = realSfx;
  return buzzes;
}

const buzzes = buzzesPerMinute({});
// The old sign short-circuited twice every 5.4s — 22 cues a minute.
assert(buzzes > 0, 'the sign still shorts out');
assert(buzzes <= 16, `the cord fires well below the old 22-a-minute rate (${buzzes})`);
// The sign keeps blinking on every block, but it is only AUDIBLE on some of
// them: one cue per block at most (the first blink; the second falls inside its
// tail), and only on blocks the hash selects. At 56bpm a block is one bar, 4.3s,
// so 14 a minute — the hash lets under a third of them speak, with the gaps left
// uneven on purpose so it reads as a fault rather than a metronome. The visible
// blink rate and the audible rate are tuned separately for exactly this reason:
// the sign has to stutter often enough to be noticed without the buzz becoming
// a tic.
assert(buzzes >= 2 && buzzes <= 8, `only some blocks are audible, unevenly spaced (${buzzes})`);

assert(buzzesPerMinute({ reducedFlashing: true }) === 0, 'reduced flashing pins the sign lit and silent');

// Without a song to lock to (no audio context yet, headless tests) it must
// still stutter rather than freeze — on the fallback wall clock.
save.settings.reducedFlashing = false;
assert(Audio.songBeat() === null, 'no song, no beat clock');
let fallbackBuzzes = 0;
const realSfx = Audio.sfx.bind(Audio);
Audio.sfx = (name) => { if (name === 'neonBuzz') fallbackBuzzes++; };
const title = new TitleState({ save, onSlotChosen() {}, onOvertime() {}, onSettings() {}, onHowTo() {}, onGuide() {}, onSoundTest() {}, attractDelay: 1e9 });
title.enter();
for (let i = 0; i < 60 * 60; i++) title.update(1 / 60);
Audio.sfx = realSfx;
assert(fallbackBuzzes > 0 && fallbackBuzzes <= 16, `the wall-clock fallback keeps a similar rate (${fallbackBuzzes})`);

console.log(failed ? 'TITLE SIGN: FAILED' : 'TITLE SIGN: PASSED');
process.exit(failed ? 1 : 0);
