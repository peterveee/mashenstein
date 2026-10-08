// BANGER SOUNDS — a preset's editor, over the song it plays in. 7 Oct 2026.
//
// The Banger Sound Palette (tools/banger-palette-entry.js) opens this page in a frame over
// itself when Edit Sound is pressed, and posts it the preview banger it has just made: the
// song, which lanes play which preset, and what to call each part. The page loops that song
// from just before the part enters and puts the desk's own full-window preset editor
// (tools/mixer-voice-editor.js) over it, so a knob is heard in the mix it is for. The title
// bar's preset menu lists every sound in the take, so the hats or the kick can be shaped in
// the same sitting.
//
// A frame rather than a panel on the palette page because the editor is drawn by the desk's
// stylesheet, eight thousand lines written for a page that is all desk. Here it has a
// document of its own, as it does on the MRDR-3 playground (tools/mrdr3-entry.js).
//
// Saving is the desk's, and goes through the same rules (tools/lib/voice-save.js): Update
// writes the preset where it is filed — a library preset changes for every song that names
// it, which the title bar counts before you press it — and Save as New files a copy. Either
// way the server measures it, then re-measures the Lab's level curves in the background,
// and the palette is told what was saved so its own copy follows. A Save as New is swapped
// in for the old sound on the palette, waiting for its Save Changes.
import { Audio } from '../src/engine/audio.js';
import { VOICES } from '../src/data/voices.js';
import { benchPlay, benchLane } from './mixer-voice-library.js';
import { createVoiceEditor, fullLayout } from './mixer-voice-editor.js';
import { createSynthFull } from './mixer-synth-full.js';
import { createWebMidiRouter } from './mixer-synth-keyboard.js';
import { createKnob } from './mrdr3-knob.js';
import { watchDeskSelects, syncDeskSelects } from './mixer-select.js';

const $ = (id) => document.getElementById(id);
const midi = createWebMidiRouter({ storageKey: 'mash-banger-voice-midi-on' });
const framed = window.parent !== window;
const tell = (msg) => { if (framed) window.parent.postMessage(msg, location.origin); };

// What the palette sent: the song, and `sounds` — one row per lane, { lane, part, label,
// preset } — which is how a preset id finds the lanes it is playing on.
const session = {
  song: null, sounds: [], context: '',
  lane: null,          // the lane the editor was opened from
  opened: null,        // the id the palette knows this sound by — what a Save as New replaces
  playing: false,
  soloed: new Set(),
  savedHere: false,    // a save has happened, so the level-curve status is worth showing
};

function toast(message, ms = 2600) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  if (ms) toast.timer = setTimeout(() => el.classList.remove('show'), ms);
}

function ask(title, body, okLabel = 'Discard') {
  return new Promise((resolve) => {
    const modal = $('ask');
    $('asktitle').textContent = title;
    $('askbody').textContent = body.replace(/<[^>]+>/g, '');
    $('askok').textContent = okLabel;
    modal.classList.add('show');
    const done = (answer) => {
      modal.classList.remove('show');
      $('askok').onclick = null; $('askcancel').onclick = null;
      modal.onpointerdown = null; window.removeEventListener('keydown', onKey, true);
      resolve(answer);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); done(false); }
      if (event.key === 'Enter') { event.preventDefault(); done(true); }
    };
    $('askok').onclick = () => done(true);
    $('askcancel').onclick = () => done(false);
    modal.onpointerdown = (event) => { if (event.target === modal) done(false); };
    window.addEventListener('keydown', onKey, true);
  });
}

// ---------------------------------------------------------------- audio
function ensureAudio() {
  // No rewind here, so no rewind recorder — see the same line in tools/mrdr3-entry.js.
  Audio.setCaptureEnabled(false);
  Audio.ensure();
  Audio.resumeAfterPanic?.();
  return !!Audio.ctx;
}
// The frame was opened by a click in the palette, and that click does not count as one
// here: the browser holds this page's audio until something is pressed IN it. The song is
// queued at once and the first touch anywhere lets it out.
const suspended = () => Audio.ctx?.state === 'suspended';
for (const type of ['pointerdown', 'keydown']) {
  addEventListener(type, () => {
    if (!suspended()) return;
    Audio.ctx.resume().then(paintBar, () => {});
  }, true);
}

