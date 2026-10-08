// Sound Test uses full-size scrolling rows and touch release arbitration.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { TITLE_THEME, HUB_THEME } = await import('../src/data/cabinets.js');
const { COUNTER_DANCE_MIX_THEME } = await import('../src/data/shop-themes.js');
const { MEGAMIX_THEME } = await import('../src/data/megamix.js');
const { loopOf } = await import('../src/data/arrangements.js');
const { trackIdOf } = await import('../src/data/tracks.js');
const { SoundTestState, JUKEBOX } = await import('../src/game/menus.js');
const { VISUALISER_NAMES } = await import('../src/engine/visualisers.js');
const { portraitAllowedFor } = await import('../src/engine/lifecycle.js');
const { defaultFrame, frameForViewport } = await import('../src/engine/frame.js');
const renderer = await import('../src/engine/renderer.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

let returned = 0;
const sound = new SoundTestState({ onDone: () => { returned++; } });
// The rotate overlay stays down on this screen because the class declares its
// portrait presentation. Losing the declaration would silently restore the
// landscape gate here, which is the one regression the capability flag risks.
assert(SoundTestState.portraitMode === 'frame' && portraitAllowedFor(sound),
  'the jukebox declares its frame-based portrait presentation');
sound.enter();
assert(sound.visibleRows === 5 && sound.rowH === 27 && sound.listStart === 0,
  'sound test opens with five scrolling rows, sized for a readable track name');
assert(sound.trackCounter(0) === '1.' && sound.trackCounter(13) === '14.',
  'every jukebox row has a simple track number');
assert(JUKEBOX.length === 14 && JUKEBOX[2].bank === COUNTER_DANCE_MIX_THEME,
  'jukebox includes the approved procedural Counter Dance Mix without a WAV asset');
assert(JUKEBOX.map((track) => track.bank.musicTrim).join(',')
  === '3.33,1.05,2.22,0.93,0.87,1.05,1.74,1.05,0.93,1.18,0.93,0.7,0.95,2.24',
  'every jukebox track carries its measured playback loudness trim');
assert(JUKEBOX.at(-1).name === 'MASHENSTEIN: THE MONSTER MIX'
  && JUKEBOX.at(-1).bank === MEGAMIX_THEME,
  'MASHENSTEIN: THE MONSTER MIX is the final jukebox entry');

Input.usingTouch = true;
function touchDown(y) {
  Input.pointer = { x: 120, y, down: true };
  Input.press('pointer');
  sound.update(1 / 60);
}
function touchMove(y) {
  Input.pointer.y = y;
  sound.update(1 / 60);
}
function touchUp() {
  Input.pointer.down = false;
  Input.release('pointer');
  sound.update(1 / 60);
}

// `sourceBank`, not `bank`, throughout: these ask WHICH SONG is playing, and that is
// the bank as chosen. `Audio.bank` is what the sequencer walks — the song after its
// arrangement, its layers and its voice overrides have been folded in — so a song
// whose mix duplicates a track or names a preset is a different object by the time it
// gets there. Title's does both (a `bass2` layer on `tpAlienChorus`), which is what
// made this read as "the title theme is not playing" while it was playing fine.
const firstY = sound.listY + sound.rowH / 2;
touchDown(firstY); touchUp();
assert(sound.idx === 0 && sound.playing === 0 && Audio.sourceBank === TITLE_THEME,
  'one stationary touch selects and plays a track');
assert(Audio.pendingStartDelay === 0.5,
  'starting a jukebox track inserts a half-second silence before bar one');
assert(Audio.step === 0,
  'starting a jukebox track puts its playhead at the beginning');
touchDown(firstY); touchUp();
assert(sound.idx === 0 && sound.playing === -1 && Audio.sourceBank === null,
  'touching the playing track again stops it without losing selection');

const secondY = sound.listY + sound.rowH * 1.5;
touchDown(secondY); touchUp();
assert(sound.idx === 1 && sound.playing === 1 && Audio.sourceBank === HUB_THEME,
  'touching another track switches directly to it');

const swipeY = sound.listY + sound.rowH * 4;
touchDown(swipeY);
touchMove(swipeY - sound.rowH * 3);
touchUp();
assert(sound.listStart === 3, 'an upward drag reveals three later tracks');
assert(sound.playing === 1 && Audio.sourceBank === HUB_THEME,
  'dragging the list never changes or stops the playing track');

touchDown(sound.listY + sound.rowH / 2); touchUp();
assert(sound.idx === 3 && sound.playing === 3,
  'post-scroll hit-testing maps the first visible row to its real track');
Input.press('confirm'); sound.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(sound.playing === -1 && Audio.sourceBank === null,
  'keyboard confirmation uses the same stop toggle');
Input.press('confirm'); sound.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(sound.playing === 3, 'keyboard confirmation starts the selected track again');

// Speed Zone normally enters at bar 5 for gameplay. The jukebox is the album-style
// listening surface, so even that authored skip-in must begin at bar 1 while keeping
// its later repeat region armed.
const skipIn = JUKEBOX.findIndex((track) =>
  (loopOf(track.bank, trackIdOf(track.bank))?.startBar ?? 1) > 1);
assert(skipIn >= 0, 'the shipped jukebox includes a song with a later gameplay start marker');
sound.openTrack(skipIn);
assert(Audio.step === 0,
  'a jukebox song with a later gameplay start marker still begins at bar one');
assert(Audio.formLoopArmed && Audio.loopStart != null && Audio.loopEnd != null,
  'starting at bar one preserves the song authored repeat region');
const starts = JUKEBOX.map((track, i) => {
  sound.openTrack(i);
  return { name: track.name, step: Audio.step };
});
assert(starts.every(({ step }) => step === 0),
  `every shipped jukebox song begins at step zero (${starts.map(({ name, step }) => `${name}: ${step}`).join(', ')})`);

const ctx = document.createElement('canvas').getContext('2d');
sound.draw(ctx);
assert(true, 'the scrolled sound test renders safely');

touchDown(sound.backY + sound.backH / 2); touchUp();
assert(returned === 1 && Audio.sourceBank === null, 'the fixed touch BACK target stops playback and exits');

Input.clearAll();
Input.usingTouch = false;
let keyboardReturned = 0;
const keyboard = new SoundTestState({ onDone: () => { keyboardReturned++; } });
keyboard.enter();
function down() {
  Input.press('down'); keyboard.update(1 / 60); Input.release('down'); Input.endFrame();
}
// The list runs on past the shipped songs: MAKE A BANGER and any kept bangers
// (tests/jukebox-banger.js), then the fixed BACK.
const rowCount = keyboard.tracks.length;
for (let i = 0; i < rowCount; i++) down();
assert(keyboard.idx === rowCount && keyboard.listStart === rowCount - 5,
  'keyboard navigation reaches fixed BACK while scrolling to the final page');
Input.press('confirm'); keyboard.update(1 / 60); Input.release('confirm'); Input.endFrame();
assert(keyboardReturned === 1, 'keyboard confirmation activates fixed BACK');

const preview = new SoundTestState({ onDone: () => {}, initialTrack: JUKEBOX.length - 1, startVisualiser: true });
preview.enter();
assert(preview.playing === JUKEBOX.length - 1 && preview.visualiser
  && VISUALISER_NAMES.includes(preview.visualiser.name),
  'dev visualiser preview starts the Monster Mix with a random preset');
preview.exit();

const forced = new SoundTestState({ onDone: () => {}, initialTrack: JUKEBOX.length - 1, startVisualiser: true, startVisualiserIndex: 13 });
forced.enter();
assert(forced.visualiserIndex === 13 && forced.visualiser?.name === 'TOASTER SKY PARADE',
  'dev visualiser submenu can launch a specific preset');
forced.exit();

const portraitFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
});
renderer.setPresentationFrame(portraitFrame);
const portrait = new SoundTestState({ onDone: () => {}, initialTrack: 0, startVisualiser: true });
portrait.enter();
assert(renderer.H === portraitFrame.height && portrait.visibleRows === 9 && portrait.rowH >= 60
  && portrait.visualiser?.viewportH === 270,
  'portrait sound test fills the frame with denser rows; the visualiser keeps its fixed 480x270 field for the renderer to cover-crop');