function applySolo() {
  for (const lane of session.soloed) Audio.mixer?.lane(lane)?.setSolo(true);
}
function clearSolo() {
  for (const lane of session.soloed) Audio.mixer?.lane(lane)?.setSolo(false);
  session.soloed.clear();
}
function play() {
  if (!session.song || !ensureAudio()) return;
  const { bank, mix, arrangement } = session.song;
  Audio.setBank(bank, mix, arrangement, { startAtBeginning: false, gap: 0.05 });
  session.playing = true;
  // A re-bank lays the song's own mix over every strip, solo included.
  applySolo();
  paintBar();
}
function stop() {
  if (!session.playing) return;
  Audio.setBank(null);
  session.playing = false;
  paintBar();
}

/** Every lane playing `id`. */
const lanesOf = (id) => session.sounds.filter((s) => s.preset === id).map((s) => s.lane);

/**
 * Put every lane that is playing `laneKey`'s preset onto `id` — a Save as New, whose copy is
 * the sound being worked on and has to be the one the song plays.
 */
function repoint(laneKey, id) {
  const was = session.sounds.find((s) => s.lane === laneKey)?.preset;
  if (!was || was === id || !VOICES[id]) return;
  for (const s of session.sounds) {
    if (s.preset !== was) continue;
    s.preset = id;
    session.song.mix.voice = { ...(session.song.mix.voice || {}), [`${s.lane}Voice`]: id };
  }
  if (session.playing) play();
}

// ---------------------------------------------------------------- the title bar
const bar = (() => {
  const root = document.createElement('div');
  root.className = 'bvbar';
  const context = document.createElement('span');
  context.className = 'bvcontext';
  const refs = document.createElement('span');
  refs.className = 'bvrefs';
  const levels = document.createElement('span');
  levels.className = 'bvlevels';
  levels.hidden = true;
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'bvplay';
  playBtn.onclick = () => {
    if (suspended()) { Audio.ctx.resume().then(paintBar, () => {}); if (session.playing) return; }
    if (session.playing) stop(); else play();
  };
  // The desk saves from the small panel's footer, shut away while this window is up; here
  // the window is all there is, so its two buttons come up into the title bar.
  const revertBtn = document.createElement('button');
  revertBtn.type = 'button';
  revertBtn.className = 'bvbtn';
  revertBtn.textContent = 'REVERT';
  revertBtn.title = 'Put the sound back to how it was last saved';
  revertBtn.onclick = () => voiceEditor?.discard();
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'bvbtn save';
  saveBtn.textContent = 'SAVE';
  saveBtn.title = 'Update this preset, or Save as New to keep the original and swap the copy in on the palette';
  saveBtn.onclick = () => voiceEditor?.saveSheet();
  root.append(context, refs, levels, playBtn, revertBtn, saveBtn);
  return { root, context, refs, levels, playBtn, revertBtn };
})();

function paintBar() {
  const sound = session.sounds.find((s) => s.lane === session.lane);
  bar.context.textContent = [session.context, sound?.label].filter(Boolean).join(' · ').toUpperCase();
  bar.context.title = bar.context.textContent;
  const waiting = session.playing && suspended();
  bar.playBtn.textContent = waiting ? '▶ CLICK TO HEAR' : session.playing ? '■ STOP' : '▶ PLAY IN SONG';
  bar.playBtn.classList.toggle('playing', session.playing && !waiting);
  bar.playBtn.classList.toggle('wake', waiting);
  bar.playBtn.title = session.playing
    ? 'Stop the banger this sound is playing in'
    : 'Loop the banger from just before this part comes in';
  bar.revertBtn.disabled = !voiceEditor?.dirty;
}

// Who else hears an Update: the songs on disk that name this preset, and the banger styles
// whose sound table does.
let refsSerial = 0;
async function fetchRefs(id) {
  const serial = ++refsSerial;
  bar.refs.textContent = '';
  try {
    const res = await fetch(`/voice-refs?id=${encodeURIComponent(id)}`);
    const { songs = [], styles = [] } = await res.json();
    if (serial !== refsSerial) return;
    const library = !!VOICES[id]?.factory;
    const parts = [];
    if (songs.length) parts.push(`${songs.length} SONG${songs.length === 1 ? '' : 'S'}`);
    if (styles.length) parts.push(`${styles.length} STYLE${styles.length === 1 ? '' : 'S'}`);
    bar.refs.textContent = parts.length ? `IN ${parts.join(' · ')}` : 'IN NO SONG OR STYLE';
    bar.refs.classList.toggle('wide', library && songs.length > 0);
    bar.refs.title = [
      library ? `${VOICES[id].label} is a library preset: Update changes it everywhere it is named.`
        : `${VOICES[id]?.label || id} is a user preset: Update changes it everywhere it is named.`,
      'Save as New leaves it alone and swaps the copy in on the palette.',
      songs.length ? `Songs: ${songs.map((s) => s.title || s.id).join(', ')}` : '',
      styles.length ? `Banger styles: ${styles.join(', ')}` : '',
    ].filter(Boolean).join('\n');
  } catch { /* the count is a courtesy; the save does not depend on it */ }
}

// The Lab predicts each banger channel's fader from a curve measured off the preset
// (tools/banger-levels.js curves). A save changes the sound under that curve, so the server
// re-measures it in the background; this says when the Lab has caught up.
let levelsTimer = 0;
async function watchLevels() {
  clearTimeout(levelsTimer);
  try {
    const res = await fetch('/levels-status');
    const { running, last } = await res.json();
    bar.levels.hidden = !session.savedHere;
    bar.levels.className = `bvlevels${running ? ' busy' : last && !last.ok ? ' bad' : ''}`;
    bar.levels.textContent = running ? 'LAB LEVELS: MEASURING…'
      : last && !last.ok ? 'LAB LEVELS: FAILED — SEE TERMINAL' : 'LAB LEVELS: UP TO DATE';
    bar.levels.title = running
      ? 'Re-measuring how loud the Lab plays this sound, so its faders match the new version'
      : last?.tail || '';
    if (running) levelsTimer = setTimeout(watchLevels, 2000);
  } catch { /* the server went away; nothing to show */ }
}

// ---------------------------------------------------------------- the editor
const keyboardAuditions = new Map();
function releaseKeyboardAudition(src) {
  const held = src && keyboardAuditions.get(src);
  if (!held) return false;
  keyboardAuditions.delete(src);
  if (Audio.ctx) Audio.releasePreviewNote(held.laneKey, held.freq);
  return true;
}
function releaseAllKeyboardAuditions() {
  for (const src of [...keyboardAuditions.keys()]) releaseKeyboardAudition(src);
}

/** The sounds in the take, one per preset, for the title bar's preset menu. */
function soundsInTake() {
  const seen = new Set();
  const out = [];
  for (const s of session.sounds) {
    const v = VOICES[s.preset];
    if (!v || v.kind === 'engine' || seen.has(s.preset)) continue;
    seen.add(s.preset);
    out.push({ id: s.preset, label: v.label || s.preset, category: s.label });
  }
  return out;
}

let voiceEditor = null;
voiceEditor = createVoiceEditor({
  el: $('voiceedit'),
  knob: createKnob,
  toast,
  ask,
  isDevUser: () => true,
  canFile: () => true,
  onChanged: () => {},
  onBlank: () => {},
  onEdit: () => {},
  onDirty: () => paintBar(),
  refresh: (id) => Audio.refreshVoice(id),
  // As the desk has it: with no limiter in the way, an edit's level is compensated live,
  // which is how loud the sound will play once Save has measured it.
  liveCompensation: () => !!Audio.mixer && !Audio.mixer.limiterOn,
  noiseBuf: () => Audio.noiseBuf,
  sampleRate: () => Audio.ctx?.sampleRate || 44100,
  setLayerSolo: (id, key, on) => {
    if (!id) Audio.clearLayerSolo();
    else Audio.setLayerSolo(id, key, on);
  },
  // The editor's S: the whole sound inside the song, on every lane playing it.
  setLaneSolo: (laneKey, on) => {
    const preset = session.sounds.find((s) => s.lane === laneKey)?.preset;
    for (const lane of preset ? lanesOf(preset) : [laneKey]) {
      if (on) session.soloed.add(lane); else session.soloed.delete(lane);
      Audio.mixer?.lane(lane)?.setSolo(on);
    }
  },
  laneSoloOn: (laneKey) => session.soloed.has(laneKey),
  assign: (laneKey, id) => { if (laneKey) repoint(laneKey, id); },
  onSaved: (info) => {
    if (session.lane) repoint(session.lane, info.id);
    const sound = session.sounds.find((s) => s.lane === session.lane);
    tell({ type: 'banger-voice-saved', ...info, from: session.opened, part: sound?.part || null });
    session.opened = info.id;
    session.savedHere = true;
    fetchRefs(info.id);
    // The server starts the re-measure as it answers; give it a moment to be running.
    setTimeout(watchLevels, 300);
  },
  listPresets: () => soundsInTake(),
  selectPreset: (id) => edit(id),
  close: () => closeEditor(),
  midiState: () => midi.state(),
  toggleMidi: (on) => midi.setEnabled(on),
  midiAdapter: midi,
  auditionNote: (midiNote, { src = null } = {}) => {
    const id = voiceEditor.editing;
    const voice = id && VOICES[id];
    if (!voice || !ensureAudio()) return;
    releaseKeyboardAudition(src);
    const freq = 440 * 2 ** ((midiNote - 69) / 12);
    if (benchPlay(Audio, id, freq) && src) keyboardAuditions.set(src, { laneKey: benchLane(voice), freq });
  },
  releaseAudition: ({ midi: midiNote, src = null }) => {
    if (releaseKeyboardAudition(src)) return;
    const id = voiceEditor.editing;
    const voice = id && VOICES[id];
    if (voice && Audio.ctx) Audio.releasePreviewNote(benchLane(voice), 440 * 2 ** ((midiNote - 69) / 12));
  },
  // A filter or VCA switched off changes the native graph rather than a parameter: drop the
  // queued keyboard notes so the next one is a clean read. The song plays on.
  onSectionChange: () => { Audio.stopPreview?.(); },
  panicAudition: () => { releaseAllKeyboardAuditions(); Audio.stopPreview?.(); },
  createFull: ({ kit }) => createSynthFull({
    kit, el: $('synthfull'), backdrop: $('synthfullback'),
    keyboard: { octaves: 5, initialOctave: 2 },
    headExtra: () => bar.root,
  }),
});