portrait.draw(document.createElement('canvas').getContext('2d'));
portrait.exit();
renderer.setPresentationFrame(defaultFrame());

{
  // VISUALISER: off, a song plays on under the list and the visualiser never takes over;
  // the switch is kept in the save. Landscape has BACK · 8-BIT · VISUALISER across one row;
  // portrait gives the two switches a row of their own over BACK.
  const { save } = await import('../src/engine/save.js');
  const kept = save.data;
  save.data = { settings: { jukeboxVisualiser: true }, slots: [null, null, null] };
  Input.clearAll();
  Input.usingTouch = false;
  const jb = new SoundTestState({ onDone: () => {}, initialTrack: 0 });
  jb.enter();
  const n = jb.tracks.length;
  const press = (key) => { Input.press(key); jb.update(1 / 60); Input.release(key); Input.endFrame(); };
  const { back, chip, vis } = jb.backPlates();
  const midY = jb.backY + jb.backH / 2;
  assert(back.y === chip.y && chip.y === vis.y && back.x < chip.x && chip.x < vis.x
    && jb.pointerIndex(midY, back.x + 4) === n && jb.pointerIndex(midY, chip.x + 4) === n + 3
    && jb.pointerIndex(midY, vis.x + 4) === n + 4,
    'landscape: BACK, 8-BIT and VISUALISER are the bottom row\'s three thirds');
  jb.idx = n - 1;
  press('down'); const a = jb.idx;
  press('down'); const b = jb.idx;
  press('down'); const c = jb.idx;
  assert(a === n && b === n + 3 && c === n + 4, 'landscape: down from the last song goes BACK, 8-BIT, VISUALISER');
  press('confirm');
  assert(!jb.visualiserOn && save.data.settings.jukeboxVisualiser === false, 'VISUALISER switches off, into the save');
  jb.update(60);
  assert(jb.playing === 0 && jb.visualState === 'list' && !jb.visualiser,
    'switched off, a minute of a song playing untouched brings no visualiser');
  press('confirm');
  jb.update(jb.visualiserWait() + 1);
  assert(jb.visualiserOn && jb.visualiser && jb.visualState !== 'list', 'switched on, the visualiser comes back after the idle wait');
  jb.clearVisualiser();
  jb.draw(document.createElement('canvas').getContext('2d'));
  jb.exit();

  renderer.setPresentationFrame(portraitFrame);
  const tall = new SoundTestState({ onDone: () => {}, initialTrack: 0 });
  tall.enter();
  const p = tall.backPlates();
  const switchY = p.chip.y + tall.backH / 2;
  const backY = p.back.y + tall.backH / 2;
  assert(p.chip.y === p.vis.y && p.vis.y + tall.backH <= p.back.y && p.chip.x === p.back.x && p.back.w === p.chip.w
    && tall.pointerIndex(switchY, p.chip.x + 4) === n + 3 && tall.pointerIndex(switchY, p.vis.x + 4) === n + 4
    && tall.pointerIndex(backY, p.back.x + 4) === n && tall.pointerIndex(backY, p.vis.x + 4) === -1,
    'portrait: 8-BIT and VISUALISER are the halves of a row over BACK, BACK still the left half under them');
  const lastRowBottom = tall.listY + tall.visibleRows * tall.rowH;
  assert(lastRowBottom <= p.chip.y && tall.rowH >= 56, 'portrait: the songs stop above the switches, rows still finger-sized');
  tall.idx = n - 1;
  const order = [];
  for (let i = 0; i < 3; i++) {
    Input.press('down'); tall.update(1 / 60); Input.release('down'); Input.endFrame();
    order.push(tall.idx);
  }
  assert(order.join() === [n + 3, n + 4, n].join(), 'portrait: down from the last song goes 8-BIT, VISUALISER, then BACK');
  tall.draw(document.createElement('canvas').getContext('2d'));
  tall.exit();
  renderer.setPresentationFrame(defaultFrame());
  save.data = kept;
}