/** Open the editor on `id`, from the lane the take plays it on. */
function edit(id) {
  const voice = VOICES[id];
  if (!voice) { toast(`${id} is not in the catalogue`); return false; }
  let layout = null;
  try { layout = fullLayout(voice); } catch { layout = null; }
  if (!layout) { toast(`${voice.label || id} has no full editor — open it on the desk`, 4000); return false; }
  // A solo belongs to the sound it was pressed for; carried to the next one it would be
  // the old sound alone and the new one silent.
  clearSolo();
  const sound = session.sounds.find((s) => s.preset === id) || null;
  const opened = voiceEditor.open(id, {
    laneKey: sound?.lane || null, laneLabel: sound?.label || null, allowLibraryUpdate: true,
  });
  if (!opened) return false;
  session.lane = sound?.lane || null;
  session.opened = opened;
  voiceEditor.openFull(1, { standalone: true });
  fetchRefs(opened);
  paintBar();
  return true;
}

let closing = false;
async function closeEditor() {
  if (closing) return;
  closing = true;
  try {
    if (voiceEditor.dirty) {
      const label = VOICES[voiceEditor.editing]?.label || 'This sound';
      const ok = await ask('Discard preset edits?',
        `${label} has changes that are not saved. Close the editor and lose them?`, 'Discard');
      if (!ok) { voiceEditor.openFull(1, { standalone: true }); return; }
    }
    stop();
    clearSolo();
    releaseAllKeyboardAuditions();
    voiceEditor.forget();
    tell({ type: 'banger-voice-close' });
  } finally {
    closing = false;
  }
}

// ⎋ closes the window, as on the desk. A dialog over it (ask, the save sheet, the preset
// search) takes its own Escape first and marks it handled.
addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape' || ev.defaultPrevented || !voiceEditor.fullOpen) return;
  ev.preventDefault();
  voiceEditor.closeFull();
});

addEventListener('message', (ev) => {
  if (ev.origin !== location.origin || ev.source !== window.parent) return;
  const msg = ev.data;
  if (msg?.type !== 'banger-edit') return;
  session.song = msg.song;
  session.sounds = msg.sounds || [];
  session.context = msg.context || '';
  $('bvempty').hidden = true;
  if (!edit(msg.preset)) { tell({ type: 'banger-voice-close' }); return; }
  play();
});

// Every dropdown the editor draws is the desk's own, never the OS popup — the same sweep
// the desk runs (tools/mixer-select.js), and its re-read on each frame.
watchDeskSelects();
const syncSelects = (now) => { syncDeskSelects(now); requestAnimationFrame(syncSelects); };
requestAnimationFrame(syncSelects);

if (framed) tell({ type: 'banger-voice-ready' });
else $('bvempty').textContent = 'OPEN THIS FROM THE BANGER SOUND PALETTE — EDIT SOUND ON A PRESET';
paintBar();