{
  // The lock screen's previous/next: round the list, the cursor following. Nothing on the
  // jukebox's own screen offers it.
  const jb = new SoundTestState({ onDone: () => {}, initialTrack: JUKEBOX.length - 1 });
  jb.enter();
  const np = jb.nowPlaying();
  assert(np && np.skips && np.album === 'JUKEBOX' && np.title === 'MASHENSTEIN: THE MONSTER MIX',
    'the lock screen names the jukebox song and offers previous/next');
  jb.mediaSkip(1);
  assert(jb.playing === 0 && jb.idx === 0 && Audio.sourceBank === JUKEBOX[0].bank,
    'next from the last song plays the first, the cursor with it');
  jb.mediaSkip(-1);
  assert(jb.playing === JUKEBOX.length - 1 && Audio.sourceBank === JUKEBOX.at(-1).bank,
    'previous from the first plays the last');
  jb.mediaPause(true);
  assert(jb.nowPlaying().paused && jb.statusText().startsWith('PAUSED:'),
    'a lock-screen pause holds the song and says so');
  jb.mediaSkip(1);
  assert(!jb.held && jb.playing === 0 && !jb.nowPlaying().paused, 'a skip while held plays the next song');
  jb.exit();
}

{
  // The lock screen's cover: a playable hero's face, a paper fish or a flying toaster, new each
  // song, never twice running.
  const { paintSongArt, paintSongArtOf, SONG_ART_SUBJECTS } = await import('../src/game/song-art.js');
  const { HEROES } = await import('../src/data/heroes.js');
  assert(HEROES.every((h) => SONG_ART_SUBJECTS.includes(h.id)) && !SONG_ART_SUBJECTS.includes('gary')
    && !SONG_ART_SUBJECTS.includes('dolores') && SONG_ART_SUBJECTS.includes('PARTY SHARK')
    && SONG_ART_SUBJECTS.includes('GOLDEN TOASTER'),
    'the covers are the playable heroes (no NPCs), the club\'s fish and the toasters');
  const painted = SONG_ART_SUBJECTS.filter((id) => { try { return paintSongArtOf(id)?.width === 1024; } catch { return false; } });
  assert(painted.length === SONG_ART_SUBJECTS.length, `every cover paints at 1024 (${SONG_ART_SUBJECTS.filter((id) => !painted.includes(id)).join(', ') || 'all'})`);
  let seed = 3;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  // a cabinet's own song in the jukebox wears that cabinet's scenery; DÉJÀ VIEW, a subject
  const { CABINETS } = await import('../src/data/cabinets.js');
  const cabRow = new SoundTestState({ onDone: () => {}, initialTrack: JUKEBOX.findIndex((t) => t.bank === CABINETS[0].music) });
  cabRow.enter();
  const titleRow = new SoundTestState({ onDone: () => {}, initialTrack: 0 });
  titleRow.enter();
  assert(cabRow.nowPlaying()?.cabinet === CABINETS[0].id && titleRow.nowPlaying()?.cabinet === null,
    'the jukebox says which cabinet a song is from, and the title theme is from none');
  const scenery = paintSongArt(64, random, { cabinet: CABINETS[0].id });
  const surge = paintSongArt(64, random, { cabinet: 'surge' });
  assert(scenery.subject === `cabinet:${CABINETS[0].id}` && SONG_ART_SUBJECTS.includes(surge.subject),
    'a cabinet\'s song is covered with its scenery; DÉJÀ VIEW\'s, which has none of its own, with a subject');
  // with 8-BIT on, a song playing its 8-bit version says so, and its cover goes on the tube
  const { installSoundtrack } = await import('../src/game/results-chip.js');
  const chipSave = { settings: { soundtrack: '8bit' } };
  installSoundtrack(chipSave);
  const chipOn = cabRow.nowPlaying()?.eightBit;
  chipSave.settings.soundtrack = 'original';
  const chipOff = cabRow.nowPlaying()?.eightBit;
  installSoundtrack({ settings: { soundtrack: 'original' } });
  assert(chipOn === true && chipOff === false, 'the jukebox says when the song is playing its 8-bit version');
  assert(paintSongArt(64, random, { eightBit: true })?.width === 64 && paintSongArtOf('clara', 64, { eightBit: true })?.width === 64,
    'an 8-bit cover paints (on the tube where the canvas can take it)');
  titleRow.exit();
  cabRow.exit();
  const picks = Array.from({ length: 300 }, () => paintSongArt(64, random).subject);
  assert(picks.every((id, i) => i === 0 || id !== picks[i - 1]) && new Set(picks).size === SONG_ART_SUBJECTS.length,
    'each song draws a new cover at random, never the one before, and every face and fish comes up');
}

Input.clearAll();
console.log(failed ? 'SOUND TEST MENU: FAILED' : 'SOUND TEST MENU: PASSED');
process.exit(failed ? 1 : 0);
