// The mixing desk. Imports the game's own engine — every fader you move is moving
// the same channel strip the game will use, and the same one the offline renderer
// runs when it writes a WAV. Nothing here reimplements audio.
import { Audio } from '../src/engine/audio.js';
import { LANES, deskLanes as engineDeskLanes, laneActivity, deskBank, songBlocks, barPlan, LANE_KEYS } from '../src/engine/lanes.js';
// The arrangement layer: what plays when, as opposed to what it sounds like. The
// desk edits it in bars (`arrangement-edit`), the engine reads it back as an order.
import { ARRANGEMENTS, applyArrangement, arrangementIssues } from '../src/data/arrangements.js';
import {
  draftOf, entryOf, setLanesOff, setLanesDeleted, deleteBars, duplicateBars,
  transposeBars, offsetBars, gainBars, copyBars, pasteBars,
  insertSilence, copyLaneBars, writeBarNotes, writeBarNotesShared, patternStarts,
  barCount, removeLanes, setTempo, readBarLane,
} from './lib/arrangement-edit.js';
// Recording: the fourth caller of the one-note seam the keyboard, the computer keys
// and MIDI already share. It owns the clock and the buffer; the note semantics are
// the roll's, which it imports rather than restating. See tools/lib/note-recorder.js.
import {
  createTake, quantiseStep, heldLength, chordAnchor, laneKind, barOfStep, stepInBar,
} from './lib/note-recorder.js';
import { noteName } from '../src/engine/notes.js';
import { listTracks, resolveTrack, registerTrack, unregisterTrack } from '../src/data/tracks.js';
// The picker's own list: the library, less the song quotations nothing in the game
// plays any more. See src/data/voices-in-play.js.
import { offeredVoices, offeredByCategory } from '../src/data/voices-in-play.js';
// Side effect on purpose: this registers everything in src/data/imported/ as a track,
// which is what puts an imported .mid in the song picker. The game does not import
// it, so nothing in that folder ships.
import '../src/data/imported/index.js';
import { MIX, laneSettings, LANE_DEFAULTS } from '../src/data/mix.js';
import { VOICES, VOICE_LANES, seamFor, isLayer, baseLane, defaultVoiceOf, voiceOf, registerSongVoice, songVoiceKey, isKitVoice, PERCUSSION_LANES, DEFAULT_ADDED_PERCUSSION_VOICE, polyLane } from '../src/data/voices.js';
import { createVoiceEditor } from './mixer-voice-editor.js';
// The preset library, and the bench a preset with no channel of its own is heard on.
import {
  createVoiceLibrary, benchPlay, benchRoot, benchIsKit, benchLane, foldIcon,
  SCALES, SCALE_BY_ID, PITCH_CLASSES, inScale,
} from './mixer-voice-library.js';
// The step grid: what the kit PLAYS, as opposed to which bars let it through. It
// writes through the same arrangement seam everything else in this section does.
import { createStepSeq } from './mixer-step-seq.js';
// The pitched half. Same window, same write path — see mixer-bar-grid.js.
import { createPianoRoll, rollEditable, rollResizable } from './mixer-piano-roll.js';
import { discardSongDraft, restoreSongDraft } from './lib/mixer-drafts.js';
// Scratch songs are born named — the desk suggests one the drawer is not using yet.
import { randomSongName } from './lib/song-names.js';
// The style packs a new song can be generated in. Data only, so the dialog can list
// them and show each one's tempo without asking the server what it has.
import { SONG_STYLES } from './lib/song-styles.js';
// The musical machinery that turns a seed into a playable bank — browser-safe, so
// New Song works on the static deployed mixer without a server.
import { newSongPlan } from './lib/new-song-plan.js';
// What the desk means by "changed": a mix reduced to what src/data/mix.js can hold.
// Shared with the serialiser's tests, which hold the two to each other.
import { mixChanged } from './lib/mix-signature.js';
import { DELAY_DIVISIONS, AUXES, AUX_DEFAULTS, gainToDb, dbToGain } from '../src/engine/mixer.js';
import { EFFECTS, EFFECT_BY_ID, paramRange, visibleParams, SYNC_DIVISIONS, RATE_DIVISIONS, MAX_EFFECTS, ENGINE_BASE_COST, syncSeconds, DEFAULT_MASTER_CHAIN } from '../src/engine/effects.js';

const $ = (id) => document.getElementById(id);
// Dev mode: the local server is DEV by default. Only an explicit `?dev=0` makes
// this tab a regular user session; static builds emit a false server flag and stay
// USER even if somebody adds an unrelated query parameter.
const _urlDev = new URLSearchParams(location.search).get('dev');
const DEV_USER = _urlDev === '0' ? false : globalThis.__MASH_MIXER_DEV_USER__ === true;
const DEV_OVERRIDDEN = _urlDev === '0';
const role = $('songrole');
if (role) {
  role.textContent = DEV_USER ? 'DEV' : 'USER';
  role.title = DEV_USER
    ? `Developer mode${DEV_OVERRIDDEN ? ' (forced by ?dev=1)' : ''} — library presets can be updated in place`
    : `Regular user mode${DEV_OVERRIDDEN ? ' (forced by ?dev=0)' : ''} — library presets can be saved as new user presets`;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LS_KEY = 'mash-mixer-draft';
const MIDI_LS_KEY = 'mash-mixer-midi-on';

/** A browser-safe filename slug — the same logic as tools/lib/imported-index.js. */
const slugForClient = (name) => String(name)
  .replace(/\.midi?$/i, '').replace(/\.js$/i, '')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'scratch';

/** First letter up, the rest left alone — so FM Keys and dB survive it. */
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * A song this desk MADE, whatever heading it is filed under.
 *
 * Scratch songs and style auditions are one kind of thing to everything that acts on
 * a file — both live in src/data/imported, both carry the desk's marker, both can be
 * saved and deleted here — and two kinds of thing only to the picker, which lists them
 * separately because they are for different jobs. Asked as a question rather than
 * spelled out at each of the three gates, so a third heading is one line here.
 */
const isDeskSong = (t) => t?.group === 'scratch' || t?.group === 'styleAudition';

// The engine writes its lane names in lower case, because there they are keys into
// stem files and mix entries rather than words anyone reads. On the desk they ARE
// words anyone reads — a strip head, a pad, an arrangement row, half the toasts —
// so they are capitalised here, at the one door they come through, rather than in
// src/engine/lanes.js where renaming them would be renaming the game's data.
const deskLanes = (bank, repeat = 1) =>
  engineDeskLanes(bank, repeat).map((l) => ({ ...l, label: cap(l.label) }));

// ---- state -----------------------------------------------------------------
// `draft` holds unsaved edits per track id, so switching songs and coming back
// picks up exactly where you left off. `saved` is what is on disk — seeded from the
// module this page was bundled with, and replaced wholesale by what the server reads
// back off the file after every Save, so a tab left open all day does not keep
// believing in this morning's version of the songs it is not working on.
let saved = JSON.parse(JSON.stringify(MIX));
let draft = {};
try { draft = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { draft = {}; }

// The arrangement layer, kept exactly as the mix is: what the file holds, and what
// has been edited on top of it. Stored in the FILE's shape (`{order, sections}`)
// rather than the editor's bar list, because that is the compact form — a song's
// whole arrangement is usually one line of numbers — and because it is what Save
// posts and what a snapshot restores.
const ARRANGE_KEY = 'mash-mixer-arrangement';
let savedArr = JSON.parse(JSON.stringify(ARRANGEMENTS));
let arrDraft = {};
try { arrDraft = JSON.parse(localStorage.getItem(ARRANGE_KEY) || '{}'); } catch { arrDraft = {}; }

/** The arrangement in force for a song: its unsaved edit, else the file, else none. */
const arrFor = (id) => (id in arrDraft ? arrDraft[id] : savedArr[id]) || null;
/** Has this song's ARRANGEMENT been changed away from what the file holds? */
const arrDirty = (id) => id in arrDraft
  && JSON.stringify(arrDraft[id] || null) !== JSON.stringify(savedArr[id] || null);

// The song you were last on. A desk that opens on someone else's song makes you
// find yours again before you can hear whether last night's change was right.
const SONG_KEY = 'mash-mixer-song';
const lastSong = localStorage.getItem(SONG_KEY);
let trackId = (lastSong && resolveTrack(lastSong)) ? lastSong : (Object.keys(saved)[0] || 'plumber');
let track = null;
let playing = false;
let abHeld = false;

// Arrangement note language is a desk preference, not song data. The cells remain the
// hit targets and accessibility surface; this choice only changes how their activity is
// painted. `solid` is deliberately the simplest fallback and the first-run default.
const NOTE_VISUALS = [
  ['solid', 'Solid'],
  ['pulse', 'Fine Pulse Dots'],
  ['trail', 'Elastic Trails'],
];
const NOTE_VISUAL_KEY = 'mash-mixer-note-visual';
const NOTE_ANIMATION_KEY = 'mash-mixer-note-animation';
const savedNoteVisual = localStorage.getItem(NOTE_VISUAL_KEY);
const savedNoteVisualIsValid = NOTE_VISUALS.some(([id]) => id === savedNoteVisual);
// Retired trail variants become the unified Elastic Trails language instead of
// unexpectedly dropping an existing desk back to Solid on the next load.
let noteVisualMode = savedNoteVisual == null
  ? 'solid'
  : (savedNoteVisualIsValid ? savedNoteVisual : 'trail');
const savedNoteAnimation = localStorage.getItem(NOTE_ANIMATION_KEY);
let noteAnimation = savedNoteAnimation == null
  ? !matchMedia('(prefers-reduced-motion: reduce)').matches
  : savedNoteAnimation === 'on';
let arrCellsPerBar = 1;
let arrPlayingCells = [];
// The sixteenth those marks were set off by, so a second attack on the same mark can be
// told apart from the first one still being held.
let arrPlayingAt = null;
const arrEchoCells = new Set();
const arrEchoTimers = new Map();
const ARR_ECHO_DURATION = 720;
// Add Track is a two-step gesture: hold the new lane here while its preset picker is
// open, and only write it into the song after the user chooses what it plays. Closing
// the picker therefore cannot leave an empty channel behind.
let pendingAddTrack = null;

const emptyMix = () => ({ master: 0, masterPan: 0, limiter: false, lanes: {}, voice: undefined });
const emptyLaneMix = () => ({
  ...LANE_DEFAULTS,
  eq: { ...LANE_DEFAULTS.eq },
  send: { ...LANE_DEFAULTS.send },
  effects: [],
});
/**
 * The mix in force for a song — and always in the shape the desk edits.
 *
 * The serialiser leaves `lanes` out of the file when no channel has been touched (see
 * tools/lib/mix-source.js), so a song whose only saved decisions are layers, voices or
 * an off-list comes back from disk with no `lanes` at all — every imported song starts
 * that way. Half the desk indexes `mix.lanes[key]` straight, and the first thing to do
 * it was buildRack, which cleared the rack before it threw and left the sends detached
 * for every build after. Filling the gap in one place is cheaper than an optional chain
 * on each of them, and it is in place on purpose: the object handed back is the draft or
 * the file's own, and everything that mutates a mix expects to be writing into it. An
 * empty lanes object signs as no change (see mixSignature), so no song becomes dirty by
 * being looked at.
 */
const mixFor = (id) => {
  const m = draft[id] || saved[id] || emptyMix();
  if (!m.lanes || typeof m.lanes !== 'object') m.lanes = {};
  return m;
};

// The mix and arrangement are song data; the panels around them are the desk. A
// keyboard left open while working on one song should not unexpectedly cover a
// different song, and a piano roll is useful context when returning to the melody
// that was being edited. Keep only that workspace context here — never audio or mix
// state — keyed by the same stable song id used by drafts and recent songs.
const SONG_LAYOUT_KEY = 'mash-mixer-song-layout';
let songLayouts = {};
try { songLayouts = JSON.parse(localStorage.getItem(SONG_LAYOUT_KEY) || '{}') || {}; }
catch { songLayouts = {}; }
let restoringSongLayout = false;

function saveSongLayouts() {
  localStorage.setItem(SONG_LAYOUT_KEY, JSON.stringify(songLayouts));
}

function currentSongLayout() {
  // Which panels are open: the on-screen keyboard, the step grid window, and whether
  // the notes panel (piano roll) is visible. The Arrangement, Mixer and Effects folds
  // are NOT in here — they are desk furniture and are remembered globally, next to the
  // panel heights, so they do not change under you when you switch songs.
  return { keyboard: oskShown(), notes: !$('notes').classList.contains('collapsed'), grid: stepSeq.isOpen() };
}

function notesOpenInLayout(layout) {
  if (!layout) return null;
  if (layout.notes != null) return layout.notes === true;
  if (layout.view != null) return layout.view === 'notes';
  return null;
}

function rememberSongLayout(id = trackId) {
  if (restoringSongLayout || !id || !track || !resolveTrack(id)) return;
  songLayouts[id] = currentSongLayout();
  saveSongLayouts();
}

function restoreSongLayout(id) {
  const layout = songLayouts[id];
  // A first visit inherits the current desk rather than surprising the user by
  // closing panels they just opened. It is recorded after the song is loaded, so
  // subsequent visits become song-specific.
  if (!layout) return false;
  restoringSongLayout = true;
  try {
    // Restore which panels were open. The old `editor` / `view` keys are from when
    // Effects and Notes shared one region; `notes` is the new key for the independent
    // notes panel. If neither is present, leave both panels at their defaults.
    const notesOpen = notesOpenInLayout(layout);
    if (notesOpen != null) setNotesFolded(!notesOpen, false);
    stepSeqWanted = layout.grid === true || layout.editor === 'step';
    stepSeq.open(stepSeqWanted);
    $('seqbtn').classList.toggle('on', stepSeqWanted);
    showOsk(layout.keyboard === true);
  } finally {
    restoringSongLayout = false;
  }
  return true;
}

// Persist the current song's workspace even when the user reloads without changing
// songs. This is deliberately page-lifecycle state, not a Save-to-game operation.
addEventListener('pagehide', () => rememberSongLayout());

/**
 * The song as this mix shapes it: layers materialised, deleted tracks gone — and as
 * this ARRANGEMENT orders it: the bars it plays, in the order it plays them, with
 * the lanes each bar drops.
 *
 * Everything on the desk that asks "what tracks does this song have" asks this rather
 * than `track.bank` — the rack, the arrangement, the lane numbers, the labels — so
 * there is one answer and the desk cannot disagree with the engine about it. Cached
 * on the shape alone, because the answer changes only when a track is duplicated or
 * deleted, or a bar is edited, and building the arrangement asks for it once per row.
 *
 * The arrangement goes on FIRST, matching applyMix: it changes which sections exist,
 * and deskBank has to rewrite the layer lanes into all of them.
 */
let bankCache = { bank: null, sig: null, out: null };
function viewBank() {
  const m = mixFor(trackId);
  const arr = arrFor(trackId);
  const sig = JSON.stringify([m.layers || null, m.off || null, arr]);
  if (bankCache.bank !== track?.bank || bankCache.sig !== sig) {
    const arranged = applyArrangement(track?.bank, trackId, { [trackId]: arr });
    bankCache = { bank: track?.bank, sig, out: deskBank(arranged, m) };
  }
  return bankCache.out;
}
/**
 * Has this song been changed away from what the file holds?
 *
 * The draft is the only place an edit can live, so no draft is no change — whatever
 * is saved for the song. Comparing the mixes straight through missed that: an absent
 * draft signs as null, a saved mix with anything in it does not, so every one of the
 * 34 songs in mix.js read as dirty from the moment the desk opened, and reverting —
 * which deletes the draft — put it straight back.
 *
 * A draft that EXISTS and signs as null is a different thing and still counts: that is
 * every channel reset to defaults, which is a change worth writing if the file holds
 * anything else.
 *
 * What counts as a difference is `mixSignature` — a mix reduced to what mix.js can
 * hold — and it is shared with the serialiser's own tests rather than written out
 * again here. See tools/lib/mix-signature.js for what that is worth.
 */
// Either half counts: a song whose bars have been rearranged has something to save
// even if no fader moved, and the dot on the hamburger is about whether the FILE has heard it.
const isDirty = (id) => (draft[id] != null && mixChanged(draft[id], saved[id])) || arrDirty(id);

// Undo holds whole-mix snapshots per track. Slider drags coalesce: a continuous
// drag is one gesture, so undo steps back over the whole move rather than one
// step per pixel.
const undoStack = [];
let lastEditTag = null;
let lastEditAt = 0;

function pushUndo(tag) {
  const now = performance.now();
  const coalesce = tag != null && tag === lastEditTag && now - lastEditAt < 700;
  lastEditTag = tag; lastEditAt = now;
  if (coalesce) return;
  undoStack.push({
    trackId,
    mix: JSON.parse(JSON.stringify(draft[trackId] ?? null)),
    // The song's SHAPE, alongside its balance. A step that put back the faders and
    // left the bars where an edit had moved them would be half an undo, and the half
    // it left behind is the one you can hear.
    arr: JSON.parse(JSON.stringify(arrDraft[trackId] ?? null)),
    hadArr: trackId in arrDraft,
  });
  if (undoStack.length > 200) undoStack.shift();
  $('undo').disabled = false;
}

// Every step on this stack is one song wide, and there is deliberately no way to make
// one that is not: nothing on this desk writes to a song other than the one on it. See
// the note over `restoreFrom`.

function editMix(mutate, tag, { undo = true } = {}) {
  if (undo) pushUndo(tag);
  const cur = JSON.parse(JSON.stringify(mixFor(trackId)));
  mutate(cur);
  draft[trackId] = cur;
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  updateStatus();
}

// ---- tooltips ---------------------------------------------------------------------
//
// One card for the whole page, filled and moved on hover. Any element carrying
// `data-tip` gets one: the name goes in bold, `data-tipkey` becomes the key chip beside
// it, and `data-tipsays` is the sentence underneath — which is the only reason to have
// built this rather than leave the browser's `title` doing it. A row of icon buttons is
// exactly the case a one-line grey system tooltip cannot serve: the picture is the label,
// so the tooltip has to carry both the name AND what the thing is for.
//
// Never both: an element with `data-tip` must not also have a `title`, or the OS draws
// its own on top a second later.
const TIP_DELAY = 340;         // long enough that crossing the row does not flash six cards
let tipTimer = null;
let tipTarget = null;

function hideTip() {
  clearTimeout(tipTimer);
  tipTimer = null;
  tipTarget = null;
  $('tip').classList.remove('show', 'in');
}

function showTip(el) {
  const tip = $('tip');
  tip.textContent = '';
  const head = document.createElement('div');
  head.className = 'tiphead';
  const name = document.createElement('span');
  name.className = 'tipname';
  name.textContent = el.dataset.tip;
  head.append(name);
  if (el.dataset.tipkey) {
    const key = document.createElement('kbd');
    key.className = 'tipkey';
    key.textContent = el.dataset.tipkey;
    head.append(key);
  }
  tip.append(head);
  if (el.dataset.tipsays) {
    const says = document.createElement('div');
    says.className = 'tipsays';
    says.textContent = el.dataset.tipsays;
    tip.append(says);
  }
  const arrow = document.createElement('span');
  arrow.className = 'tiparrow';
  tip.append(arrow);

  // Shown first, then placed. The card is sized by its own sentence, so how much room it
  // needs — and therefore whether it fits below the button — cannot be known until it is
  // in the page and measured.
  tip.classList.add('show');
  const r = el.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  const gap = 9;
  const below = r.bottom + gap + box.height <= innerHeight - 6;
  const left = Math.max(6, Math.min(r.left + r.width / 2 - box.width / 2,
    innerWidth - box.width - 6));
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(below ? r.bottom + gap : r.top - gap - box.height)}px`;
  // The card is clamped to the window and the button is not, so at the ends of a row the
  // two stop agreeing about where the middle is. The arrow follows the BUTTON — a point
  // aimed at the centre of a card that had to move is a point aimed at nothing.
  arrow.classList.toggle('under', !below);
  const at = Math.max(11, Math.min(r.left + r.width / 2 - left, box.width - 11));
  arrow.style.left = `${Math.round(at - 4.5)}px`;
  requestAnimationFrame(() => tip.classList.add('in'));
}

addEventListener('pointerover', (ev) => {
  const el = ev.target.closest?.('[data-tip]') || null;
  if (el === tipTarget) return;
  hideTip();
  if (!el) return;
  tipTarget = el;
  tipTimer = setTimeout(() => { if (tipTarget === el) showTip(el); }, TIP_DELAY);
});
// Reached by keyboard, the tip is the only label there is — the buttons are pictures — so
// it comes up at once rather than after a delay meant to keep a moving pointer quiet.
addEventListener('focusin', (ev) => {
  const el = ev.target.closest?.('[data-tip]');
  if (!el || !el.matches(':focus-visible')) return;
  hideTip();
  tipTarget = el;
  showTip(el);
});
addEventListener('focusout', hideTip);
// Capture, so the card is gone before the click it belongs to opens a panel underneath it.
addEventListener('pointerdown', hideTip, true);
addEventListener('keydown', hideTip, true);
addEventListener('scroll', hideTip, true);
addEventListener('blur', hideTip);

let toastTimer = null;
/**
 * How long a message stays up, and why it is a multiplier rather than a new default.
 *
 * A toast on this desk lands in the corner while your eyes are on the thing you just
 * changed — a fader, a note, an effect you dropped — so the clock starts before you
 * look at it, not when it appears. At 2.2s the sentence was usually gone by the time
 * you turned your head, which makes it a flicker rather than a message.
 *
 * The call sites say RELATIVE length — "this warning is longer than that confirmation"
 * — and that ordering is right; it was only the floor that was wrong. So they keep
 * their numbers and the stretch lands here, where raising it raises all of them
 * together. Capped, because past ten seconds a message stops reading as a reply to
 * something you did and starts reading as a thing stuck on the screen.
 */
const TOAST_STRETCH = 2;
const TOAST_MAX_MS = 10000;
// `ms: 0` holds the toast until something replaces it — for a job that takes longer
// than a message about it should be on screen, like an offline render. It is not
// stretched, because it is not a duration.
function toast(msg, ms = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  if (ms) {
    toastTimer = setTimeout(() => t.classList.remove('show'),
      Math.min(TOAST_MAX_MS, ms * TOAST_STRETCH));
  }
}

function undo() {
  // A take that has not been written yet is not on this stack, so undoing past it would
  // step back over the bar BEFORE the one you just played — and then the buffered notes
  // would land on top of what was restored. Writing it first makes ⌘Z mean what it
  // looks like it means: take the last thing I played back off.
  if (recArmed) endTake('undo', { announce: false });
  const step = undoStack.pop();
  if (!step) { toast('Nothing to undo'); return; }
  lastEditTag = null;
  // What the sequencer is playing, and what it is playing WITH — as opposed to what
  // the strips are doing to it. Everything else on this desk is a live node that
  // applyToEngine can move, but a voice is a bank key and a duplicated or deleted
  // track is a lane: undoing either has to re-bank, or the desk goes back and the
  // sound does not. Read before the draft is restored, compared after.
  const bankSig = () => {
    const m = mixFor(trackId);
    return JSON.stringify([m.voice || null, m.layers || null, m.off || null]);
  };
  const before = bankSig();
  const arrBefore = JSON.stringify(arrFor(step.trackId) || null);
  if (step.mix === null) delete draft[step.trackId];
  else draft[step.trackId] = step.mix;
  // The arrangement half of the step. `hadArr` distinguishes "there was no unsaved
  // arrangement edit" from "there was one, and it was empty" — the second is a real
  // state (a song reverted to its written form) and deleting the key would lose it.
  if (step.hadArr) arrDraft[step.trackId] = step.arr;
  else delete arrDraft[step.trackId];
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
  $('undo').disabled = undoStack.length === 0;
  const arrMoved = JSON.stringify(arrFor(step.trackId) || null) !== arrBefore;
  if (step.trackId === trackId && arrMoved) {
    // Bars moved: the sequencer needs the order it had, and the timeline and grid
    // are both drawn from it. Handed over without stopping, like the edit was.
    bankCache.sig = null;
    Audio.setArrangement(arrFor(trackId));
    // The tempo lives on the arrangement too, so undoing one is undoing the other —
    // and a readout still showing the tempo the song no longer plays at is the half
    // of the undo you can see.
    pushTempo();
    buildTimeline();
  }
  if (step.trackId !== trackId) { selectSong(step.trackId); }
  else if (bankSig() !== before || arrMoved) {
    // The lane list may have changed under it, so the arrangement is rebuilt too —
    // a row for a track that is no longer there is a row that plays nothing.
    rebuildForShape();
    updateStatus();
  } else {
    buildRack(); applyToEngine(mixFor(trackId)); updateStatus();
  }
  toast('undone');
}

/**
 * Re-bank the sequencer without losing your place in the song.
 *
 * `setBank` restarts from bar 1 by design — a new song should start at its top. A
 * voice change is not a new song, so the step is carried across by hand: half a
 * second of silence (setBank's own clean gap) with the playhead where you left it.
 *
 * A stopped desk has nothing to re-bank. Handing the engine a bank is also what makes
 * it PLAY — the sequencer runs whenever there is one — so choosing a voice while
 * paused used to start the song under a transport that said it was stopped, and from
 * there `playing` and the engine disagreed about everything: the next song switch read
 * `playing` as false, skipped its own re-bank, and left the previous song running under
 * the new song's name. Play re-banks with whatever the mix says, so the change is
 * heard the moment there is anything to hear it in.
 */
function rebank() {
  if (!playing) return;
  // Not setBank: that is the song-CHANGE door, and it mutes for half a second on the
  // way through. Choosing a preset is not a song change — it is a question about the
  // bar you are listening to, and the answer has to arrive in it. See reapplyBank.
  Audio.reapplyBank(track.bank, mixFor(trackId), arrFor(trackId));
}

/** The IEC power mark — the same one Logic puts on the left of an insert slot. */
function powerIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('class', 'pwr');
  const ring = document.createElementNS(NS, 'path');
  ring.setAttribute('d', 'M3.6 3.7a3.4 3.4 0 1 0 4.8 0');
  const stem = document.createElementNS(NS, 'path');
  stem.setAttribute('d', 'M6 1.9v3.7');
  svg.append(ring, stem);
  return svg;
}

/**
 * Remove. A drawn multiplication cross — two even diagonals at the same angle —
 * rather than the letter x, which leans and has a different weight in every
 * typeface. Chunkier than the power mark: it is the destructive one.
 */
function closeIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('class', 'pwr cross');
  for (const d of ['M3.3 3.3 8.7 8.7', 'M8.7 3.3 3.3 8.7']) {
    const stroke = document.createElementNS(NS, 'path');
    stroke.setAttribute('d', d);
    svg.append(stroke);
  }
  return svg;
}

/**
 * Where a target keeps its effect chain. A channel, a send and the master each
 * store theirs in a different corner of the mix, and every writer needs all three
 * cases — so there is one of them, and adding a fourth kind of strip is one line.
 */
function storeEffects(m, key, list) {
  // The master keeps its list even when it is empty — the one strip that does. It is
  // stored rather than deleted so this branch stays the same shape as the aux one
  // beside it, and so a future seed here (there was one once: a bypassed bus
  // compressor) cannot come back on the next read after being taken off.
  if (key === '__master') {
    m.masterEffects = list;
  } else if (key.startsWith('__aux:')) {
    const id = key.slice(6);
    m.fx = m.fx || {};
    m.fx[id] = { ...AUX_DEFAULTS[id], ...(m.fx[id] || {}) };
    if (list.length) m.fx[id].effects = list; else delete m.fx[id].effects;
  } else {
    const L = laneOf(m, key);
    if (list.length) L.effects = list; else delete L.effects;
  }
}

/**
 * The insert-slot list every strip carries — channels, sends and master alike, so
 * all three read as the same object. Logic's layout, our palette.
 *
 * `rows` is the longest chain anywhere in the rack plus a spare, not this strip's:
 * every strip reserves the same block so the rule above the slots lands on one line
 * across the whole desk instead of wandering with each channel's count, and the
 * spare is where the next effect goes on whichever strip you are on.
 */
// One line of the insert block: a 23px button, the 2px that sits it off the line
// above, and the 4px gap to the next. The reserved height is counted in these, so
// a chain and the empty slot under it end exactly on the block's bottom edge.
const SLOT_ROW = 29;
// Which slot is being dragged, while it is being dragged. One at a time, so one
// variable — the drag is a gesture, not a state anything else can observe.
let dragFromSlot = null;

function insertSlots(key, label, rows) {
  const el = document.createElement('div');
  el.className = 'fxbtns';
  // The empty slot under the chain is where the next effect would go, so clicking it
  // opens the catalogue. Plain click, not right-click: there is only one thing you
  // could mean by clicking an empty slot, and a menu to choose it from is a step for
  // nothing. Right-click does the same, for anyone who tries it.
  //
  // The OUTLINE, and nothing else. The rest of the block is reserved height — the
  // room the longest chain in the rack needs, which every strip holds so the slots
  // land on one line — and a catalogue opening out of that empty space is a popup
  // from a click that was aimed at the strip. One click on any strip, selected or
  // not: the outline comes up under the pointer before the click lands, so you are
  // always aiming at something you can see.
  const openHere = (ev) => {
    if (!ev.target.classList.contains('addslot')) return;
    ev.preventDefault();
    ev.stopPropagation();
    selectLane(key);
    if (effectsOf(key).length >= MAX_EFFECTS) {
      toast(`${MAX_EFFECTS} effects is the limit on one strip — remove one first`);
      return;
    }
    closeMenu();
    openPicker({ anchor: el, x: ev.clientX, y: ev.clientY });
  };
  el.addEventListener('click', openHere);
  el.addEventListener('contextmenu', openHere);
  const list = effectsOf(key);
  const slots = rows ?? Math.max(1, list.length);
  el.style.height = `${slots * SLOT_ROW - 4}px`;      // no gap hanging off the last line
  list.forEach((e, i) => {
    const def = EFFECT_BY_ID[e.id];
    const btn = document.createElement('button');
    btn.className = e.bypass ? '' : 'on';
    // The power mark toggles the effect; the name opens it. Two targets in one slot,
    // the way an insert slot works everywhere else.
    const power = document.createElement('span');
    power.className = 'pwrhit';
    power.append(powerIcon());
    power.title = `${e.bypass ? 'Enable' : 'Bypass'} ${def?.name || e.id}`;
    const toggle = () => {
      const next = list.map((x, j) => (j === i ? { ...x, bypass: !x.bypass } : x));
      editMix((m) => storeEffects(m, key, next), null);
      bypassOn(key, i, !e.bypass);
      buildRack();
      toast(`${def?.name || e.id} ${next[i].bypass ? 'bypassed' : 'on'} — ${label}`);
    };
    power.onclick = (ev) => { ev.stopPropagation(); toggle(); };
    const name = document.createElement('span');
    name.className = 'fxname';
    name.textContent = def?.short || def?.name || e.id;
    // And out the other side: remove, on the right, on hover. Both marks are
    // revealed by the pointer, so an untouched slot is just a name.
    const remove = document.createElement('span');
    remove.className = 'rmhit';
    remove.append(closeIcon());
    remove.title = `Remove ${def?.name || e.id} from ${label}`;
    remove.onclick = (ev) => {
      ev.stopPropagation();
      setEffects(key, list.filter((_, j) => j !== i));
      toast(`${def?.name || e.id} removed from ${label} — ⌘Z to undo`);
    };
    btn.append(power, name, remove);
    btn.title = `${def?.name || e.id} — click to open it below`
      + `\nThe power mark ${e.bypass ? 'enables' : 'bypasses'} it without leaving the fader`;
    btn.onclick = (ev) => {
      ev.stopPropagation();
      if (ev.altKey) { toggle(); return; }        // ⌥-click still works from anywhere
      // Otherwise: switch to this strip and open this effect, which is what clicking
      // the name of a thing usually means.
      selectLane(key);
      focusDevice(i);
    };

    // Drag a slot onto another to reorder the chain, the same gesture as the cards
    // in the panel below. The order IS the signal path, so being able to shove a
    // filter in front of a delay without opening anything is worth the wiring.
    btn.draggable = true;
    btn.addEventListener('dragstart', (ev) => {
      dragFromSlot = i;
      btn.classList.add('dragging');
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', String(i));   // Firefox needs a payload
    });
    btn.addEventListener('dragend', () => {
      dragFromSlot = null;
      for (const b of el.children) b.classList.remove('dragging', 'dropzone');
    });
    btn.addEventListener('dragover', (ev) => {
      if (dragFromSlot == null || dragFromSlot === i) return;
      ev.preventDefault();
      btn.classList.add('dropzone');
    });
    btn.addEventListener('dragleave', () => btn.classList.remove('dropzone'));
    btn.addEventListener('drop', (ev) => {
      ev.preventDefault();
      btn.classList.remove('dropzone');
      if (dragFromSlot == null || dragFromSlot === i) return;
      const next = effectsOf(key);
      const [moved] = next.splice(dragFromSlot, 1);
      next.splice(i, 0, moved);
      dragFromSlot = null;
      setEffects(key, next);
      toast(`${EFFECT_BY_ID[moved.id]?.name || moved.id} moved to ${i + 1} of ${next.length}`);
    });

    // Everything you can do to one slot, in one place — the strip's own menu is
    // about the channel, and a right-click on an effect is about the effect.
    btn.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      selectLane(key);
      const nm = def?.name || e.id;
      const cur = effectsOf(key);
      const room = cur.length < MAX_EFFECTS;
      const reorder = (to) => {
        const next = [...cur];
        const [moved] = next.splice(i, 1);
        next.splice(to, 0, moved);
        setEffects(key, next);
        toast(`${nm} moved to ${to + 1} of ${next.length}`);
      };
      openMenu(ev.clientX, ev.clientY, `${nm} · ${targetLabel(key)}`, [
        { label: 'Open below', run: () => { selectLane(key); focusDevice(i); } },
        { label: e.bypass ? 'Enable' : 'Bypass', run: toggle },
        { label: 'Copy settings', run: () => {
          fxClipboard = { id: e.id, name: nm, params: { ...(e.params || {}) } };
          toast(`${nm} settings copied`);
        } },
        fxClipboard && fxClipboard.id === e.id && {
          label: `Paste settings from ${fxClipboard.name}`,
          run: () => {
            setEffects(key, cur.map((x, j) => (j === i ? { ...x, params: { ...fxClipboard.params } } : x)));
            toast(`${nm} — settings pasted`);
          },
        },
        room && { label: 'Duplicate', run: () => {
          const next = [...cur];
          next.splice(i + 1, 0, JSON.parse(JSON.stringify(cur[i])));
          setEffects(key, next);
          toast(`${nm} duplicated`);
        } },
        room && { label: 'Insert effect before…',
          run: () => openPicker({ at: i, anchor: btn, x: ev.clientX, y: ev.clientY }) },
        room && { label: 'Insert effect after…',
          run: () => openPicker({ at: i + 1, anchor: btn, x: ev.clientX, y: ev.clientY }) },
        i > 0 && { label: 'Move up', run: () => reorder(i - 1) },
        i < cur.length - 1 && { label: 'Move down', run: () => reorder(i + 1) },
        Object.keys(e.params || {}).length && { label: 'Reset to defaults', run: () => {
          setEffects(key, cur.map((x, j) => (j === i ? { id: x.id, ...(x.bypass ? { bypass: true } : {}) } : x)));
          toast(`${nm} back to defaults`);
        } },
        { label: 'Remove', run: () => {
          setEffects(key, cur.filter((_, j) => j !== i));
          toast(`${nm} removed — ⌘Z to undo`);
        } },
      ].filter(Boolean));
    });
    el.append(btn);
  });
  // The next slot, at the end of the chain — the same target whether the strip holds
  // nothing or holds three, so adding a second effect is the click that added the
  // first rather than a right-click and a submenu. Left out when the block has no
  // line spare, which is only the strip carrying the longest chain in the rack: the
  // panel below it ends in its own + card.
  if (list.length < slots && list.length < MAX_EFFECTS) {
    const add = document.createElement('div');
    add.className = 'addslot';
    add.title = `Add an effect to ${label}`;
    el.append(add);
  }
  return el;
}

/**
 * The fader law — where each dB sits along the travel.
 *
 * dB is already logarithmic; a fader marked in dB is not linear in loudness. What a
 * console fader adds on top is a TAPER: the dB are not spread evenly along the
 * travel. Spread evenly over −60…+6, the six dB above unity that a mix actually
 * lives in get a tenth of the fader, while the bottom thirty — the difference
 * between inaudible and slightly less inaudible — get half of it, and every strip on
 * the desk sits jammed against the top of its slot.
 *
 * So: the breakpoints of a console fader, as positions up the travel. Unity three
 * quarters of the way up, the working six dB above it in the top quarter, and the
 * scale falling away faster the further down you go. Straight lines between them,
 * which is all a printed fader scale is.
 *
 * One law and one range for every strip — channels, sends and the master. A fader
 * whose knee means a different gain from the one beside it is a desk you have to
 * remember exceptions about.
 */
const FADER_SCALE = [[0, -60], [0.15, -35], [0.3, -20], [0.5, -10], [0.75, 0], [1, 6]];
// dB, not pixels — FADER_MIN further down is the fader's minimum HEIGHT, which is a
// different thing about the same control.
const FADER_DB_MIN = FADER_SCALE[0][1];
const FADER_DB_MAX = FADER_SCALE[FADER_SCALE.length - 1][1];

/** Position up the travel (0–1) → dB. */
function posToDb(p) {
  const t = clamp(p, 0, 1);
  for (let i = 1; i < FADER_SCALE.length; i++) {
    const [p0, d0] = FADER_SCALE[i - 1];
    const [p1, d1] = FADER_SCALE[i];
    if (t <= p1) return d0 + (d1 - d0) * ((t - p0) / (p1 - p0));
  }
  return FADER_DB_MAX;
}

/** dB → position up the travel (0–1). The inverse of posToDb, on the same table. */
function dbToPos(db) {
  const d = clamp(db, FADER_DB_MIN, FADER_DB_MAX);
  for (let i = 1; i < FADER_SCALE.length; i++) {
    const [p0, d0] = FADER_SCALE[i - 1];
    const [p1, d1] = FADER_SCALE[i];
    if (d <= d1) return p0 + (p1 - p0) * ((d - d0) / (d1 - d0));
  }
  return 1;
}

/**
 * A vertical fader with its meter and dB readout — the same control on every strip
 * type. `meter: false` keeps the space but draws nothing, for a bus the engine has
 * no meter on; the fader still lands on the same line as every other one.
 *
 * The range input holds a POSITION, not a level: dB goes in through dbToPos and
 * comes back out through posToDb, which is what puts the taper on it. Everything
 * outside this function — the mix, the engine, the readout — is in dB throughout.
 */
function faderBlock({ value, onInput, onReset, title, stereo }) {
  const col = document.createElement('div'); col.className = 'fadercol';
  const fw = document.createElement('div'); fw.className = 'faderwrap';
  const fader = document.createElement('input');
  fader.type = 'range'; fader.className = 'fader';
  // Fine enough that a pixel of travel is several steps, so a drag is smooth and the
  // arrow keys move by about a twentieth of a dB where the mixing happens.
  fader.min = 0; fader.max = 1; fader.step = 0.002;
  fader.value = dbToPos(value);
  if (title) fader.title = title;
  const meter = document.createElement('div');
  // `stereo` splits the same 7px into a pair down the middle — see .meter.stereo. One
  // bar or two, the ballistics are per-channel and identical; tick() walks `chans`.
  meter.className = stereo ? 'meter stereo' : 'meter';
  const chans = [];
  for (let i = 0; i < (stereo ? 2 : 1); i++) {
    const fill = document.createElement('i');
    const peak = document.createElement('b');          // the held peak, see tick()
    meter.append(fill, peak);
    chans.push({ fill, peak });
  }
  const { fill, peak } = chans[0];
  fw.append(fader, meter);
  const db = document.createElement('div'); db.className = 'db';
  const fmt = (x) => (x > 0 ? '+' : '') + Number(x).toFixed(1);
  const show = (x) => { db.textContent = fmt(x); };
  // A tenth of a dB is what the readout shows and what the mix stores; the position
  // under it is finer than that, so the number never jitters mid-drag.
  const dbOf = () => Math.round(posToDb(+fader.value) * 10) / 10;
  show(clamp(value, FADER_DB_MIN, FADER_DB_MAX));
  fader.addEventListener('input', () => { const x = dbOf(); show(x); onInput(x); });
  const reset = () => { fader.value = dbToPos(0); show(0); (onReset || onInput)(0); };
  fader.addEventListener('dblclick', reset);
  db.addEventListener('dblclick', reset);
  // The readout types and drags in dB whatever the fader is doing with position.
  makeTypableDb(db, {
    get: dbOf,
    set: (x) => { fader.value = dbToPos(x); },
    min: FADER_DB_MIN, max: FADER_DB_MAX, step: 0.1,
  }, (x) => { show(x); onInput(x); }, fmt);
  col.append(fw, db);
  const sync = (x) => { fader.value = dbToPos(x); show(clamp(x, FADER_DB_MIN, FADER_DB_MAX)); };
  return { col, fw, db, fill, peak, chans, meter, fader, sync };
}

/**
 * The same master trim in the header: one horizontal fader whose rail is also a
 * larger stereo meter. The dB readout only appears during the gesture, so the control
 * remains a single slider rather than becoming a labelled control with a second box.
 */
function masterToolbarBlock({ value, onInput, onReset, title }) {
  const col = document.createElement('div'); col.className = 'mastertoolbar-control';
  const rail = document.createElement('div'); rail.className = 'master-fader-rail';
  const fader = document.createElement('input');
  fader.type = 'range'; fader.className = 'master-fader';
  fader.min = 0; fader.max = 1; fader.step = 0.002;
  fader.setAttribute('aria-label', 'Master volume');
  if (title) fader.title = title;
  const meter = document.createElement('div');
  meter.className = 'meter stereo toolbar-meter'; meter.setAttribute('aria-hidden', 'true');
  const chans = [];
  for (let i = 0; i < 2; i++) {
    const fill = document.createElement('i');
    const peak = document.createElement('b');
    meter.append(fill, peak);
    chans.push({ fill, peak });
  }
  const readout = document.createElement('span');
  readout.className = 'master-fader-readout'; readout.setAttribute('aria-live', 'polite');
  const fmt = (x) => (x > 0 ? '+' : '') + Number(x).toFixed(1);
  const dbOf = () => Math.round(posToDb(+fader.value) * 10) / 10;
  let hideTimer = 0;
  const hideReadout = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => readout.classList.remove('show'), 700);
  };
  const show = (x, transient = true) => {
    const text = `${fmt(x)} dB`;
    readout.textContent = text;
    fader.setAttribute('aria-valuetext', text);
    if (!transient) return;
    readout.classList.add('show');
    hideReadout();
  };
  const sync = (x) => {
    fader.value = dbToPos(x);
    show(clamp(x, FADER_DB_MIN, FADER_DB_MAX), false);
  };
  sync(value);
  fader.addEventListener('pointerdown', () => show(dbOf()));
  fader.addEventListener('input', () => { const x = dbOf(); show(x); onInput(x); });
  const reset = () => { sync(0); show(0); (onReset || onInput)(0); };
  fader.addEventListener('pointerup', hideReadout);
  fader.addEventListener('pointercancel', hideReadout);
  fader.addEventListener('dblclick', reset);
  rail.append(meter, readout, fader);
  col.append(rail);
  return { col, rail, fader, readout, chans, meter, sync };
}

/**
 * A strip's right-click menu. Reset used to be a button on every strip: a whole row
 * of height on all fourteen of them, spent on something you press once an hour.
 */
// One strip's settings, held for pasting onto another. `kind` is what it came from,
// because a channel's gain/pan/sends mean nothing on a bus — but an effect chain
// means the same thing on all three, so pasting just the effects always works.
let clipboard = null;

function copyStrip(key, kind) {
  const mix = mixFor(trackId);
  const data = key === '__master' ? { master: mix.master || 0, limiter: !!mix.limiter, effects: effectsOf(key) }
    : key.startsWith('__aux:') ? fxOf(mix)[key.slice(6)]
    : mix.lanes[key] || {};
  clipboard = { kind, from: targetLabel(key), data: JSON.parse(JSON.stringify(data)) };
  toast(`${clipboard.from} copied`);
}

function pasteStrip(key, kind) {
  if (!clipboard || clipboard.kind !== kind) return;
  const { data } = clipboard;
  editMix((m) => {
    if (key === '__master') {
      m.master = data.master || 0;
      m.limiter = !!data.limiter;
      storeEffects(m, key, data.effects || []);
    } else if (key.startsWith('__aux:')) {
      const id = key.slice(6);
      m.fx = m.fx || {};
      // Everything but the chain, which goes through the one writer that knows
      // where each kind of strip keeps it.
      const { effects, ...rest } = data;
      m.fx[id] = { ...AUX_DEFAULTS[id], ...rest };
      storeEffects(m, key, effects || []);
    } else {
      m.lanes[key] = JSON.parse(JSON.stringify(data));
    }
  });
  buildRack();
  applyToEngine(mixFor(trackId));
  toast(`${clipboard.from} → ${targetLabel(key)}`);
}

function pasteEffects(key) {
  if (!clipboard) return;
  const list = JSON.parse(JSON.stringify(clipboard.data.effects || []));
  setEffects(key, list);
  applyToEngine(mixFor(trackId));
  toast(list.length ? `${list.length} effect${list.length === 1 ? '' : 's'} → ${targetLabel(key)}`
    : `${targetLabel(key)} — effects cleared`);
}

/**
 * The CHANNEL menu — one short list, on every strip in the rack.
 *
 * A channel and a track are two different things about one instrument and the desk shows
 * them in two different places: the arrangement row is the TRACK (what it plays, what
 * plays it, whether it is in the song at all) and the mixer strip is the CHANNEL (the
 * signal path — fader, EQ, sends, inserts). Right-click follows that split, so where you
 * clicked already decides what you get.
 *
 * A channel strip used to open the track panel as well, on the reasoning that a channel
 * IS a track. It is, but the panel it opened held both jobs and so did the strip, which
 * left two routes to the same six buttons and no way to guess which one you were about
 * to take. One place each is the whole point.
 *
 * A send return and the master are not tracks, and always had exactly this list.
 */
function stripMenu(el, key, kind) {
  el.addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('input, select')) return;
    ev.preventDefault();
    selectLane(key);
    const list = effectsOf(key);
    const anyOn = list.some((x) => !x.bypass);
    // Title Case, like every other menu on the desk — including the noun the label is
    // built from, or this one list would be the only place reading "Copy channel".
    const Kind = kind[0].toUpperCase() + kind.slice(1);
    const fx = (clipboard?.data?.effects || []).length;
    openMenu(ev.clientX, ev.clientY, targetLabel(key), [
      { label: `Copy ${Kind}`, run: () => copyStrip(key, kind) },
      clipboard && clipboard.kind === kind && {
        label: `Paste ${Kind} from ${clipboard.from}`, run: () => pasteStrip(key, kind),
      },
      clipboard && fx && {
        label: `Paste ${fx} Effect${fx === 1 ? '' : 's'} from ${clipboard.from}`,
        run: () => pasteEffects(key),
      },
      list.length && {
        label: anyOn ? 'Bypass All Effects' : 'Enable All Effects',
        run: () => {
          setEffects(key, list.map((x) => ({ ...x, bypass: anyOn })));
          toast(anyOn ? `${targetLabel(key)} — effects bypassed` : `${targetLabel(key)} — effects on`);
        },
      },
      { label: `Reset ${Kind}`, run: () => resetTarget(key) },
    ].filter(Boolean));
  });
}

/** The TRACK panel — on the arrangement row, which is where the track lives. */
function trackMenu(el, key) {
  el.addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('input, select')) return;
    ev.preventDefault();
    selectLane(key);
    openTrackEditor(ev.clientX, ev.clientY, key);
  });
}

const menu = () => $('ctxmenu');
function openMenu(x, y, title, items) {
  const el = menu();
  el.textContent = '';
  const h = document.createElement('div'); h.className = 'ctxhead'; h.textContent = title;
  el.append(h);
  for (const it of items) {
    const b = document.createElement('button');
    b.textContent = it.label;
    b.onclick = () => { closeMenu(); it.run(); };
    el.append(b);
  }
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  el.classList.add('show');
  // Measured after it is shown, then pulled back on-screen if it ran off an edge.
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 6))}px`;
  el.style.top = `${Math.max(4, Math.min(y, innerHeight - r.height - 6))}px`;
}
const closeMenu = () => {
  const pickerWasOpen = $('voicepicker')?.classList.contains('show');
  menu().classList.remove('show');
  $('regionedit').classList.remove('show');
  $('fxpicker').classList.remove('show');
  $('voicepicker').classList.remove('show');
  if (pickerWasOpen) pendingAddTrack = null;
  const drawer = $('navdrawer');
  const backdrop = $('drawerbackdrop');
  const nav = $('navbtn');
  const wasOpen = drawer?.classList.contains('show');
  drawer?.classList.remove('show');
  backdrop?.classList.remove('show');
  drawer?.setAttribute('aria-hidden', 'true');
  backdrop?.setAttribute('aria-hidden', 'true');
  nav?.setAttribute('aria-expanded', 'false');
  if (wasOpen) nav?.focus();
};
// Anything that is not the popup itself dismisses it.
addEventListener('pointerdown', (e) => {
  const inside = [menu(), $('regionedit'), $('fxpicker'), $('navdrawer'),
    $('voicepicker')]
    .some((el) => el.contains(e.target));
  const opener = [$('navbtn')].some((el) => el.contains(e.target))
    || (e.target.closest && e.target.closest('.devaddcard'));
  if (!inside && !opener) closeMenu();
}, true);
addEventListener('blur', closeMenu);

/**
 * Bring one effect card into view and flash it. Selecting the strip is what puts
 * the card on screen; this says WHICH of six it was, which the panel cannot show on
 * its own once a chain is long enough to scroll.
 */
function focusDevice(index) {
  // Auto-open the effects panel if it's collapsed — the user clicked an effect
  // slot and wants to see it.
  if ($('devices').classList.contains('collapsed')) {
    setDevicesFolded(false);
  }
  requestAnimationFrame(() => {
    const card = $('devrack').querySelector(`.device[data-idx="${index}"]`);
    if (!card) return;
    card.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    card.classList.remove('flash');
    void card.offsetWidth;                 // restart the animation on a repeat click
    card.classList.add('flash');
  });
  scheduleDeskFit();
}

/** Put one target back to defaults — the right-click menu, and the R key. */
function resetTarget(key) {
  const label = targetLabel(key);
  // The voice is the one thing on a strip that says what the channel IS rather than
  // what has been done to it — which is exactly why a reset has to take it too. A
  // channel put back to defaults that carries on playing the preset you chose is a
  // strip whose face and whose sound disagree, and nothing on it explains why.
  const seam = seamFor(key);
  const voiceBefore = JSON.stringify(mixFor(trackId).voice || null);
  editMix((m) => {
    if (key === '__master') {
      m.master = 0; m.masterPan = 0; m.limiter = false; delete m.masterEffects;
    }
    else if (key.startsWith('__aux:')) { if (m.fx) delete m.fx[key.slice(6)]; }
    else {
      delete m.lanes[key];
      // A layer keeps its own, exactly as "Reset every channel" leaves it: a
      // duplicated track with no voice makes no sound at all, so clearing it would not
      // put a channel back to defaults, it would empty the lane.
      if (seam && m.voice && !isLayer(key)) {
        delete m.voice[seam.voiceKey];
        if (!Object.keys(m.voice).length) m.voice = undefined;
      }
    }
  });
  // Only a voice change needs the sequencer re-banked, and re-banking costs half a
  // second of silence — so a reset that changed nothing but levels does not spend it.
  if (JSON.stringify(mixFor(trackId).voice || null) !== voiceBefore) rebank();
  buildRack();
  applyToEngine(mixFor(trackId));
  toast(`${label} reset`);
}

function laneOf(mix, key) {
  if (!mix.lanes[key]) mix.lanes[key] = {};
  return mix.lanes[key];
}

// ---- audio -----------------------------------------------------------------
// What the device panel is editing: a channel, the master bus, or a send return.
// All three own an effect chain, so they are the same thing as far as the panel is
// concerned — only where the chain is stored differs.
//
// Remembered across sessions for the same reason the song is: "I am working on the
// bass" outlasts a reload, and finding the strip again before you can hear last
// night's change is a step for nothing. One key, not one per song — the selection
// already survives switching songs, and a lane the new song does not have falls back
// to the master in buildRack.
const LANE_KEY = 'mash-mixer-lane';
let selectedLane = localStorage.getItem(LANE_KEY) || null;

/**
 * Whether the selected channel puts the roll away.
 *
 * A percussion channel is booleans on a step grid and a gesture lane builds its own
 * timing — neither has a pitch axis, so neither has a part the roll can show. It used
 * to fall through to the first melodic lane, which meant selecting the kick left the
 * lead's notes on screen: an editor you could type into while looking at another
 * channel's strip. Now the panel keeps its header and drops the roll until a pitched
 * channel is chosen.
 *
 * Only real lanes. The master and the buses are not "a channel with no roll", they are
 * not a channel's part at all, and the roll keeps showing whatever it was on — the same
 * fallback rollShownLane() has always done for them.
 *
 * The PANEL is not affected: it keeps its height and its place, and only the roll comes
 * out of it. Folding it away as well made every click between a drum strip and a melodic
 * one resize the desk, and the space is wanted anyway — the pattern goes there.
 */
const laneHidesRoll = (key) => !!key && !key.startsWith('__') && !rollEditable(key);
/** There is a roll on screen: the panel is unfolded, and on a channel that has one. */
const notesRollUp = () => !$('notes').classList.contains('collapsed') && !laneHidesRoll(selectedLane);
const fxOf = (mix) => Object.fromEntries(AUXES.map((a) => [a.id, {
  ...AUX_DEFAULTS[a.id],
  ...(mix.fx?.[a.id] || {}),
  eq: { ...AUX_DEFAULTS[a.id].eq, ...(mix.fx?.[a.id]?.eq || {}) },
}]));

/**
 * The bank as the engine would play it: layers materialised, voice overrides merged.
 *
 * A stopped desk has handed the engine no bank at all — stopping is `setBank(null)` —
 * so the keyboard cannot ask it what the selected channel plays with. applyMix
 * answers that on its way past, and every mix edit goes through applyToEngine, so
 * keeping what it returned is the whole of it. A/B holds the saved mix's bank while
 * the button is down, which is right: you preview what you are hearing.
 */
let appliedBank = null;
const engineBank = () => (playing && Audio.bank) || appliedBank;

/**
 * Push a whole mix onto the engine — the engine's OWN apply, not a copy of it, so
 * what the desk hears is exactly what the game will play and what the renderer will
 * write. The copy that used to live here quietly drifted: it never restored effect
 * chains after its own reset(), and it gave every dry lane a delay send of 1, so
 * releasing A/B could leave the kit echoing when the song says it does not.
 */
function applyToEngine(mix) {
  if (!Audio.mixer) return;
  const m = mix || emptyMix();
  // This song's arrangement, before the mix rather than after it: applyMix rebuilds
  // the bank from the song, so it has to know which bars to build. Set every time
  // rather than only when it changes — this function is the one path everything
  // takes to the engine, and a desk holding an edit the engine has forgotten is a
  // grid drawing bars nobody can hear.
  Audio.arrangement = arrFor(trackId) || null;
  // Whatever the desk seeds the master with has to exist in the ENGINE's chain too,
  // or the desk's card index and the live chain index drift apart and the first
  // slider drag on the master writes to the wrong node. The seed is empty now, so
  // this is a no-op in practice — it stays because the two indices have to agree
  // however the seed is filled in, and effectsOf reads the same fallback.
  appliedBank = Audio.applyMix(track?.bank || null,
    m.masterEffects ? m : { ...m, masterEffects: DEFAULT_MASTER_CHAIN() });
  // The mix arrived by resetting every strip, and the reset took the engine's solo
  // with it. Solo belongs to the desk rather than to the mix, so it goes straight
  // back on — see reapplySolo.
  reapplySolo();
}

/** Write one send's settings, and push them straight at the live aux. */
function editFx(id, patch, tag) {
  editMix((m) => {
    m.fx = m.fx || {};
    m.fx[id] = { ...AUX_DEFAULTS[id], ...(m.fx[id] || {}), ...patch };
  }, tag);
  const { effects, eq, level, pan, mute, ...rest } = fxOf(mixFor(trackId))[id];
  if (id === 'delay') {
    // Delay 1's time, feedback and damping are AudioSys nodes; its EQ, level, pan
    // and mute are the mixer's, like every other aux.
    Audio.setDelay(rest);
    Audio.mixer.setAux('delay', { eq, level, pan, mute }, deskTempo());
  } else {
    Audio.mixer.setAux(id, { ...rest, eq, level, pan, mute }, deskTempo());
  }
}

function loadTrack(id) {
  pendingAddTrack = null;
  // A deferred grid open belongs to the song whose button was clicked. If a song
  // switch wins the race, cancel that intent unless the grid is already visible.
  stepSeqWanted = stepSeq.isOpen();
  rememberSongLayout(trackId);
  // Solo does not travel between songs. It is monitoring on one channel of one mix,
  // and the same lane key in the next song is a different part played by a different
  // preset — so a solo left on from the last song opens the new one with most of it
  // silent and nothing on screen explaining why. Cleared before buildRack, so the S
  // buttons are built dark, and before applyToEngine, whose reapplySolo would
  // otherwise push the old solo straight back onto the new mix.
  dropSolo();
  const hasSongLayout = !!songLayouts[id];
  // Apply a remembered closed Notes state before the rack/song build. The shell starts
  // with Notes open, so waiting for restoreSongLayout below would build a whole piano
  // roll only to hide it again — exactly the first-use pause this layout state is meant
  // to avoid.
  if (notesOpenInLayout(songLayouts[id]) === false) setNotesFolded(true, false);
  // A bar selection and the open editor's DOM belong to the song they were built
  // from. Carrying either across this boundary made the old pattern appear under the
  // new song's name; touching it then wrote those old-looking cells into the new
  // song. Clear the selection first and rebuild the grid from the new bank below.
  selectedBar = null;
  trackId = id;
  track = resolveTrack(id);
  // The same lane in a different song is played by a different preset, or by none —
  // the editor following its lane, by another route. Before buildRack, which is what
  // puts the panel back beside the strip once it knows which preset it is on.
  syncVoiceEditorToLane(voiceEditor.laneKey);
  buildRack();
  syncMasterControls(mixFor(id).master || 0);
  buildTimeline();
  buildArrangement();
  stepSeq.songChanged();
  pianoRoll.songChanged();
  // The piano roll is visible whenever the notes panel is open on a channel that has
  // one. Make sure it renders its content on initial load and after song switches —
  // and that the header names the new song's preset, which is rarely the old one's.
  syncNotesPanel();
  if (notesRollUp()) pianoRoll.open(true);
  voiceLibrary.songChanged();
  // The old song is dropped either way. Only doing it while `playing` trusted the
  // desk's own flag about what the engine was up to, and anything that had left the
  // two disagreeing turned a song switch into a second song's worth of controls
  // pointed at the first song's audio. setBank(null) is the engine's "no song" state:
  // if nothing was sounding it costs nothing, and if something was, it stops.
  Audio.setBank(null);
  // A voice change has to come back through setBank; level edits do not, so the song
  // keeps playing without a gap while you mix.
  if (playing) Audio.setBank(track.bank, mixFor(id), arrFor(id));
  applyToEngine(mixFor(id));
  // A new song brings its own tempo — its arrangement's, else the one it was written
  // at. After applyToEngine, so the strips it retunes are this song's.
  pushTempo();
  loopAnchor = 0;              // a different song means a different timeline
  pendingLoopAnchor = null;
  parkedAt = 0;
  locA = null;                 // locators don't carry across songs
  locB = null;
  applyLoop(0);
  if (hasSongLayout) restoreSongLayout(id);
  // A song without a record inherits the current desk once, then owns its own state.
  rememberSongLayout(id);
  updateStatus();
}

// ---- UI --------------------------------------------------------------------
/**
 * Make a readout draggable: pull up or down to change it, click to type it.
 *
 * A number on a mixing desk is a control. Having to find the slider that owns a
 * value before you can nudge it is a step for nothing, and the old behaviour was
 * worse than nothing — dragging over a number selected the text.
 *
 * `moved` is what tells a drag from a click: under three pixels and the pointer was
 * only ever a click, so the type-in opens instead.
 */
function dragNumber(el, { value, set, range, step, onClick }) {
  el.classList.add('draggy');
  let startY = 0, startVal = 0, moved = 0, active = false;
  el.addEventListener('pointerdown', (e) => {
    if (el.querySelector('input')) return;         // already typing into it
    active = true; moved = 0;
    startY = e.clientY; startVal = value();
    el.setPointerCapture(e.pointerId);
    e.preventDefault();                            // and never start a text selection
  });
  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    const dy = startY - e.clientY;
    moved = Math.max(moved, Math.abs(dy));
    // A full range in 200px, a fifth of that with shift held.
    const perPixel = (range / 200) * (e.shiftKey ? 0.2 : 1);
    const next = startVal + dy * perPixel;
    set(Math.round(next / step) * step);
  });
  const end = (e) => {
    if (!active) return;
    active = false;
    try { el.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
    if (moved < 3 && onClick) onClick();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function slider({ min, max, step, value, fmt, onInput, reset, curve, display }) {
  // When `curve` is set, the HTML range stores a 0–1 POSITION and the value-space
  // number is mapped through a power curve: value = max * (position ^ curve).
  // This gives more fine-grained control at lower values — unity ends up at ~71%
  // of the slider travel with curve=2 instead of dead centre.
  const hasCurve = curve != null && curve > 0 && max > min;
  const toPos = (val) => hasCurve ? (clamp(val, min, max) / (max - min)) ** (1 / curve) : val;
  const fromPos = (pos) => hasCurve ? min + (max - min) * (clamp(pos, 0, 1) ** curve) : pos;
  // The range input goes 0–1 in curve mode, or min–max in linear mode.
  const rMin = hasCurve ? 0 : min;
  const rMax = hasCurve ? 1 : max;
  const rStep = hasCurve ? 0.001 : step;
  const rVal = hasCurve ? toPos(value) : value;
  // `display` lets callers show a different unit in the readout and type-in
  // (e.g. dB on a send whose internal value is linear gain). When absent the
  // raw value is shown and typed.
  const show = display ? (v) => display.format(v) : fmt;
  const parse = display ? (s) => display.parse(s) : null;

  const wrap = document.createElement('div');
  wrap.className = 'row';
  const head = document.createElement('div'); head.className = 'head';
  const k = document.createElement('span'); k.className = 'k';
  const v = document.createElement('span'); v.className = 'v';
  head.append(k, v);
  const input = document.createElement('input');
  input.type = 'range'; input.min = rMin; input.max = rMax; input.step = rStep; input.value = rVal;
  v.textContent = show(value);
  // Click the readout to type an exact value. A slider is fine for finding a
  // setting by ear and useless for dialling in one you already know.
  v.classList.add('typable');
  v.title = 'Drag to change · click to type a value';
  const curveVal = () => hasCurve ? fromPos(+input.value) : +input.value;
  const openEditor = () => {
    if (v.querySelector('input')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein';
    // Show the displayed form so the user edits what they see (e.g. dB, not raw gain).
    box.value = display ? display.format(curveVal()) : String(curveVal());
    v.textContent = '';
    v.append(box);
    box.focus(); box.select();
    const done = (commit) => {
      let n;
      if (commit && parse) {
        n = parse(box.value);
        if (n == null) { v.textContent = show(curveVal()); return; } // unparseable — abort
      } else {
        n = parseFloat(box.value);
      }
      if (commit && Number.isFinite(n)) {
        input.value = hasCurve ? toPos(n) : clamp(n, min, max);
        onInput(curveVal());
      }
      v.textContent = show(curveVal());
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { done(true); }
      else if (ev.key === 'Escape') { done(false); }
    });
    box.addEventListener('blur', () => done(true));
  };
  dragNumber(v, {
    value: () => curveVal(),
    set: (x) => { input.value = hasCurve ? toPos(clamp(x, min, max)) : clamp(x, min, max); v.textContent = show(curveVal()); onInput(curveVal()); },
    range: max - min,
    step,
    onClick: openEditor,
  });
  input.addEventListener('input', () => { v.textContent = show(curveVal()); onInput(curveVal()); });
  // Reset by clicking the label. Double-clicking the slider itself also works, but
  // it is not discoverable and a double-click on a range often reads as a drag.
  const doReset = () => { input.value = hasCurve ? toPos(reset) : reset; v.textContent = show(reset); onInput(reset); };
  k.classList.add('resettable');
  k.title = `Reset to ${show(reset)}`;
  k.addEventListener('click', doReset);
  input.addEventListener('dblclick', doReset);
  wrap.append(head, input);
  return { wrap, label: k, input, readout: v, reset: doReset };
}

const meters = [];
let masterStripControl = null;
let masterToolbarControl = null;

function syncMasterControls(value) {
  masterStripControl?.sync(value);
  masterToolbarControl?.sync(value);
}

function setMasterControlValue(value, tag = null) {
  editMix((m) => { m.master = value; }, tag);
  Audio.mixer?.setMasterTrim(value);
  syncMasterControls(value);
}

function buildMasterToolbar() {
  const mount = $('mastertoolbar');
  if (!mount || masterToolbarControl) return;
  masterToolbarControl = masterToolbarBlock({
    value: mixFor(trackId).master || 0,
    title: 'Master trim, on top of the bank’s own musicTrim',
    onInput: (x) => setMasterControlValue(x, 'master'),
    onReset: (x) => setMasterControlValue(x),
  });
  mount.replaceChildren(masterToolbarControl.col);
}

// Arrangement volume rails share the channel meters' level source, but keep their
// own small DOM readout so the track header remains live even when its mixer strip
// is filtered out of the rack.
const arrangementMeters = new Map();

// Which families of track the desk is showing. A view, not a mix control: the song
// keeps playing every lane, so what you hear while you work on the drums is the song
// with drums in it. Remembered, because "I am working on the percussion" outlasts a
// reload. Numbers come from the full lane list — see buildRack.
const GROUPS_KEY = 'mash-mixer-hidden-groups';
let hiddenGroups = new Set(JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'));
let laneNumbers = new Map();

// And which PARTS of a strip it is showing — parts, not sections: a section of this
// song is a chorus, and the timeline owns that word. The same kind of switch as the
// families and for the same reason: a view of the desk, not a mix control — a hidden
// EQ is still doing whatever it was set to, and a hidden send still sends. All three
// off leaves the fader, the pan and the mute/solo pair, which is the whole desk when
// balancing is all you are doing. Remembered, like the families.
//
// Every one of them may be off at once — that is the point of them, unlike the family
// switches, where the last one on has nothing to fall back to but an empty rack.
const STRIP_PARTS = [
  { id: 'eq', label: 'EQ', cls: 'no-eq', what: 'the three EQ bands' },
  { id: 'sends', label: 'Sends', cls: 'no-sends', what: 'the send rows' },
  { id: 'effects', label: 'Effects', cls: 'no-fx', what: 'the insert slots' },
];
const PARTS_KEY = 'mash-mixer-hidden-parts';
let hiddenParts = new Set(JSON.parse(localStorage.getItem(PARTS_KEY) || '[]'));

/**
 * Show or hide those parts, by class on the rack — see the #rackwrap.no-* rules.
 * A class rather than a rebuild: nothing about the strips changes, only how much of
 * them is on screen, and a rebuild here would close whatever menu you had open and
 * throw away the fader you were dragging.
 */
function applyStripParts() {
  const wrap = $('rackwrap');
  for (const p of STRIP_PARTS) wrap.classList.toggle(p.cls, hiddenParts.has(p.id));
  // Every rung of the shrink ladder just changed height: a block hidden by hand has
  // none left for the ladder to save by hiding it again.
  forgetStripMetrics();
  // The height the rows gave up goes to the faders, and comes back off them again
  // when the rows return — fitStrips computes both from the window.
  requestAnimationFrame(fitStrips);
}

function buildPartFilter() {
  const wrap = $('partfilter');
  wrap.textContent = '';
  for (const p of STRIP_PARTS) {
    const b = document.createElement('button');
    const name = document.createElement('span');
    name.className = 'lbl';        // what the struck-through `shed` state marks
    name.textContent = p.label;
    b.dataset.part = p.id;         // how markShedParts finds it again
    b.append(partIcon(p.id), name);
    const shown = !hiddenParts.has(p.id);
    b.classList.toggle('off', !shown);
    b.title = `${shown ? 'Hide' : 'Show'} ${p.what} on every strip`
      + ' — this changes what the MIXER shows; nothing is bypassed, reset or muted';
    b.onclick = () => {
      if (hiddenParts.has(p.id)) hiddenParts.delete(p.id); else hiddenParts.add(p.id);
      localStorage.setItem(PARTS_KEY, JSON.stringify([...hiddenParts]));
      buildPartFilter();
      applyStripParts();
    };
    wrap.append(b);
  }
}

function buildLaneFilter(all) {
  const wrap = $('lanefilter');
  wrap.textContent = '';
  // Only the families this song actually has: a Vocal button on a song with no vocal
  // lane is a control that does nothing, which is worse than one that is missing.
  const counts = new Map();
  for (const l of all) counts.set(l.group, (counts.get(l.group) || 0) + 1);
  const redraw = () => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify([...hiddenGroups]));
    buildRack();                 // the rack only — the arrangement keeps every lane
  };

  // No All button: the switches stay where they are when they are off, so putting a
  // family back is the same click that took it away — a second control for that is a
  // second thing to look at for nothing.
  for (const [group, n] of counts) {
    const b = document.createElement('button');
    const name = document.createElement('span');
    name.textContent = group;
    const count = document.createElement('span');
    count.className = 'n';
    count.textContent = String(n);
    b.append(groupIcon(group), name, count);
    const shown = !hiddenGroups.has(group);
    b.classList.toggle('off', !shown);
    b.title = `${shown ? 'Hide' : 'Show'} the ${n} ${group} track${n === 1 ? '' : 's'}`
      + ' — this changes what the MIXER shows; the arrangement keeps every lane and'
      + ' nothing is muted';
    b.onclick = () => {
      if (hiddenGroups.has(group)) hiddenGroups.delete(group); else hiddenGroups.add(group);
      // Hiding the last one would leave an empty desk, which is not a view of anything.
      if (hiddenGroups.size >= counts.size) hiddenGroups.delete(group);
      redraw();
    };
    wrap.append(b);
  }
}

function buildRack() {
  const rack = $('rack');
  // Held across the clear: the sends live inside the rack, so emptying it detaches
  // them, and this reference is what puts them back at the end of the row. Rebuilt
  // rather than assumed, because that also means a build that died between the clear
  // and the re-append — the sends detached, off the document, unfindable — costs one
  // wrong-looking rack instead of a desk that throws on every song you click after.
  let sends = $('sendslot');
  if (!sends) { sends = document.createElement('div'); sends.id = 'sendslot'; }
  // The strips about to be thrown away are what the rack's floor was measured off.
  forgetStripMetrics();
  rack.textContent = '';
  meters.length = 0;
  masterStripControl = null;
  const mix = mixFor(trackId);
  const all = deskLanes(viewBank(), 1);
  // Track numbers come from the whole song, not from what is on screen: hiding the
  // drums must not renumber the bass, or "mute 7" means a different channel every
  // time you change the view.
  laneNumbers = new Map(all.map((l, i) => [l.key, i + 1]));
  const lanes = all.filter((l) => !hiddenGroups.has(l.group));
  // One reserved insert block for the whole rack — sends and master included — so
  // the slots land on the same pixel on every strip rather than wandering up and
  // down with each strip's own count.
  const maxChain = Math.max(
    0,
    ...lanes.map((l) => effectsOf(l.key).length),
    ...AUXES.map((a) => effectsOf(`__aux:${a.id}`).length),
    effectsOf('__master').length,
  );
  // The longest chain and one line more: the spare is the empty slot at the end of
  // the selected strip's chain, and reserving it for the whole rack means selecting
  // a strip reveals an outline rather than moving every fader on the desk down a
  // row. On a rack where something is already at the limit there is nothing to
  // reserve for — a full strip has nowhere to put a seventh effect anyway.
  const slotRows = Math.min(MAX_EFFECTS, maxChain + 1);

  lanes.forEach((lane) => rack.append(channelStrip(lane, mix, slotRows, laneNumbers.get(lane.key))));
  // The preset editor is a rack item too, so it goes back in beside its strip — the
  // clear above detached it. See placeVoiceEditor.
  placeVoiceEditor();

  // The master goes in the left column — the one the arrangement spends on names —
  // so the channels start on the same line their lanes do above. Same strip as a
  // channel in both cases, because that is what they are: a fader, a chain of
  // inserts and somewhere to send.
  const slot = $('masterslot');
  slot.textContent = '';
  slot.append(masterStrip(mix, slotRows));
  if (masterToolbarControl) {
    meters.push({ key: '__master-toolbar', master: true, horizontal: true,
      chans: masterToolbarControl.chans, meter: masterToolbarControl.meter });
  }
  buildLaneFilter(all);          // the switches live in the mixer's header now
  buildPartFilter();             // and the switches for which parts of a strip it shows
  applyStripParts();
  // The sends are the last thing in the rack's own row, not a column beside it —
  // see #sendslot: with room to spare they sit against the right edge, and when the
  // channels overflow they queue up behind the last of them instead.
  sends.textContent = '';
  for (const def of AUXES) sends.append(sendStrip(def, mix, slotRows));
  rack.append(sends);

  const special = selectedLane === '__master' || (selectedLane || '').startsWith('__aux:');
  if (selectedLane && !special && !lanes.some((l) => l.key === selectedLane)) selectedLane = null;
  requestAnimationFrame(fitStrips);

  // Never nothing: the device panel is the biggest surface on the desk, and opening
  // it empty wastes it. The master is the one strip every song has, and the one you
  // want when you have not said otherwise.
  selectLane(selectedLane || '__master');
}

/**
 * The three zones every strip has: a pinned name, a body that scrolls if it must,
 * and a foot pinned to the bottom. Feet are bottom-anchored in all of them, which
 * is what puts every fader in the rack on one line.
 */
function stripShell(key, {
  label, tag, sublabel = null, colour, tint, cls = '', number = null,
}) {
  const el = document.createElement('div');
  el.className = `strip ${cls}`.trim();
  el.dataset.lane = key;
  if (colour) {
    el.style.setProperty('--lane', colour);
    if (tint) el.style.setProperty('--lanedim', tint);
  }
  const head = document.createElement('div'); head.className = 'striphead';
  // The same number the arrangement row carries, in the corner where a console
  // stencils it: the strips and the track list are one list, counted once.
  if (number != null) {
    const n = document.createElement('span');
    n.className = 'stripnum';
    n.textContent = String(number);
    head.append(n);
  }
  const h = document.createElement('h3'); h.textContent = label;
  head.append(h);
  if (sublabel != null) {
    const sub = document.createElement('div');
    sub.className = 'stripsub';
    sub.textContent = sublabel;
    head.append(sub);
  } else {
    head.append(groupChip(tag));
  }
  head.style.cursor = 'pointer';
  head.title = 'Click anywhere on this strip to show its devices below';
  const body = document.createElement('div'); body.className = 'stripbody';
  const foot = document.createElement('div'); foot.className = 'stripfoot';
  el.append(head, body, foot);
  // Any empty part of the strip selects it — hunting for a specific hit target on a
  // strip you are already looking at is friction for nothing. Controls stop the
  // event so dragging a fader does not also re-select.
  el.addEventListener('click', (ev) => {
    if (ev.target.closest('input, button, select')) return;
    selectLane(key);
  });
  return { el, head, body, foot };
}

/**
 * The fader group, centred in the strip. The pan pot used to sit in a slot beside the
 * fader, with a mirrored empty slot opposite holding the centre; it has a line of its
 * own under the fader now, so both slots go and the column centres itself.
 */
function faderRow(fadercol) {
  const row = document.createElement('div');
  row.className = 'faderrow';
  row.append(fadercol);
  return row;
}

/**
 * The pan pot on its own line, between the fader and the mute/solo pair and clear of
 * both — beside the fader it read as something hanging off it, where under it, above
 * the buttons, it is the strip's own control in the order a console puts them.
 *
 * Empty on the master, which has no panner: the row keeps its height either way, so
 * every strip's buttons still land on one line.
 */
function panRow(pan) {
  const row = document.createElement('div');
  row.className = 'panrow';
  if (pan) row.append(pan);
  return row;
}

/** Mute and solo under the fader, sharing the width of the strip. */
function btnRow(...kids) {
  const row = document.createElement('div');
  row.className = 'ctlbtns';
  row.append(...kids);
  return row;
}

/**
 * The master's limiter, on the line the channels keep M and S on. A button rather
 * than a slot or a card: it is not an insert, it cannot be reordered, and it is the
 * last thing on the path whatever else the master is carrying — which is exactly what
 * being down here with the buttons, instead of up in the block with the chain, says.
 *
 * Off by default, and it says so by being unlit: the ceiling costs 6ms of output
 * latency, and a mix that needs it to stay under is a mix to fix on the desk.
 */
function limiterButton(on) {
  const btn = document.createElement('button');
  btn.textContent = 'LIMITER';
  btn.className = `limbtn${on ? ' on' : ''}`;
  btn.title = `The master limiter, a ceiling at −1 dB on the way out — ${on ? 'on' : 'off'}`
    + '\nit costs 6ms of output latency, so it is off unless you put it on';
  btn.onclick = (ev) => {
    ev.stopPropagation();
    setLimiter(!on);
    toast(`Limiter ${on ? 'off' : 'on'}`);
  };
  return btn;
}

/** A stand-in for a control the master has no node for — see .gap-btns. */
function gap(cls) {
  const el = document.createElement('div');
  el.className = `gap ${cls}`;
  return el;
}

/** A delay time reads better in seconds once it is past a second. */
const fmtDelay = (secs) => (secs >= 1 ? `${secs.toFixed(2)}s` : `${Math.round(secs * 1000)}ms`);

/**
 * The line at the top of a bus strip: what its own device is set to, and the way in
 * to change it. The parameters live in the panel below now, and a strip that showed
 * nothing about them left you hunting for where they had gone — this both says what
 * the delay is doing and opens the card that changes it.
 */
function deviceSummary(key, text) {
  const b = document.createElement('button');
  b.className = 'devlink';
  b.textContent = text;
  b.title = `${targetLabel(key)} — its own controls live in the panel below. Click to open them.`;
  b.onclick = (ev) => { ev.stopPropagation(); selectLane(key); };
  return b;
}

// A glyph per family, drawn rather than spelled: at a glance you are looking for
// "the drums" or "the effects", and six kinds of thing tell each other apart faster
// by shape than by reading six words in the same typeface.
//
// They live on the ARRANGEMENT rows, not on the strips. On a 118px strip the mark
// had to be 10px to sit beside the word, and at 10px a microphone and a drum are the
// same smudge; the two-line arrangement header gives the same mark room beside the
// track name, so the strip keeps the plain word.
// `head` is drawn filled — a quaver without a filled note head is a stem with a
// flag on it, which is not a note at all.
const GROUP_ICONS = {
  drums: { d: 'M6 1.6a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8M1.9 4.6h8.2' },
  melodic: { d: 'M6.7 9.1V2.3c2.5.7 3.5 1.9 3.5 3.5', head: [4.5, 9.1, 2.2] },
  // A closed bolt, filled: as an open stroke it was three lines that never met, and
  // at eleven pixels that reads as a scribble rather than as lightning.
  fx: { d: 'M7.3 1.2 3.4 6.6h2.2l-.7 4.2 3.9-5.6H6.6z', fill: true },
  vocal: { d: 'M6 1.5a1.6 1.6 0 0 1 1.6 1.6v2.4a1.6 1.6 0 0 1-3.2 0V3.1A1.6 1.6 0 0 1 6 1.5M3.2 5.8a2.8 2.8 0 0 0 5.6 0M6 8.6v1.9' },
  send: { d: 'M1.8 8.6h4.4a2.6 2.6 0 0 0 0-5.2H3.9M5.6 1.9 3.7 3.4l1.9 1.5' },
  bus: { d: 'M2 2.8h8M2 6h8M2 9.2h5.4' },
};

// A mark per strip part, for the switches that show and hide them. Same 12px box as
// the family marks, drawn as the thing itself rather than as a letter: two faders at
// different heights for the EQ, the return arrow the send strips already carry, and a
// pair of stacked slots for the insert block.
const PART_ICONS = {
  eq: { d: 'M4 1.6v8.8M8 1.6v8.8M2.6 4.4h2.8M6.6 7.4h2.8' },
  sends: { d: 'M1.8 8.6h4.4a2.6 2.6 0 0 0 0-5.2H3.9M5.6 1.9 3.7 3.4l1.9 1.5' },
  effects: { d: 'M2.2 2.4h7.6v3.4H2.2zM2.2 7h7.6v2.6H2.2z' },
};

/** The family mark on its own, for an arrangement row. */
function groupIcon(tag) { return drawIcon(GROUP_ICONS[tag], tag); }

/** The mark for one of the strip-part switches — see PART_ICONS. */
function partIcon(id) { return drawIcon(PART_ICONS[id], id); }

function drawIcon(spec = { d: '' }, tag = '') {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('class', 'grpicon');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', spec.d);
  if (spec.fill) path.setAttribute('class', 'grpfill');   // a solid shape, not an outline
  svg.append(path);
  if (spec.head) {
    const [cx, cy, r] = spec.head;
    const head = document.createElementNS(NS, 'ellipse');
    head.setAttribute('cx', cx); head.setAttribute('cy', cy);
    head.setAttribute('rx', r); head.setAttribute('ry', r * 0.82);
    head.setAttribute('class', 'grpfill');
    svg.append(head);
  }
  const t = document.createElementNS(NS, 'title');
  t.textContent = tag;
  svg.append(t);
  return svg;
}

/** The family this strip belongs to, in a word. */
function groupChip(tag) {
  const el = document.createElement('div');
  el.className = 'grp-tag';
  el.textContent = tag;
  return el;
}

/** One EQ band — the same row on a channel and on a send return. */
function eqRow(band, value, onInput) {
  const r = slider({
    min: -18, max: 18, step: 0.1, value, reset: 0,
    fmt: (x) => (x > 0 ? '+' : '') + x.toFixed(1),
    onInput,
  });
  r.label.textContent = band.toUpperCase();
  r.wrap.classList.add('eqrow');       // what the EQ switch in the header hides
  return r.wrap;
}

// Solo is monitoring only — never written to the draft, never saved — but it does
// have to survive a rack rebuild, so the desk remembers it here rather than in the
// mix. The engine holds the same set; this is what re-draws the lit button.
const soloed = new Set();
const soloedAux = new Set();

/**
 * The M and S pair for one lane. There are two of each on screen — the channel
 * strip and the arrangement row, as in Logic — and pressing either has to light
 * both, so the state lives in the mix and the buttons are only ever a view of it.
 */
function muteSoloPair(key, label) {
  const muted = !!mixFor(trackId).lanes?.[key]?.mute;
  const mute = document.createElement('button');
  mute.textContent = 'M';
  mute.className = 'mutebtn warn' + (muted ? ' on' : '');
  mute.title = `Mute ${label} (M)`;
  mute.onclick = (ev) => {
    ev.stopPropagation();
    setLaneMute(key, !mute.classList.contains('on'));
  };
  const solo = document.createElement('button');
  solo.textContent = 'S';
  solo.className = 'solobtn' + (soloed.has(key) ? ' on' : '');
  solo.title = `Solo ${label} — monitoring only, never saved (S)`;
  solo.onclick = (ev) => {
    ev.stopPropagation();
    setLaneSolo(key, !solo.classList.contains('on'));
  };
  return [mute, solo];
}

function setLaneMute(key, on) {
  editMix((m) => { laneOf(m, key).mute = on; });
  Audio.mixer?.lane(key)?.setMute(on);
  syncLaneButtons(key);
  // Mute and solo silence the keyboard exactly as they silence the song, so the
  // window has to say so the moment it happens — a keyboard that went quiet two
  // clicks ago otherwise reads as a broken keyboard.
  refreshOsk();
}

function setLaneSolo(key, on) {
  if (on) soloed.add(key); else soloed.delete(key);
  Audio.mixer?.lane(key)?.setSolo(on);
  syncLaneButtons(key);
  updateSoloLight();
  refreshOsk();
}

/**
 * One light for "something is soloed", and one click to undo it.
 *
 * Solo is the setting you leave on by accident: it is monitoring, so it is never
 * saved, never shows up in a diff, and a soloed channel three screens to the right
 * sounds exactly like every other channel being broken.
 */
function updateSoloLight() {
  const any = soloed.size > 0 || soloedAux.size > 0;
  const btn = $('clearsolo');
  btn.classList.toggle('on', any);
  btn.title = any
    ? `Soloed: ${[...soloed, ...[...soloedAux].map((id) => `${id} send`)].join(', ')} — click to clear`
    : 'Nothing is soloed';
}

/**
 * Take solo off the desk and off the engine, without saying anything about it.
 *
 * The quiet half of clearAllSolo, for the times solo goes away as part of something
 * larger — opening a song — where a toast would be reporting on a thing the user did
 * not do. The button sweep is a no-op when the rack is about to be rebuilt; it costs
 * a query and it keeps this honest for callers that leave the strips standing.
 */
function dropSolo() {
  for (const key of [...soloed]) { soloed.delete(key); Audio.mixer?.lane(key)?.setSolo(false); syncLaneButtons(key); }
  for (const id of [...soloedAux]) { soloedAux.delete(id); Audio.mixer?.setAuxSolo(id, false); }
  refreshOsk();
  for (const b of document.querySelectorAll('.strip.send .solobtn')) b.classList.remove('on');
  updateSoloLight();
}

function clearAllSolo() {
  const had = soloed.size + soloedAux.size;
  dropSolo();
  if (had) toast('Solo cleared');
}

/**
 * Put the desk's solo back on the engine, after something reset the strips.
 *
 * A mix reaches the engine through applyMix, and the first thing applyMix does is
 * reset every strip — which empties the engine's solo sets along with everything
 * else. The desk keeps its own copy so solo survives a rack rebuild, but nothing
 * ever pushed it back, so any action that re-applied the mix — a preset, a voice,
 * play, pause, holding A/B, undo — quietly un-soloed the channel while its S button
 * stayed lit. From there the button was a lie in the expensive direction: the next
 * click on it read as "turn solo off", so it took two clicks to hear the solo the
 * desk was already claiming to be in.
 */
function reapplySolo() {
  if (!Audio.mixer) return;
  const gone = [];
  for (const key of soloed) {
    const strip = Audio.mixer.lane(key);
    // A lane this mix does not have cannot be soloed, and leaving its key in the set
    // would silence the whole desk instead: solo means "only these", and this one is
    // not here to be heard.
    if (strip) strip.setSolo(true); else gone.push(key);
  }
  for (const key of gone) { soloed.delete(key); syncLaneButtons(key); }
  for (const id of soloedAux) Audio.mixer.setAuxSolo(id, true);
  updateSoloLight();
}

/** Light both copies of a lane's M and S — the strip's and the arrangement row's. */
function syncLaneButtons(key) {
  const sel = `[data-lane="${CSS.escape(key)}"]`;
  const muted = !!mixFor(trackId).lanes?.[key]?.mute;
  for (const b of document.querySelectorAll(`${sel} .mutebtn`)) b.classList.toggle('on', muted);
  for (const b of document.querySelectorAll(`${sel} .solobtn`)) b.classList.toggle('on', soloed.has(key));
}

/**
 * Repaint every control that shows one lane's level, from the mix.
 *
 * A lane's level is on screen in three places at once — the channel fader, the number
 * under it, and the slider on its arrangement row — and each of them can set it. So
 * each of them has to be able to REDRAW the others, or the desk shows one lane at two
 * levels and you have to guess which is playing.
 *
 * It used to be one-way: the fader synced the arrangement row, and the arrangement row
 * patched the fader inline from its own `input` handler. Which meant every path that
 * did not go through that one handler was a path that left something behind — and
 * double-clicking the arrangement row's slider was exactly that. It reset the lane and
 * left the fader standing where it was.
 *
 * `except` is the control the change CAME from, and it is not a nicety: the fader's
 * position is finer than the tenth of a dB the mix stores, so writing the rounded value
 * back into the fader you are dragging makes the thumb stutter under your thumb.
 */
function syncLaneGain(key, { except = null } = {}) {
  const gain = mixFor(trackId).lanes?.[key]?.gain ?? 0;
  const pos = dbToPos(gain);
  const sel = `[data-lane="${CSS.escape(key)}"]`;
  for (const el of document.querySelectorAll(`${sel} .arrgain, .strip${sel} .fader`)) {
    if (el !== except) el.value = pos;
  }
  for (const el of document.querySelectorAll(`.strip${sel} .db`)) {
    // Not while it is being typed into: the readout holds the type-in box, and writing
    // textContent over it removes the box out from under the caret.
    if (el !== except && !el.querySelector('input')) {
      el.textContent = `${gain > 0 ? '+' : ''}${gain.toFixed(1)}`;
    }
  }
}

/**
 * The preset a lane is REALLY playing.
 *
 * `voice` names a library preset and `voiceParams` carries this song's own copy of
 * one — see registerSongVoice. Where there is a copy it is what sounds, so it is what
 * the strip has to label, what the ✎ has to open and what the editor has to edit. One
 * answer, asked everywhere, so the desk cannot disagree with the engine about which
 * sound a channel is making.
 *
 * Registering here as well as in the engine's own merge is not a duplicate: the rack
 * paints before the first applyToEngine of a song, and a lane whose entry is not in
 * the catalogue yet draws as ENGINE — the one thing it certainly is not.
 */
function laneVoiceId(laneKey) {
  const seam = seamFor(laneKey);
  if (!seam) return null;
  const m = mixFor(trackId);
  const params = m.voiceParams?.[seam.voiceKey];
  if (params) return registerSongVoice(seam.voiceKey, trackId, params);
  const chosen = m.voice?.[seam.voiceKey];
  if (chosen) return chosen;
  const independent = (m.layers || []).some((l) => l.key === laneKey && l.independent);
  if (independent) {
    return PERCUSSION_LANES.includes(baseLane(laneKey)) ? DEFAULT_ADDED_PERCUSSION_VOICE : null;
  }
  return null;
}

/** The preset identity shown anywhere the desk names a channel. */
function presetForLane(laneKey) {
  const chosen = laneVoiceId(laneKey);
  return (chosen && VOICES[chosen])
    || (isIndependentLane(laneKey)
      ? VOICES[DEFAULT_ADDED_PERCUSSION_VOICE]
      : defaultVoiceOf(track?.bank, laneKey));
}

function presetHeadingFor(laneKey) {
  const preset = presetForLane(laneKey);
  return {
    name: preset?.label || targetLabel(laneKey),
    type: preset?.category ? String(preset.category).toUpperCase() : null,
  };
}

/**
 * Retitle one arrangement row after its preset changed.
 *
 * The row is the track and the strip is its channel, but both are titled with the same
 * thing: the name of the preset playing the lane. Only the strip was being repainted on
 * a voice change, so choosing a sound from the row's own right-click menu renamed the
 * strip and left the row behind — the one place you were looking.
 *
 * In place rather than through buildArrangement, because nothing about the SHAPE of the
 * song changed: the bars, the meters and the playback marks are all still correct, and
 * rebuilding the grid to write two words would throw them away under a moving playhead.
 * The lane's own name and family are read back off the row, so a lane with no preset
 * falls back to exactly what buildArrangement drew.
 */
function refreshLaneIdentity(laneKey) {
  const row = $('arrgrid')?.querySelector(`.arrrow[data-lane="${CSS.escape(laneKey)}"]`);
  if (!row) return;
  const preset = presetForLane(laneKey);
  const name = row.querySelector('.arrname');
  const category = row.querySelector('.arrpresetcat');
  if (name) {
    name.textContent = preset?.label || row.dataset.laneLabel || targetLabel(laneKey);
    // markClipped caches the full name to put back as a tooltip; leaving the old one
    // there would title the new name with the preset it replaced.
    delete name.dataset.full;
    markClipped(row);
  }
  if (category) category.textContent = preset?.category || cap(row.dataset.group || 'track');
}

function renderPresetHeading(el, laneKey) {
  el.textContent = '';
  if (!laneKey) return;
  const heading = presetHeadingFor(laneKey);
  const name = document.createElement('span');
  name.className = 'panelpreset';
  name.textContent = heading.name;
  el.append(name);
  if (heading.type) {
    const type = document.createElement('span');
    type.className = 'paneltype';
    type.textContent = heading.type;
    el.append(type);
  }
}

/**
 * An edit inside the voice editor, on a preset the SONG owns.
 *
 * A library preset is edited in place in the catalogue and saved to voices.js — the
 * panel's own Save. A song's copy has no home in the catalogue to be saved from: it
 * lives in this song's mix, so its edits are mix edits and this is where they land.
 * That is what puts them in the draft, in the undo stack, in the dirty light and in
 * the file the next Save writes — a preset copied into a song stops being a thing you
 * can lose by reloading.
 *
 * Tagged per voice key so a slider drag coalesces into one undo step, exactly as a
 * fader drag does.
 *
 * The `level` and `peak` that ride along are the editor's live estimates, and they are
 * written here for one reason only: so the mix and the sound agree. Nothing measures
 * them at save. A preset's level is what `voiceGain` divides the lane's target by,
 * which puts a new sound in the right ballpark so your fader stays where you put it —
 * and if an edit has moved the loudness, the fader is right there and the song already
 * saves it.
 * The exact numbers are settled in a batch, on purpose, by tools/measure-voices.js,
 * which is how the library has always worked too.
 */
function writeSongVoice(id, preset) {
  const key = songVoiceKey(id, trackId);
  if (!key) return;                     // a library preset: its home is voices.js
  editMix((m) => {
    m.voiceParams = { ...(m.voiceParams || {}), [key]: preset };
  }, `voiceparams:${key}`);
}

/**
 * Which of a song's voice keys name this preset.
 *
 * Both places a song can say so: its mix, where the desk put it, and its bank, where it
 * was written by hand — including any one section, since a song can change voice
 * part-way through. The answer is the set of keys to pin, because pinning writes a
 * `voiceParams` entry per key and a song using the same preset on two lanes needs two.
 */
function voiceKeysUsing(id, voiceId) {
  const keys = new Set();
  const m = mixFor(id);
  for (const [k, v] of Object.entries(m.voice || {})) if (v === voiceId) keys.add(k);
  const named = (o) => {
    if (!o) return;
    for (const [k, v] of Object.entries(o)) if (k.endsWith('Voice') && v === voiceId) keys.add(k);
  };
  const bank = resolveTrack(id)?.bank;
  named(bank);
  for (const sec of bank?.sections || []) named(sec);
  return [...keys];
}

/**
 * Freeze a preset's CURRENT sound into the songs that play it, then let the library
 * entry move on without them.
 *
 * The third answer to "this preset is in six songs", after updating them all and
 * forking to a new name. Here the library entry keeps its id and its name and becomes
 * the new sound, and the songs you tick stop tracking it: each gets its own copy of
 * what it sounds like right now, written into its mix as `voiceParams`, which
 * `laneVoiceId` reads in preference to the library. So they go on sounding exactly as
 * they do today, whatever happens to the preset afterwards.
 *
 * That last clause is the cost, and it is silent: a song pinned today will not receive
 * a fix made to that preset next month, and nothing on the desk will later explain why
 * it did not move. Which is why this is per-song and opt-in rather than a mode.
 *
 * It writes SONGS THE DESK IS NOT ON, which `saveMix` exists to make impossible — see
 * its note. The guard is right and this is genuinely the other case: that rule is there
 * so mixes are not balanced from memory, and nothing here is balanced at all. Every
 * written song is pinned to the sound it already makes, and each one still gets its own
 * history snapshot on the way, so it stays as undoable as any other save.
 */
async function pinPresetInSongs(voiceId, preset, trackIds) {
  const entries = {};
  for (const id of trackIds) {
    const keys = voiceKeysUsing(id, voiceId);
    if (!keys.length) continue;          // it moved since the list was drawn; nothing to pin
    const cur = JSON.parse(JSON.stringify(mixFor(id)));
    cur.voiceParams = { ...(cur.voiceParams || {}) };
    for (const k of keys) cur.voiceParams[k] = JSON.parse(JSON.stringify(preset));
    entries[id] = cur;
  }
  const ids = Object.keys(entries);
  if (!ids.length) return true;
  // Into the drafts first, so a failed write leaves the pin visible and undoable on the
  // desk rather than silently lost — the same place every other unsaved edit lives.
  for (const id of ids) draft[id] = entries[id];
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  try {
    const res = await fetch('/save', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids, entries }, null, 2),
    });
    const text = await res.text();
    if (!res.ok) { await tell('Those songs were not pinned', escapeHtml(text)); return false; }
    for (const id of ids) delete draft[id];
    try {
      const body = JSON.parse(text);
      if (body?.mix) saved = body.mix;
      else for (const id of ids) saved[id] = JSON.parse(JSON.stringify(entries[id]));
    } catch {
      for (const id of ids) saved[id] = JSON.parse(JSON.stringify(entries[id]));
    }
    localStorage.setItem(LS_KEY, JSON.stringify(draft));
    updateStatus();
    return true;
  } catch (err) {
    await tell('Those songs were not pinned', escapeHtml(String(err.message || err)));
    return false;
  }
}

/**
 * Library presets carrying edits that are on the sound and nowhere else.
 *
 * The trap this closes: the editor writes straight into the catalogue entry, which is
 * why an edit is audible everywhere the moment you make it and why it rides through a
 * song change. Nothing on disk has moved, though — `Save song` writes the song, not
 * the library — so a reload puts the file's version back and the work is simply gone.
 * The panel could not warn about it either: it forgets its state when it closes, and
 * the loss happens later.
 *
 * A song's own copy is not in here. It lives in the draft mix, which is in
 * localStorage from the moment it is touched, so it survives a reload by construction.
 */
const dirtyLibraryVoices = new Set();

function markVoiceDirty(id, dirty) {
  if (!id || songVoiceKey(id, trackId)) return;   // a copy is saved with its song
  if (dirty) dirtyLibraryVoices.add(id); else dirtyLibraryVoices.delete(id);
  updateStatus();
}

// The only moment the loss can still be prevented. Browsers will not show our words —
// it is their own dialogue — but they show it, and that is the whole job: a reload
// that would have quietly dropped an hour of sound design now asks first.
addEventListener('beforeunload', (ev) => {
  if (!dirtyLibraryVoices.size) return;
  ev.preventDefault();
  ev.returnValue = '';
});

/**
 * Copy the sound on the panel into this song, as the song's own.
 *
 * Nothing is measured here. The copy keeps the level of the preset it was made from,
 * which puts it in the right ballpark, and if the edit has moved the loudness the
 * channel fader is the control for that — the song saves it already. Exact levels are
 * settled in a batch by tools/measure-voices.js, which is where the library's have
 * always come from; a preset that renders silent offline is reported there too.
 *
 * The lane then plays the copy rather than the preset it was made from, which is what
 * moves the editor onto it: `syncVoiceEditorToLane` sees the lane's voice change and
 * follows. From that moment every touch goes to the draft through `writeSongVoice`,
 * and the song's own Save is what puts it on disk.
 */
function saveVoiceToSong(laneKey, preset) {
  const seam = laneKey && seamFor(laneKey);
  if (!seam) { toast('This lane cannot take a voice, so it cannot carry one'); return false; }
  editMix((m) => {
    m.voiceParams = { ...(m.voiceParams || {}), [seam.voiceKey]: preset };
  });
  rebank();
  applyToEngine(mixFor(trackId));
  // Onto the copy, which is what the lane plays now. Then the repaint, which is also
  // what puts the panel back beside its strip.
  syncVoiceEditorToLane(laneKey);
  buildRack();
  refreshOsk();
  toast(`${preset.label} is now ${targetLabel(laneKey)}’s own in ${track.title}`
    + ' — save the song to keep it.', 4000);
  return true;
}

/**
 * Choose what a lane is played BY.
 *
 * A voice is a bank key (`bassVoice`), so it merges onto the bank at schedule time
 * rather than being pushed at a live node the way a fader is — which means it is the
 * one control on this desk that has to go back through setBank to be heard. See
 * `rebank`, which `undo` needs for the same reason.
 *
 * Choosing a preset drops this song's copy of whatever was there. The copy was a
 * version OF the old preset — its envelope, its filter, its name — so keeping it over
 * the top of a new choice would mean picking Sub Sine and hearing the bass you had
 * already shaped, with no way to tell why. Undo puts it back.
 */
function setLaneVoice(laneKey, voiceId, { redraw = true, autoCopy = true } = {}) {
  const seam = seamFor(laneKey);
  const before = mixFor(trackId);
  const hadCopy = !!before.voiceParams?.[seam.voiceKey];
  const layerDef = (before.layers || []).find((l) => l.key === laneKey);
  const independent = !!layerDef?.independent;
  const previousVoice = before.voice?.[seam.voiceKey];
  const previousVoiceLabel = previousVoice && VOICES[previousVoice]?.label;
  const customLayerLabel = !!(layerDef?.label
    && layerDef.label !== previousVoiceLabel
    && !/^Track \d+$/.test(layerDef.label));
  editMix((m) => {
    const v = { ...(m.voice || {}) };
    if (voiceId) v[seam.voiceKey] = voiceId; else delete v[seam.voiceKey];
    m.voice = Object.keys(v).length ? v : undefined;
    if (m.voiceParams?.[seam.voiceKey]) {
      const p = { ...m.voiceParams };
      delete p[seam.voiceKey];
      m.voiceParams = Object.keys(p).length ? p : undefined;
    }
    if (voiceId && independent) {
      m.layers = (m.layers || []).map((l) => l.key === laneKey
        ? (customLayerLabel ? l : { ...l, label: VOICES[voiceId].label }) : l);
    }
  });
  rebank();
  // The editor goes where the lane goes — onto the new preset, or off the desk when
  // the lane is sent back to the engine. See syncVoiceEditorToLane.
  const closed = syncVoiceEditorToLane(laneKey, { autoCopy });
  // A voice change updates the strip's header and the arrangement identity together.
  // The picker owns the interaction now, so the rack can repaint normally after a choice.
  if (redraw || closed) buildRack();
  applyToEngine(mixFor(trackId));
  // The strip is only half of what names this preset. The track row names it too — and
  // the row is where the right-click that changes it usually starts — so a choice that
  // repainted only the rack left the row you clicked still reading the sound you had
  // just replaced. An independent lane can also change its LABEL here, which moves the
  // row's name as well as its preset, so that one goes through a full rebuild.
  if (independent) buildArrangement(); else refreshLaneIdentity(laneKey);
  // Both note editors title themselves with the preset name as well, and both no-op
  // when they are closed. See rebuildForShape.
  stepSeq.refresh();
  pianoRoll.refresh();
  syncNotesPanel();                     // the Notes header names the preset on the roll
  refreshOsk();                         // the keyboard names what it is playing with
  const gone = hadCopy ? ' — this song’s own copy dropped, ⌘Z to put it back' : '';
  toast((voiceId ? `${targetLabel(laneKey)} → ${VOICES[voiceId].label}`
    : `${targetLabel(laneKey)} → the engine’s own voice`) + gone);
}

// ---- tracks: duplicate, delete, restore -------------------------------------
//
// Everything above this line changes how a track SOUNDS. These four change which
// tracks the song has, which is the one kind of edit the desk could not make: the
// arrangement was whatever the bank said and the only answer to "I want the bass
// doubled with a sub" was to write a second lane into the song file by hand.
//
// Both are stored in the mix (`layers`, `off`) and applied by deskBank, so the song
// file is never rewritten, ⌘Z steps back over them like any other edit, and deleting
// the mix entry puts the song back exactly as it was composed.

/** Rebuild everything that shows the lane list. Both edits below change it. */
function rebuildForShape() {
  // Own the cache invalidation here. A caller should not be able to request a shape
  // rebuild and accidentally repaint the last shaped bank because it forgot to
  // clear one signature first.
  bankCache = { bank: null, sig: null, out: null };

  // Repaint from the new lane set before touching the live engine. Re-banking can
  // legitimately do audio work (voice disposal, graph pruning); if that ever throws,
  // a completed mix edit must not leave the deleted strip and arrangement row on
  // screen until the next reload.
  buildRack();
  buildArrangement();
  // The note editors are drawn from the same draft the arrangement is, so a shape
  // change has to reach them too. Undo is the case that showed it: stepping back over
  // a note edit moved the bars, rebuilt the grid above, and left the panel you made
  // the edit in still showing it — the one place you were looking. Both are cheap and
  // both no-op when closed, so this is the choke point rather than the call sites.
  stepSeq.refresh();
  pianoRoll.refresh();
  fitStrips();
  rebank();
  applyToEngine(mixFor(trackId));
}

/** The next free key for a layer of `from`: bass → bass2, then bass3. */
function nextLayerKey(from) {
  const taken = new Set((mixFor(trackId).layers || []).map((l) => l.key));
  for (let n = 2; ; n++) if (!taken.has(`${from}${n}`)) return `${from}${n}`;
}

/** Layers laid over a lane — the rows that go with it if it is deleted. */
const layersOf = (key) => (mixFor(trackId).layers || []).filter((l) => l.from === key);
/** A new editor track uses layer-shaped storage, but it is not a duplicate. */
const isIndependentLane = (key) => !!(mixFor(trackId).layers || [])
  .find((l) => l.key === key && l.independent)
  || pendingAddTrack?.key === key;

/**
 * Duplicate a track: the same part, on a second strip, so a different voice can go
 * under it. The copy is where a layer comes from — a sub under the bass, a pad under
 * the chords, a rimshot doubling the snare — none of which the desk could do before,
 * because there was only ever one strip per part.
 *
 * The channel comes across with it: a layer arriving at unity under a part sitting at
 * −6 is not under it, it is on top of it. Solo does not, because solo is monitoring.
 *
 * A layer is played by a preset and nothing else — it has no hand-written body in the
 * engine — so a lane the voice library cannot play cannot be layered either, and a
 * fresh layer opens the library rather than sitting there silently.
 */
function duplicateLane(key) {
  const from = baseLane(key);
  const seam = seamFor(key);
  if (!seam) {
    toast(`${targetLabel(key)} is a gesture the engine plays, not a part a voice can`
      + ' play — there is nothing to layer');
    return;
  }
  const newKey = nextLayerKey(from);
  const newSeam = seamFor(newKey);
  const cur = mixFor(trackId);
  // Only a preset carries over. An ENGINE voice is a bundle of bank keys the
  // hand-written lane reads, and a layer has no hand-written lane — see voicesFor.
  const carried = cur.voice?.[seam.voiceKey];
  const keepVoice = carried && VOICES[carried]?.kind !== 'engine' ? carried : null;
  editMix((m) => {
    m.layers = [...(m.layers || []), { key: newKey, from }];
    m.lanes = m.lanes || {};
    const copy = JSON.parse(JSON.stringify(m.lanes[key] || {}));
    delete copy.mute;              // a duplicate you cannot hear is not a duplicate
    m.lanes[newKey] = copy;
    if (keepVoice) m.voice = { ...(m.voice || {}), [newSeam.voiceKey]: keepVoice };
  });
  rebuildForShape();
  selectLane(newKey);
  if (keepVoice) {
    toast(`${targetLabel(newKey)} added — same part, same voice. Give it a different`
      + ' one and you have a layer.');
    return;
  }
  // No voice or pattern is carried over: this is a new empty strip. The library is
  // the next thing you were going to open anyway, and opening it says so more plainly
  // than a toast about a strip you have not looked at yet.
  toast(`${targetLabel(newKey)} added — choose the voice it plays`);
  const strip = document.querySelector(`.strip[data-lane="${CSS.escape(newKey)}"] .strippreset`)
    || document.querySelector(`.strip[data-lane="${CSS.escape(newKey)}"] .striphead`);
  const r = strip?.getBoundingClientRect();
  openVoicePicker(r ? r.left : innerWidth / 2, r ? r.bottom + 4 : 120, newKey);
}

/** Commit the staged Add Track once the user has chosen its first preset. */
function commitPendingAddTrack(laneKey, voiceId) {
  const pending = pendingAddTrack;
  if (!pending || pending.key !== laneKey) return false;
  const seam = seamFor(laneKey);
  if (!seam) { pendingAddTrack = null; return false; }
  pendingAddTrack = null;
  editMix((m) => {
    m.layers = [...(m.layers || []), {
      key: pending.key, from: pending.from, independent: true,
      ...(voiceId && VOICES[voiceId] ? { label: VOICES[voiceId].label } : { label: pending.label }),
    }];
    m.lanes = m.lanes || {};
    // A newly-added channel is deliberately independent of the selected lane. Keep
    // the neutral state explicit so no live strip, send, EQ, or insert can leak into it.
    m.lanes[pending.key] = emptyLaneMix();
    const voice = { ...(m.voice || {}) };
    if (voiceId) voice[seam.voiceKey] = voiceId;
    else delete voice[seam.voiceKey];
    m.voice = Object.keys(voice).length ? voice : undefined;
  });
  bankCache.sig = null;
  rebuildForShape();
  selectLane(laneKey);
  toast(`${targetLabel(laneKey)} added${voiceId && VOICES[voiceId] ? ` — ${VOICES[voiceId].label}` : ''}`);
  return true;
}

/** Stage a silent, independently sequenced track, then let the preset selector name it. */
function addPercussionLane(anchor = null) {
  const from = 'tom';
  const newKey = nextLayerKey(from);
  const extras = (mixFor(trackId).layers || []).filter((l) => l.independent
    && PERCUSSION_LANES.includes(baseLane(l.key))).length;
  const label = `Track ${extras + 1}`;
  pendingAddTrack = { key: newKey, from, label };
  const plusRect = anchor?.getBoundingClientRect?.();
  // The arrangement plus is the action's anchor. There is no strip yet, so the
  // selector uses the plus itself rather than a temporary row that would look real.
  const x = plusRect ? plusRect.right + 8 : innerWidth / 2;
  const y = plusRect ? plusRect.top : 120;
  openVoicePicker(x, y, newKey);
}

/**
 * Delete a track from this song.
 *
 * A layer is removed outright — it only ever existed in this mix. A lane of the song
 * itself is taken OFF the mix instead: the bank keeps its notes, this song's desk
 * stops having that channel, and putting it back is one item in the Song Desk drawer. Nothing
 * is written to a composition file, here or ever.
 *
 * Layers standing on the lane go with it. A layer of a part that is no longer in the
 * song is a row playing nothing.
 */
async function deleteLane(key) {
  const label = targetLabel(key);
  const layer = isLayer(key);
  const layerDef = (mixFor(trackId).layers || []).find((l) => l.key === key);
  const independent = !!layerDef?.independent;
  const kids = layer ? [] : layersOf(key);
  const also = kids.length
    ? `\n\nThe ${kids.length} layer${kids.length === 1 ? '' : 's'} on it `
      + `(${kids.map((l) => targetLabel(l.key)).join(', ')}) ${kids.length === 1 ? 'goes' : 'go'} too.`
    : '';
  const body = (layer
    ? independent
      ? 'It is an added sound, so this removes its pattern, mixer channel and settings.'
      : 'It is a duplicate, so this removes it and its settings.'
    : 'The song keeps the part — this removes the channel and arrangement row from this desk. '
      + 'The other tracks and all song bars stay in place. <b>⌘Z puts it back.</b>')
    + (also ? `<br><br>${escapeHtml(also.trim())}` : '');
  // The track is named here and nowhere else in the gesture: the button that starts it
  // says only `Delete track`, so this is the one place you can check you are about to
  // delete the one you meant. Same verb as the button, so the confirmation reads as the
  // second half of the thing you clicked rather than as a different question.
  const number = laneNumbers.get(key);
  if (!await ask(`Delete ${number ? `track ${number}, ` : ''}${escapeHtml(label)}?`,
    body, 'Delete')) return;
  const drop = new Set([key, ...kids.map((l) => l.key)]);
  // Pattern notes live in the arrangement while the channel itself lives in the
  // mix. Capture and clean both before changing either, then make one undo snapshot
  // so ⌘Z restores the complete instrument rather than only half of it.
  const currentArrangement = arrDraftOf();
  const cleanedArrangement = removeLanes(currentArrangement, [...drop]);
  const arrangementChanged = JSON.stringify(cleanedArrangement)
    !== JSON.stringify(currentArrangement);
  pushUndo(null);
  editMix((m) => {
    m.layers = (m.layers || []).filter((l) => !drop.has(l.key) && !drop.has(l.from));
    if (!m.layers.length) m.layers = undefined;
    if (!layer) m.off = [...new Set([...(m.off || []), key])];
    for (const k of drop) {
      // A deleted LAYER takes its settings with it — nothing will ever read them
      // again. A lane that is only off keeps its channel, so restoring it gives back
      // the strip you had rather than one at unity.
      if (k !== key || layer) delete m.lanes?.[k];
      const s = seamFor(k);
      if (s && m.voice) {
        delete m.voice[s.voiceKey];
        if (!Object.keys(m.voice).length) m.voice = undefined;
      }
    }
  }, null, { undo: false });
  let arrangementError = null;
  if (arrangementChanged) {
    try {
      const entry = entryOf(editBank(), cleanedArrangement);
      arrDraft[trackId] = entry;
      localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
    } catch (err) {
      // The mix already owns the structural deletion. Arrangement cleanup is
      // secondary metadata; it must never strand the deleted strip on screen.
      arrangementError = err;
      console.error('Could not clean the deleted track from the arrangement', err);
    }
  }
  // Shape changes are the cache invalidation boundary, even when the lane had no
  // authored arrangement notes. In particular, a freshly-added empty track has no
  // arrangement delta to remove, but its layer still has to disappear from the rack
  // and the arrangement immediately.
  bankCache.sig = null;
  for (const k of drop) { soloed.delete(k); Audio.mixer?.lane(k)?.setSolo(false); }
  updateSoloLight();
  if (drop.has(selectedLane)) {
    selectedLane = null;
    localStorage.removeItem(LANE_KEY);
  }
  // Keep a song-range selection, but detach it from the lane that has gone. Without
  // this, the timeline can keep targeting a key that no longer has a row.
  if (selectedBar && drop.has(selectedBar.key)) selectedBar = { ...selectedBar, key: null };
  let refreshError = null;
  try {
    if (arrangementChanged && !arrangementError) buildTimeline();
    rebuildForShape();
  } catch (err) {
    // rebuildForShape paints before it re-banks, but keep a final DOM postcondition
    // below as well. An audio error is not permission for an old strip to remain.
    refreshError = err;
    console.error('Track was removed but the desk refresh did not finish', err);
  }

  // Postcondition: once the mix says a lane is gone, neither of its two screen
  // representations may survive. This is deliberately after the normal rebuild;
  // it is a safety net for a partially-failed repaint, not a second delete path.
  const after = mixFor(trackId);
  const mixRemoved = layer
    ? !(after.layers || []).some((item) => drop.has(item.key))
    : (after.off || []).includes(key);
  if (mixRemoved) {
    for (const laneKey of drop) {
      document.querySelector(`.arrrow[data-lane="${CSS.escape(laneKey)}"]`)?.remove();
      const strip = document.querySelector(`.strip[data-lane="${CSS.escape(laneKey)}"]`);
      const pair = strip?.closest('.voicepair');
      if (pair) pair.remove(); else strip?.remove();
    }
  }
  const warning = arrangementError || refreshError ? ' — refresh warning; reload if audio stopped' : '';
  toast(`${label} removed — ⌘Z to undo${warning}`, warning ? 5000 : 2200);
}


/**
 * Everything about one TRACK, in the window a bar already opens: its name, what plays
 * it, what it plays, the channel it plays through, and exact adjustments across the
 * song. Right-clicking the strip or the arrangement row header lands here.
 *
 * It replaced a list of fixed items because a track is not a list of verbs — half of
 * what you want from one is a value, and typing 3 into Transpose beat picking
 * "Transpose +3" out of a submenu. Mute and solo are the two things deliberately not
 * here: both views already carry those buttons, permanently and with their state on.
 */
function openTrackEditor(x, y, key, options = {}) {
  openRegionEditor(x, y, { laneKey: key, from: 0, to: 0, wholeTrack: true, ...options });
}

/**
 * Open the preset picker against a lane's own strip.
 *
 * The picker is placed at a point, because it is normally opened by clicking one. A
 * menu item has no such point, so it borrows the strip's preset name — which is where
 * the answer appears anyway.
 */
function openVoicePickerFor(laneKey) {
  const row = document.querySelector(`.strip[data-lane="${CSS.escape(laneKey)}"] .strippreset`)
    || document.querySelector(`.strip[data-lane="${CSS.escape(laneKey)}"] .striphead`);
  const r = row?.getBoundingClientRect();
  selectLane(laneKey);
  openVoicePicker(r ? r.left : innerWidth / 2, r ? r.bottom + 4 : 120, laneKey);
}

/**
 * The preset editor — see tools/mixer-voice-editor.js.
 *
 * Handed the desk's own pot so a preset's ATTACK behaves like every other rotary on
 * the desk, and a `refresh` so an edit is audible on the lane while it is made. It
 * mutates the catalogue entry in place, which is what makes that work: `VOICES[id]`
 * is the object `playVoice` reads at schedule time, so a re-bank is the whole of the
 * plumbing between a slider and the sound.
 */
// Held, not looked up. The panel is a rack item that gets detached whenever it is
// closed or the rack repaints, and `getElementById` does not find a detached element —
// so a lookup would come back null the first time `buildRack` ran, and stay null.
const voiceEditEl = $('voiceedit');

const voiceEditor = createVoiceEditor({
  el: voiceEditEl,
  knob,
  toast,
  // Not `rebank`. A re-bank restarts the sequencer with a deliberate half-second gap,
  // which on a slider drag is half a second of silence per pixel — see
  // `VoiceRack.refresh`. Dropping the synths built from the old options is the whole
  // of what an edit needs, and the next note is already the new sound.
  refresh: (id) => Audio.refreshVoice(id),
  // For measuring a preset here in the page: the engine's SEEDED noise buffer, so a
  // noise preset is measured on the same bytes it will be played on, and the desk's
  // own sample rate, so the reference and the comparison are taken the same way.
  // Both read late — the buffer is built when audio starts, well after this runs.
  noiseBuf: () => Audio.noiseBuf,
  sampleRate: () => Audio.ctx?.sampleRate || 44100,
  // A preset's name and category are what the picker and every strip label show, so
  // an edit to either has to reach the rack — and its level reaches the rack too,
  // through `voiceGain`, once a save has measured it. The user collection is filed BY those
  // two, so a rename moves a row and a refile moves it to another column: it has to
  // repaint or it goes on showing the preset under the name it no longer has.
  onChanged: () => { buildRack(); voiceLibrary.refresh(); },
  onBlank: () => voiceLibrary.clearPick(),
  ask,
  isDevUser: () => DEV_USER,
  // A never-saved preset takes its id from its name at the moment it is saved, so the
  // lane holding the old id has to be repointed at the new one — see `commit`.
  assign: (laneKey, id) => { if (laneKey) setLaneVoice(laneKey, id, { redraw: false, autoCopy: false }); },
  // Where an edit lands when the preset is the song's own — see writeSongVoice.
  onEdit: writeSongVoice,
  saveToSong: saveVoiceToSong,
  // Hold named songs on the sound they have now, so updating the preset leaves them
  // alone. See pinPresetInSongs — it writes songs the desk is not on, which is the one
  // place anything here does.
  onDirty: markVoiceDirty,
  // Detached, not just hidden: it is a rack item now, and a hidden one still sitting
  // between two strips would leave a gap in the row.
  //
  // Docked in the preset library it FOLDS instead. There the ✕ is on a panel you are
  // living in rather than one you opened for a moment, and tearing it down would lose
  // which preset it was on — so the same button means "put this away" and the panel
  // comes back exactly as it was. See setCollapsed.
  close: () => {
    if (voiceLibrary.slots && !voiceEditor.laneKey) { voiceLibrary.collapse('edit', true); return; }
    dismissVoiceEditor();
    buildRack();
  },
});

/** Take the panel down, without asking for the rack repaint that `close` does. */
function dismissVoiceEditor() {
  voiceEditEl.classList.remove('show', 'vefloat');
  voiceEditEl.remove();
  voiceEditor.forget();
}

// ---- the editor as a window -------------------------------------------------
//
// Opened from the preset library there is no lane and no strip, so the panel cannot be
// a rack item: it floats, with the keyboard's manners. See placeVoiceEditor.

const VE_POS_KEY = 'mash-mixer-voiceedit-pos';

/** Put the floating editor somewhere on the screen, and remember where. */
function placeFloatingEditor(x, y) {
  const el = voiceEditEl;
  if (x == null) {
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(VE_POS_KEY) || 'null'); } catch { pos = null; }
    const r = el.getBoundingClientRect();
    // First open: to the right of the library window, which opens centred — so the two
    // are side by side rather than the editor landing on top of the list it came from.
    x = pos?.x ?? Math.max(4, innerWidth - r.width - 40);
    y = pos?.y ?? 120;
  }
  const r = el.getBoundingClientRect();
  const left = clamp(x, 4, Math.max(4, innerWidth - r.width - 4));
  const top = clamp(y, 4, Math.max(4, innerHeight - r.height - 4));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  localStorage.setItem(VE_POS_KEY, JSON.stringify({ x: left, y: top }));
}

// Dragged by its header, like every other window here. Delegated from the panel rather
// than bound to the header, because `build()` replaces the header on every repaint — a
// listener on the header itself would survive exactly until the first slider moved.
voiceEditEl.addEventListener('pointerdown', (ev) => {
  if (!voiceEditEl.classList.contains('vefloat')) return;
  const head = ev.target.closest('.vehead');
  if (!head || ev.target.closest('button, input, select, textarea')) return;
  ev.preventDefault();
  const r = voiceEditEl.getBoundingClientRect();
  const dx = ev.clientX - r.left;
  const dy = ev.clientY - r.top;
  const move = (e) => placeFloatingEditor(e.clientX - dx, e.clientY - dy);
  const stop = () => { head.removeEventListener('pointermove', move); head.classList.remove('dragging'); };
  head.classList.add('dragging');
  try { head.setPointerCapture(ev.pointerId); } catch { /* not a real pointer */ }
  head.addEventListener('pointermove', move);
  head.addEventListener('pointerup', stop, { once: true });
  head.addEventListener('pointercancel', stop, { once: true });
});

/**
 * Keep the editor pointed at whatever its lane is actually playing.
 *
 * The panel edits ONE preset, beside ONE strip, drawn as a single object with it — so
 * the moment the lane is put on something else, every control on it is aimed at a
 * sound nothing on screen is making. It follows the lane instead: onto the new preset
 * where there is one to open, and off the desk entirely where there is not — the
 * engine's own voice has no entry behind it at all, and an engine preset is a bundle
 * of bank keys the hand-written lane reads rather than a synth, which is why `open`
 * refuses one.
 *
 * Following RE-OPENS rather than re-labels. `open` takes the sound it finds as the
 * baseline, and the baseline belongs to the preset you have arrived at, not the one
 * you left — otherwise Revert on the new preset would put back the old one's shape.
 * Edits made to the preset you left are still on it: the editor mutates the catalogue
 * entry in place, so stepping back onto it finds them.
 *
 * Returns true only when the panel CLOSED, because that is the case the caller has to
 * repaint for: the panel and its strip share a wrapper and the wrapper has to go.
 * Following needs no repaint — `build` refills the panel where it already sits, which
 * is what keeps the ‹ › audition loop from losing the hover under the pointer.
 */
function syncVoiceEditorToLane(laneKey, { autoCopy = true } = {}) {
  if (!voiceEditor.isOpen() || !laneKey || voiceEditor.laneKey !== laneKey) return false;
  let chosen = laneVoiceId(laneKey);
  let preset = chosen && VOICES[chosen];
  if (!preset || preset.kind === 'engine') { dismissVoiceEditor(); return true; }
  // Auto-copy a library preset into the song so the editor never mutates the shared
  // catalogue through a lane strip. Skipped when the lane was just repointed at the
  // library by a Save — that preset IS this sound, and copying it back
  // would undo the save.
  if (autoCopy && !preset.songLocal) {
    const seam = seamFor(laneKey);
    if (seam) {
      editMix((m) => {
        m.voiceParams = { ...(m.voiceParams || {}), [seam.voiceKey]: JSON.parse(JSON.stringify(preset)) };
      });
      rebank();
      applyToEngine(mixFor(trackId));
      chosen = laneVoiceId(laneKey);
      preset = VOICES[chosen];
    }
  }
  if (chosen === voiceEditor.editing) return false;
  voiceEditor.open(chosen, { laneKey, laneLabel: targetLabel(laneKey) });
  return false;
}

/**
 * Put the editor back beside the strip it belongs to.
 *
 * The panel is a rack item, not a window: `buildRack` empties the rack on every
 * repaint, which detaches it, and a save or a rename repaints. Holding the element in
 * a variable means it survives being detached with its inputs and their focus intact —
 * so this is a re-insert, not a rebuild, and typing into the name field while the rack
 * repaints does not lose the caret.
 *
 * A lane that has gone (deleted, or filtered out of the view) leaves the editor with
 * nowhere to sit, so it closes rather than reappearing at the end of the rack attached
 * to nothing.
 */
function placeVoiceEditor() {
  const el = voiceEditEl;
  const laneKey = voiceEditor.laneKey;
  if (!voiceEditor.isOpen()) { el.remove(); return; }
  // Opened from the library there is no strip to sit beside, so it is a window instead
  // of a rack item: parked on the body, out of the rack entirely, where a repaint
  // cannot detach it. Returning here rather than falling through is the whole of it —
  // everything below is about finding a strip and becoming one object with it.
  if (!laneKey) {
    // Inside the library, if it is open: that window has a slot down its right side
    // and the three panels are one workspace. Floating is the fallback for a
    // lane-free editor with no library behind it, which nothing opens today.
    if (voiceLibrary.slots) { dockIntoLibrary(); return; }
    if (el.parentElement !== document.body) document.body.append(el);
    el.classList.remove('vedocked');
    el.classList.add('vefloat');
    placeFloatingEditor();
    return;
  }
  el.classList.remove('vefloat', 'vedocked');
  const strip = document.querySelector(`.strip[data-lane="${CSS.escape(laneKey)}"]`);
  // Not `close()`: this runs FROM buildRack, and close rebuilds the rack. Tearing the
  // panel down without asking for another repaint is the whole difference between
  // closing an editor and re-entering the function that is already running.
  if (!strip) { dismissVoiceEditor(); return; }

  // The strip and its editor become ONE object in the rack, not two next to each
  // other: a wrapper takes the border, the radius, the background and the selected
  // outline, and both children give theirs up. Faking it — butting two bordered boxes
  // together and hiding the facing edges — cannot survive `.strip.selected`, which
  // draws a box-shadow right round the perimeter and would put a seam down the join.
  //
  // Nothing else in the desk cares that the strip is a level deeper: `fitStrips` finds
  // strips with a descendant query, and the rack's only other direct child is the send
  // slot, which is held across the rebuild by reference.
  //
  // Reused where there is one, never nested. This runs on every rack repaint AND on
  // every open, and an open does not repaint — so wrapping unconditionally put the new
  // wrapper INSIDE the old one, a fresh border per click of the ✎.
  const existing = strip.parentElement?.classList.contains('voicepair')
    ? strip.parentElement : null;
  const pair = existing || document.createElement('div');
  if (!existing) {
    pair.className = 'voicepair';
    strip.replaceWith(pair);
    pair.append(strip);
  }
  // The strip's own colour, so the wrapper's header band wears the lane's wash and its
  // rule the lane's hue — one header across one container.
  const cs = getComputedStyle(strip);
  pair.style.setProperty('--lane', cs.getPropertyValue('--lane') || '');
  pair.style.setProperty('--lanedim', cs.getPropertyValue('--lanedim') || '');
  // Carried onto the wrapper, because the wrapper is what draws it now.
  pair.classList.toggle('selected', strip.classList.contains('selected'));
  // `append` MOVES a node it already holds, so this is also the re-place.
  pair.append(el);

  // An expanded channel is one object, so it gets one identity. The strip already
  // owns the authoritative name and type; copying those into a shared header prevents
  // the editor's library label from disagreeing with the channel beside it. The editor
  // keeps its own header data for its floating/library homes, where there is no strip.
  let pairHead = [...pair.children].find((child) => child.classList.contains('voicepairhead'));
  if (!pairHead) {
    pairHead = document.createElement('div');
    pairHead.className = 'voicepairhead';
    pair.append(pairHead);
  }
  pairHead.textContent = '';
  const stripTitle = strip.querySelector('.striphead h3');
  const sharedTitle = document.createElement('h3');
  sharedTitle.className = 'voicepairtitle strippreset';
  sharedTitle.textContent = stripTitle?.textContent || targetLabel(laneKey);
  sharedTitle.title = stripTitle?.title || `Change the preset for ${targetLabel(laneKey)}`;
  sharedTitle.setAttribute('role', 'button');
  sharedTitle.tabIndex = 0;
  const choosePreset = (ev) => {
    ev.stopPropagation();
    selectLane(laneKey);
    openVoicePicker(ev.clientX, ev.clientY, laneKey);
  };
  sharedTitle.addEventListener('click', choosePreset);
  sharedTitle.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    const r = sharedTitle.getBoundingClientRect();
    choosePreset({ clientX: r.left, clientY: r.bottom, stopPropagation() {} });
  });
  pairHead.append(sharedTitle);
  const stripType = strip.querySelector('.striphead .stripsub');
  if (stripType) {
    const sharedType = document.createElement('div');
    sharedType.className = 'voicepairtype';
    sharedType.textContent = stripType.textContent;
    pairHead.append(sharedType);
  }
}

/**
 * Open the editor on a lane's chosen preset.
 *
 * It used to take an `isNew` option, for a menu item that opened the editor already
 * forked onto a copy. The editor has its own **Save as new**, which is the same gesture
 * at the moment you want it — after you have moved something and decided to keep it —
 * so the option had no caller left and is gone rather than left as a branch nothing
 * takes. The editor's own `state.isNew` is unaffected: that is what its Save as new sets.
 */
function editVoice(laneKey) {
  let chosen = laneVoiceId(laneKey);
  if (!chosen) {
    // Nothing to copy and nothing to edit. The engine's own voice is not a preset —
    // it is what plays when no preset is named — so there is no entry behind it.
    toast('This lane is on the engine’s own voice. Choose a preset first, then edit it'
      + ' — or copy one into a new preset.');
    return;
  }
  // Opening the editor from a lane always works on a song-local copy. The library
  // preset is never mutated through a channel strip — edit it from the library
  // browser if you mean to change it for every song.
  const v = VOICES[chosen];
  if (v && !v.songLocal && v.kind !== 'engine') {
    const seam = seamFor(laneKey);
    if (seam) {
      editMix((m) => {
        m.voiceParams = { ...(m.voiceParams || {}), [seam.voiceKey]: JSON.parse(JSON.stringify(v)) };
      });
      rebank();
      applyToEngine(mixFor(trackId));
      chosen = laneVoiceId(laneKey);  // now returns the song-local id
    }
  }
  closeMenu();
  selectLane(laneKey);
  // Already open on this very preset: bring it into view and stop. Re-opening would
  // call `open` again, which takes the CURRENT sound as the baseline — so a second
  // click on the ✎ would quietly make your unsaved edits the thing Revert goes back to.
  if (voiceEditor.isOpen() && voiceEditor.laneKey === laneKey
      && voiceEditor.editing === chosen) {
    voiceEditEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    return;
  }
  if (!voiceEditor.open(chosen, { laneKey, laneLabel: targetLabel(laneKey) })) return;
  placeVoiceEditor();
  // Into view, because the rack scrolls: opening a panel you cannot see reads as a
  // button that did nothing.
  voiceEditEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

// ---- the preset library -----------------------------------------------------
//
// The catalogue with no song in front of it. See tools/mixer-voice-library.js — the
// window, the patterns, and the bench a preset with no channel is heard on.

const voiceLibrary = createVoiceLibrary({
  el: $('voicelib'),
  Audio,
  // Read late and through a closure, for two reasons: the pattern follows the desk
  // tempo including while you drag it, which is how you hear what a release really
  // does — and `deskTempo` is declared several thousand lines below this, so naming it
  // directly here would be reading a `const` before it exists.
  bpm: () => deskTempo(),
  /**
   * The song's clock, for the pattern to lock onto — null when nothing is playing.
   *
   * Read straight off the sequencer rather than derived from the tempo readout. `spb`
   * carries the warp multiplier, which the readout does not, and `nextTime`/`step` are
   * the actual grid the song's own notes are being placed on — so a figure started
   * against them is on the beat because it is on the same beat, not because two clocks
   * were set to the same number and have not drifted yet.
   */
  sync: () => {
    if (!playing || !Audio.ctx || !Audio.bpm) return null;
    return {
      time: Audio.nextTime,
      step: Audio.step,
      spb: (60 / (Audio.bpm * (Audio.tempo || 1))) / 4,
    };
  },
  edit: editLibraryVoice,
  file: () => voiceEditor.saveSheet(),
  editing: () => voiceEditor.editing,
  // The keyboard plays whatever is on the bench while the library is up, so it has to
  // be told the moment that changes — otherwise it goes on naming the last preset.
  scale: () => oskScale(),
  onPick: () => refreshOsk(),
  // The library rebuilt itself, which detached whatever was parked in it. Put them
  // back — same contract `placeVoiceEditor` has with `buildRack`.
  onLayout: () => dockIntoLibrary(),
  onCollapse: onLibraryCollapse,
  // Closing the library hands the keyboard back to the selected channel, and takes the
  // editor with it: an editor left floating over the desk with no library behind it is
  // a window with no way back to the list it came from.
  onClose: () => {
    if (voiceEditor.isOpen() && !voiceEditor.laneKey) dismissVoiceEditor();
    // Put the desk back the way it was found: a keyboard the library switched on goes
    // off with it. One the desk already had stays, and goes back to floating.
    if (!oskWasOn) showOsk(false);
    undockFromLibrary();
    refreshOsk();
  },
});

/**
 * Open the editor on a library preset — no lane, no song, no strip.
 *
 * The one thing this does that `editVoice` does not is leave every song alone: there is
 * no lane to point at the preset and nothing is written to any draft. Re-opening on the
 * preset already showing is refused for the same reason it is on a lane — `open` takes
 * the CURRENT sound as the baseline, so a second click would quietly make your unsaved
 * edits the thing Revert goes back to.
 */
function editLibraryVoice(id) {
  if (voiceEditor.isOpen() && !voiceEditor.laneKey
    && (voiceEditor.editing === id || voiceEditor.librarySource === id)) return voiceEditor.editing;
  const wasDocked = voiceEditor.isOpen() && voiceEditor.laneKey;
  // Marked BEFORE it is opened, not after it is placed. `open` builds the panel, and
  // the panel reads this class to decide whether its ✕ is a close or a fold — so
  // setting it on the way past would leave the first build wearing the wrong one.
  voiceEditEl.classList.toggle('vedocked', !!voiceLibrary.slots);
  // Built-in library sounds are reference material. Opening one from the library
  // creates one hidden editor draft; the original remains untouched and no user
  // preset is filed until Save as New.
  const source = VOICES[id];
  const updateLibrary = DEV_USER && !!source?.factory;
  if (!voiceEditor.open(id, {
    isNew: !!source?.factory && !updateLibrary,
    allowLibraryUpdate: updateLibrary,
  })) return false;
  // A repaint rather than a re-place when the panel was docked to a strip. `.voicepair`
  // is a wrapper `placeVoiceEditor` builds around the two of them, and only emptying
  // the rack takes it away again — so floating the panel out of it on its own leaves
  // that wrapper behind, drawing its border and its radius around a lone strip that has
  // nothing beside it any more. buildRack rebuilds the strips and then calls
  // placeVoiceEditor itself, which is what floats it.
  if (wasDocked) buildRack(); else placeVoiceEditor();
  return voiceEditor.editing;
}

/**
 * Park the editor and the keyboard into the library's own slots.
 *
 * The three of them are one job — find a sound, shape it, play it — and they were three
 * windows to open and arrange before any of that could start. So while the library is
 * up it holds the other two: the editor down its right side, the keyboard along the
 * bottom, both in boxes the library laid out for them.
 *
 * MOVED, not copied. `append` relocates a node it already holds, so these are the same
 * elements the desk uses everywhere else — the editor that also docks beside a channel
 * strip, the keyboard that also plays one. A second copy of either would be a second
 * implementation of something that already works, and they would drift.
 *
 * Runs after every library repaint, because a repaint empties the window and detaches
 * whatever was in it. Cheap: two `append` calls on nodes that are usually already
 * where they belong.
 */
function dockIntoLibrary() {
  const slots = voiceLibrary.slots;
  if (!slots) return;
  if (voiceEditor.isOpen() && !voiceEditor.laneKey && !voiceLibrary.isCollapsed('edit')) {
    // Docked, so it gives up the floating window's frame and position — see .vedocked.
    voiceEditEl.classList.add('vedocked');
    voiceEditEl.classList.remove('vefloat');
    slots.edit.append(voiceEditEl);
  }
  if (oskShown() && !voiceLibrary.isCollapsed('keys')) {
    oskEl.classList.add('docked');
    slots.keys.append(oskEl);
    fitDockedKeys();
  }
}

/**
 * How wide the docked keyboard's band actually is, inside its frame.
 *
 * Zero when it is not docked, which is the signal to use the floating board's fixed
 * two octaves: out on the desk it is a corner window with no band to fill.
 */
// The frame around the keys, per side — `#osk .oskkeys`'s own border. It is inside the
// slot, so it is part of what the keys have to fit within.
const OSK_CHASSIS = 5;

function oskRoom() {
  const slot = voiceLibrary.slots?.keys;
  if (!slot || !oskEl.classList.contains('docked')) return 0;
  return Math.max(0, slot.clientWidth - OSK_CHASSIS * 2);
}

/**
 * Redraw the docked keyboard when the band it sits in has changed size.
 *
 * The keys are SIZED, not scaled — see `oskKeyPlan`. So filling a different width is a
 * different number of keys rather than the same keys stretched, and the only thing this
 * has to do is notice the width moved and ask for a rebuild.
 *
 * Guarded on the width it last drew for, because the rebuild re-docks, and re-docking
 * calls this again. Without that it is a loop.
 */
let oskDrawnFor = -1;
function fitDockedKeys() {
  const room = oskRoom();
  if (!room || room === oskDrawnFor) return;
  buildOsk();
}

/**
 * How many keys to draw, and how wide each one is.
 *
 * ONE rule, in both homes: a key is the size the piano's key is, and the RANGE gives. The
 * space is whatever the space is — the band's, docked; the title bar's, floating — and
 * what changes with the key you play in is how far up the keyboard reaches, not how big
 * it is. Pick a pentatonic and you get the same keys, more of them, spanning further.
 *
 * It was the other way round, and both of the ways it was wrong are worth keeping:
 *
 * It first drew a fixed number — four octaves — and `zoom`ed them until they fitted, so
 * the keys changed size with the scale: a pentatonic has seventeen where a chromatic
 * board has twenty-nine, and the same band gave one 64px keys and the other 37px.
 *
 * Fixing the RANGE at three octaves and deriving the width fixed that within a scale and
 * moved it between them. Three octaves of a pentatonic is sixteen keys where a piano has
 * twenty-two, so the same band divided sixteen ways gave a key half again as wide — and a
 * key is a shape, the heights come off the width (see sizeOskKeys), so it came out half
 * again as TALL. The keyboard changed size when you chose a key, which is the same
 * complaint one layer along. Floating it did not even fill: a window is as wide as the
 * widest thing in it, which is the title bar, so the sparse board just left bare frame.
 *
 * So the reference is a CHROMATIC board — `OSK_KEYS`, three octaves of white keys — and
 * every scale gets that key at that size, however many of them the space holds. Docked
 * the piano's key is the band divided by twenty-two; floating it is KEY_W, which is the
 * number the window was built around. Both are the same sentence with a different width
 * in it.
 *
 * `DOCK_KEY_MIN` is a floor, not a target. Three octaves of a chromatic board in a
 * narrow band is a row of slivers, and past that point range is the cheaper thing to
 * give up — but only past it.
 *
 * The width is fractional on purpose. Rounding it down leaves up to a key's worth of
 * bare band on the right; keys are positioned at `i * width`, so every key's left edge
 * is the previous key's right edge exactly, and the only cost of a fraction is which
 * device pixel the shared edge lands on.
 */
const DOCK_KEY_MIN = 26;                 // narrowest a docked white key may get, px
// The floating window's inside width, as last measured — see fillFloatingKeys. Zero until
// the keyboard has been in the document once, which is the one draw that cannot know it.
let oskFloatRoom = 0;
function oskKeyPlan(perOctave) {
  const room = oskRoom();
  // ---- floating: the width is the title bar's, and the key is KEY_W.
  //
  // Rounding rather than flooring the fit is what closes the last few pixels: the count
  // that fits best, and then the exact width for it, which is never more than half a key
  // from KEY_W — a key you would have to measure to tell from the piano's.
  if (!room) {
    const fit = oskFloatRoom ? Math.round(oskFloatRoom / KEY_W) : 0;
    // Nothing measured yet, or a title bar shorter than the keys: then the keys are the
    // widest thing in the window and it is they that set its width.
    if (fit <= OSK_KEYS) return { count: OSK_KEYS, width: KEY_W, fills: false };
    return { count: fit, width: oskFloatRoom / fit, fills: false };
  }
  // ---- docked: the width is the band's, and the key is the band divided by a piano.
  //
  // Which makes the count a piano's count as well — the same arithmetic backwards — so it
  // is stated rather than derived. The range is what moves: twenty-two pentatonic keys is
  // four octaves and a bit where twenty-two white ones is three.
  const wide = room / OSK_KEYS;
  if (wide >= DOCK_KEY_MIN) return { count: OSK_KEYS, width: wide, fills: true };
  // Too narrow for a playable key at that count, so the count is what a playable key
  // leaves — but never fewer than an octave and a note, because a keyboard that cannot
  // reach its own octave is not one.
  const count = Math.max(perOctave + 1, Math.floor(room / DOCK_KEY_MIN));
  return { count, width: room / count, fills: true };
}

/**
 * A region of the library folded or unfolded.
 *
 * Folding the keyboard has to reach further than hiding it: while `Keyboard` is on it
 * owns the letter keys, and a keyboard you have put away that is still swallowing M, S
 * and R is a desk whose shortcuts have stopped working for no visible reason.
 */
function onLibraryCollapse(which, isCollapsed) {
  if (which === 'keys') {
    if (isCollapsed) {
      releaseOskSources('k:');
      clearOskHeldVisuals();
      oskCatch = false; oskHeld.clear(); oskEl.remove();
    }
    else if (oskShown()) buildOsk();
  }
  if (which === 'edit' && isCollapsed) voiceEditEl.remove();
  dockIntoLibrary();
}

/**
 * Give them back to the desk. The library is going away and they are not its.
 *
 * The keyboard survives — it plays channels too, and closing the library is not a
 * reason to stop playing — so it goes back to the body as a floating window at the
 * position it last had. The editor does not: opened from the library it is editing a
 * preset with no channel behind it, and a panel floating over the desk with no list to
 * go back to is a window with no way out.
 */
function undockFromLibrary() {
  const osk = oskEl;
  osk.classList.remove('docked');
  if (oskShown()) {
    document.body.append(osk);
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(OSK_POS_KEY) || 'null'); } catch { pos = null; }
    const r = osk.getBoundingClientRect();
    oskPlace(pos?.x ?? innerWidth - r.width - 24, pos?.y ?? innerHeight - r.height - 54);
    buildOsk();          // back to the selected channel's keys — see oskBench
  } else {
    document.body.append(osk);
  }
  voiceEditEl.classList.remove('vedocked');
}

// The keyboard comes with it. Playing a preset is most of what the library is FOR, and
// making you find a button in the main toolbar first is a step between opening a
// workspace and being able to use it. Whether it was on before is remembered, so
// closing the library puts the desk back the way it was rather than leaving a keyboard
// floating over it that you never asked for.
let oskWasOn = false;
function openPresetLibrary() {
  closeMenu();
  oskWasOn = oskShown();
  voiceLibrary.show(true);
  // The editor is part of the library workspace, even before a row has been picked.
  // A previously folded editor is a remembered desk preference, not a reason for a
  // fresh library opening to have no editor at all.
  if (voiceLibrary.isCollapsed('edit')) voiceLibrary.collapse('edit', false);
  if (!voiceLibrary.isCollapsed('edit')) {
    if (voiceEditor.isOpen() && voiceEditor.laneKey) dismissVoiceEditor();
    voiceEditEl.classList.add('vedocked');
    if (!voiceEditor.isOpen()) voiceEditor.blank();
    dockIntoLibrary();
  }
  if (!oskWasOn) showOsk(true);
}
$('voicelibbtn').onclick = openPresetLibrary;
$('presetbtn').onclick = openPresetLibrary;
$('addtrackbtn').onclick = (ev) => {
  ev.stopPropagation();
  closeMenu();
  addPercussionLane(ev.currentTarget);
};

/**
 * The voice library, as a panel.
 *
 * Sixty-five presets in a context menu is a scrolling list you cannot read, so this
 * is laid out the way the effect catalogue is: a column per category, everything
 * visible at once. Categories are about the SOUND, not the lane — a bass preset on
 * the lead is a lead, and the only entries a lane hides are the few engine ones that
 * are genuinely bass-only code paths.
 *
 * `Engine default` sits on the head row beside the search rather than in the columns:
 * it is a real choice — putting a lane back writes nothing at all to the mix file —
 * but it is the way out of the library, not an entry in it, and as a category of one
 * it cost a whole column to say one word.
 */
function openVoicePicker(x, y, laneKey) {
  const seam = seamFor(laneKey);
  const chosen = mixFor(trackId).voice?.[seam.voiceKey];
  // A preset the library would otherwise leave off the menu is still offered while
  // this lane is the thing playing it — a picker cannot hide the row it is meant to
  // be highlighting. Today that is only the song quotations nothing in the game plays
  // any more, which were pickable before they were filtered; see offeredVoices.
  const offer = { keep: chosen || null };
  const pending = pendingAddTrack?.key === laneKey;
  // A duplicate layer has no engine default to go back to. An independent editor lane
  // is different: it is empty, not copied, and its neutral engine fallback is still a
  // valid starting point while the user chooses a preset.
  const independent = isIndependentLane(laneKey);
  const layer = isLayer(laneKey) && !independent;
  const el = $('voicepicker');
  el.textContent = '';

  const pick = (id) => {
    // A freshly added lane is only a proposal until its first sound is chosen. Commit
    // before closing so closeMenu does not treat this successful choice as a cancel.
    if (pendingAddTrack?.key === laneKey) {
      // If the user selected a pitched voice, re-key the pending track as a melodic
      // independent lane instead of defaulting to a drum track. The voice the user
      // picked is what the track IS, not whatever lane happened to be selected when
      // they clicked +.
      const voice = VOICES[id];
      if (voice && !isKitVoice(voice)) {
        const newFrom = 'lead';
        const newKey = nextLayerKey(newFrom);
        pendingAddTrack.key = newKey;
        pendingAddTrack.from = newFrom;
        commitPendingAddTrack(newKey, id);
      } else {
        commitPendingAddTrack(laneKey, id);
      }
      closeMenu();
      return;
    }
    closeMenu();
    setLaneVoice(laneKey, id);
  };
  const entry = (id, label, kind, title) => {
    const btn = document.createElement('button');
    btn.className = (id === chosen || (!id && !chosen)) ? 'on' : '';
    const n = document.createElement('span');
    n.textContent = label;
    const k = document.createElement('span');
    k.className = 'vkind';
    k.textContent = kind;
    btn.title = title;
    btn.append(n, k);
    btn.onclick = () => pick(id);
    return btn;
  };

  // The search box. A hundred presets in sixteen columns is quick to scan when you
  // know roughly where you are going and slow when you only know the word — so
  // typing filters the lot, across labels AND the descriptions, which is where words
  // like "808", "gated" or "detune" actually live.
  const search = document.createElement('input');
  search.className = 'voicesearch';
  search.type = 'search';
  search.placeholder = 'Search presets…';
  search.setAttribute('aria-label', 'Search presets');

  // The head row: what you are choosing for, how to find it, and the way back.
  //
  // `Engine default` used to head the columns as a category of its own, which spent a
  // 150px column on one word and read as a column with its entries missing. It is not
  // an entry in the library — it is the way OUT of it, the same way the search box is
  // not a preset — so it belongs in the chrome beside the search, and the panel is a
  // column narrower for it. It stays a real, clickable choice with the same `on` state
  // it had in the list.
  const head = document.createElement('div');
  head.className = 'voicehead';
  const who = document.createElement('span');
  who.className = 'voicewho';
  who.textContent = `${targetLabel(laneKey)} voice`;

  // Drums or not — the one split the catalogue's categories do not make, and
  // the only one that is about the LANE. A lead strip has no use for seven columns of
  // kit before it reaches the Lead, and a kick strip has none for nine of pitched
  // synths after it, so the panel opens on the kind the lane plays. It is a view, not
  // a rule: `all` is one click away and the library is the same library — a snare
  // through a bass lane is a legitimate noise and this does not stop it.
  const KINDS = [
    { id: 'all', label: 'All', keep: () => true },
    { id: 'pitched', label: 'Pitched', keep: (v) => !isKitVoice(v) },
    { id: 'drums', label: 'Drums', keep: (v) => isKitVoice(v) },
  ];
  // The plus button is deliberately neutral: it is creating a new track, not adding
  // another Tom. Existing lanes still open on their useful lane-specific family.
  let kind = pending ? 'all'
    : PERCUSSION_LANES.includes(baseLane(laneKey)) ? 'drums' : 'pitched';
  const keepOf = (id) => KINDS.find((k) => k.id === id).keep;
  // A lane whose own kind is empty opens on everything rather than on nothing. Nothing
  // in the catalogue does that today; a preset library one edit from now might.
  if (!offeredVoices(laneKey, offer).some(keepOf(kind))) kind = 'all';
  const chips = document.createElement('div');
  chips.className = 'voicekinds';
  const chipFor = (k) => {
    const c = document.createElement('button');
    c.className = 'voicekind' + (k.id === kind ? ' on' : '');
    c.textContent = k.label;
    c.title = k.id === 'all' ? 'Every preset in the library'
      : k.id === 'drums' ? 'kicks, snares, claps, hats and percussion'
        : 'Everything that plays a note';
    c.onclick = () => {
      kind = k.id;
      for (const other of chips.children) other.classList.toggle('on', other === c);
      draw(search.value);
    };
    return c;
  };
  for (const k of KINDS) chips.append(chipFor(k));
  head.append(who, chips, search);
  if (layer) {
    // A layer has no engine default to go back to — see the strip preset name. The space says what
    // the lane IS instead of offering a choice that silences it.
    const why = document.createElement('span');
    why.className = 'voicewhy';
    why.textContent = `A duplicate of ${targetLabel(baseLane(laneKey))} — it plays that`
      + ' part with whatever you choose here';
    head.append(why);
  } else if (pending) {
    const why = document.createElement('span');
    why.className = 'voicewhy';
    why.textContent = 'Choose a preset for this new track';
    head.append(why);
  } else {
    // The name goes in the `kind` slot rather than replacing the label: the button has
    // to keep saying what it DOES — put the lane back and write nothing — while saying
    // what that sounds like. A lane whose bank is tuned past every preset has no name
    // to show and reads `built in`, as it always did.
    const named = independent ? VOICES[DEFAULT_ADDED_PERCUSSION_VOICE]
      : defaultVoiceOf(track?.bank, laneKey);
    const def = entry(null, 'Engine default', named ? named.label : 'Built in',
      `What ${targetLabel(laneKey)} plays with nothing set — the hand-written voice the`
      + ' songs were composed on. Choosing it writes nothing to the mix file.'
      + (named ? `\n\nOn this song that is ${named.label} — ${named.note}` : ''));
    def.classList.add('voicedefault');
    head.append(def);
  }

  // Keep the picker’s way out in the same place and style as the other desk
  // overlays. It is deliberately separate from preset rows so a close never
  // changes the current voice.
  const close = document.createElement('button');
  close.className = 'voiceclose popclose';
  close.type = 'button';
  close.textContent = '✕';
  close.title = 'Close preset selector';
  close.setAttribute('aria-label', 'Close preset selector');
  close.onclick = (ev) => { ev.stopPropagation(); closeMenu(); };
  head.append(close);

  // Nothing about EDITING a preset lives here. This panel answers "which sound",
  // which is a different question from "what should this sound be like" — and the way
  // into the second is on the strip header and the two items on the right-click menu.

  const results = document.createElement('div');
  results.className = 'voiceresults';

  const draw = (query) => {
    results.textContent = '';
    const q = query.trim().toLowerCase();
    const hit = (v) => !q || `${v.label} ${v.category} ${v.note} ${v.kind}`.toLowerCase().includes(q);
    const keep = keepOf(kind);

    let shown = 0;
    for (const [category, list] of offeredByCategory(laneKey, offer)) {
      const matches = list.filter((v) => keep(v) && hit(v));
      if (!matches.length) continue;
      shown += matches.length;
      const g = document.createElement('div');
      g.className = 'fxgroup';
      const h5 = document.createElement('h5');
      h5.textContent = category;
      g.append(h5);
      for (const v of matches) {
        g.append(entry(v.id, v.label, v.kind === 'engine' ? 'Built in' : '',
          `${v.label} — ${v.note}`
          + (v.lanes ? `\n\nOnly on: ${v.lanes.map((k) => cap(VOICE_LANES[k].label)).join(', ')}.` : '')));
      }
      results.append(g);
    }
    // A search that finds nothing has to say so. An empty panel reads as broken.
    //
    // And when the filter is what is hiding the answer, the message says so and is the
    // button that fixes it: a search for "808" on a lead strip finding nothing, while
    // the drums it is sitting on hold six of them, is the filter being unhelpful in
    // the one way a filter can be.
    if (q && !shown) {
      const none = document.createElement('div');
      none.className = 'fxgroup voicesearch-none';
      const elsewhere = kind === 'all' ? 0 : offeredVoices(laneKey, offer).filter(hit).length;
      none.textContent = `Nothing matches “${query.trim()}” in ${kind}`;
      if (elsewhere) {
        const more = document.createElement('button');
        more.className = 'voicesearch-more';
        more.textContent = `${elsewhere} in the rest of the library`;
        more.onclick = () => {
          kind = 'all';
          for (const c of chips.children) c.classList.toggle('on', c.textContent === 'all');
          draw(search.value);
        };
        none.append(more);
      } else {
        none.textContent = `Nothing matches “${query.trim()}”`;
      }
      results.append(none);
    }
  };

  search.addEventListener('input', () => draw(search.value));
  // Escape clears the filter first and closes the panel only when it is already
  // empty — one key, and it never throws away a search you were still reading.
  search.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    ev.stopPropagation();
    if (search.value) { search.value = ''; draw(''); } else closeMenu();
  });
  el.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || ev.target === search) return;
    ev.preventDefault();
    ev.stopPropagation();
    closeMenu();
  });

  draw('');
  el.append(head, results);

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.classList.add('show');
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 6))}px`;
  el.style.top = `${Math.max(4, Math.min(y, innerHeight - r.height - 6))}px`;
  requestAnimationFrame(() => {
    if (el.classList.contains('show')) search.focus({ preventScroll: true });
  });
}

function channelStrip(lane, mix, slotRows, number) {
  const key = lane.key;
  const s = laneSettings(mix.lanes[key]);
  const seam = seamFor(key);
  const preset = presetForLane(key);
  const { el, head, body, foot } = stripShell(key, {
    label: preset?.label || lane.label,
    sublabel: preset?.category || null,
    tag: lane.group, colour: laneColour(key), tint: laneTint(key), number,
  });
  // The head is the strip's handle, so double-clicking it plays the channel: from
  // the bar it comes in on, which for anything that enters late is the only bar you
  // wanted to hear. See playFromLaneStart.
  head.title = 'Click to show this strip’s devices below'
    + ' — double-click to play from where this channel comes in';
  head.addEventListener('dblclick', (ev) => {
    if (!ev.target.closest('.strippreset')) playFromLaneStart(key);
  });

  const presetName = head.querySelector('h3');
  if (seam && presetName) {
    presetName.classList.add('strippreset');
    presetName.setAttribute('role', 'button');
    presetName.tabIndex = 0;
    presetName.title = preset
      ? `Change ${preset.label} on ${lane.label}`
      : `Choose a preset for ${lane.label}`;
    const choosePreset = (ev) => {
      ev.stopPropagation();
      selectLane(key);
      openVoicePicker(ev.clientX, ev.clientY, key);
    };
    presetName.addEventListener('click', choosePreset);
    presetName.addEventListener('dblclick', (ev) => ev.stopPropagation());
    presetName.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      const r = presetName.getBoundingClientRect();
      choosePreset({ clientX: r.left, clientY: r.bottom, stopPropagation() {} });
    });
  }

  // Into the preset editor from the header, on hover. Choosing a different preset is
  // the name itself; this small mark remains only for editing the selected preset.
  if (preset && preset.kind !== 'engine') {
    const pen = document.createElement('button');
    pen.className = 'stripedit';
    pen.append(foldIcon('right'));   // same fold mark as the docked editor
    pen.title = `Edit ${preset.label} — its parameters, beside this strip`;
    pen.onclick = (ev) => { ev.stopPropagation(); editVoice(key); };
    head.append(pen);
  }

  const setEq = (band) => (x) => {
    editMix((m) => {
      const L = laneOf(m, key);
      L.eq = { ...LANE_DEFAULTS.eq, ...(L.eq || {}), [band]: x };
    }, `eq:${key}:${band}`);
    Audio.mixer?.lane(key)?.setEQ({ [band]: x });
  };
  for (const band of ['high', 'mid', 'low']) {
    body.append(eqRow(band, s.eq[band], setEq(band)));
  }

  // One send per aux, generated from AUXES — adding a fifth send upstream adds a
  // row here with no further work. Full words: a 132px strip has room for them,
  // and DLY/RVB made you translate.
  const SHORT = { delay: 'DELAY SEND', reverb: 'REVERB SEND' };
  for (const aux of AUXES) {
    // Every send starts shut and reads back what the mix actually stores — no family
    // default behind it, so a channel that echoes says so on its own face.
    const dflt = 0;
    // Both sends share the same displayed dB ceiling so the two sliders look
    // consistent. Reverb cheats: its +6 dB maps to gain 3.0 instead of 2.0
    // (a 1.5× hotter scale), so the knob still reaches the higher ceiling.
    const SEND_DB_MAX = 6;
    const sendGainMax = aux.id === 'reverb' ? 3 : 2;
    const gainScale = sendGainMax / dbToGain(SEND_DB_MAX);
    const rawVal = mix.lanes[key]?.send?.[aux.id] ?? dflt;
    // Same taper as the channel faders (FADER_SCALE). The slider stores a
    // 0–1 POSITION; posToDb/dbToPos give it the same piecewise curve every
    // fader on the desk uses. Unity at 75%, -10 dB at 50%, boost at the top.
    const toDisplayDb = (g) => {
      if (g <= 0.001) return FADER_DB_MIN;
      return clamp(gainToDb(g / gainScale), FADER_DB_MIN, SEND_DB_MAX);
    };
    const fromDisplayDb = (db) => db <= FADER_DB_MIN ? 0 : dbToGain(db) * gainScale;
    const fmtSend = (db) => {
      if (db <= FADER_DB_MIN) return 'OFF';
      return (db > 0 ? '+' : '') + db.toFixed(1);
    };
    const parseSend = (s) => {
      const cleaned = String(s).replace(/dB|db|Db/gi, '').trim();
      if (/^off$/i.test(cleaned)) return FADER_DB_MIN;
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? clamp(n, FADER_DB_MIN, SEND_DB_MAX) : null;
    };
    const row = slider({
      min: 0, max: 1, step: 0.001,
      value: dbToPos(toDisplayDb(rawVal)),
      reset: dbToPos(FADER_DB_MIN),
      fmt: (pos) => fmtSend(posToDb(pos)),
      display: {
        format: (pos) => fmtSend(posToDb(pos)),
        parse: (s) => {
          const db = parseSend(s);
          return db != null ? dbToPos(db) : null;
        },
      },
      onInput: (pos) => {
        const db = posToDb(pos);
        const lin = fromDisplayDb(db);
        editMix((m) => {
          const L = laneOf(m, key);
          L.send = { ...LANE_DEFAULTS.send, ...(L.send || {}), [aux.id]: lin };
        }, `${aux.id}:${key}`);
        Audio.mixer?.lane(key)?.setSend({ [aux.id]: lin });
      },
    });
    row.label.textContent = SHORT[aux.id] || aux.id.toUpperCase();
    row.wrap.classList.add('sendrow');       // what the Sends switch in the header hides
    // Nothing to qualify any more. Every channel taps the whole lane into every send
    // and no bank key scales it on the way, so this number IS the amount: the same
    // reading sends the same amount of kick as it does of lead, in every bar of every
    // song. It used to be worth whatever the playing section's `echoLevel` said, which
    // is why the tooltip had a story to tell and the control could not be trusted.
    row.wrap.title = `${aux.name} send`;
    body.append(row.wrap);
  }

  // Pan sits under the fader, above the buttons — see panRow.
  const pan = panKnob({
    value: s.pan,
    onInput: (x) => {
      editMix((m) => { laneOf(m, key).pan = x; }, `pan:${key}`);
      Audio.mixer?.lane(key)?.setPan(x);
    },
  });
  // Mute and solo close the strip, under the pot — the same small pair the
  // arrangement rows carry, so they read the same in both places.
  const btns = btnRow(...muteSoloPair(key, lane.label));

  // Declared before the fader so both callbacks can name it, and assigned after: the
  // fader is what `except` has to point at, and it does not exist yet.
  let fader = null;
  const applyGain = (x) => {
    editMix((m) => { laneOf(m, key).gain = x; }, `gain:${key}`);
    Audio.mixer?.lane(key)?.setGain(x);
    syncLaneGain(key, { except: fader });
  };
  const fb = faderBlock({
    value: s.gain,
    title: `${lane.label} level`,
    onInput: applyGain,
    // An untagged edit, so a double-click back to 0 is its own undo step rather
    // than being coalesced into the drag that came before it. Nothing is excepted:
    // a reset has already put the fader on 0 itself, and the readout with it.
    onReset: (x) => {
      editMix((m) => { laneOf(m, key).gain = x; });
      Audio.mixer?.lane(key)?.setGain(x);
      syncLaneGain(key);
    },
  });
  fader = fb.fader;

  foot.append(insertSlots(key, lane.label, slotRows), faderRow(fb.col), panRow(pan.el), btns);
  stripMenu(el, key, 'channel');
  meters.push({ key, chans: fb.chans, meter: fb.meter });
  return el;
}

/**
 * A send return. Its own parameters — the delay's time and feedback, the reverb's
 * decay — are the pinned card in the device panel below, not rows on the strip: a
 * 132px column cannot hold TIME/FBK/DAMP legibly, and the attempt pushed the
 * return EQ off the strip entirely.
 */
function sendStrip(def, mix, slotRows) {
  const key = `__aux:${def.id}`;
  const cur = fxOf(mix)[def.id];
  const hue = def.type === 'delay' ? 196 : 268;
  const { el, body, foot } = stripShell(key, {
    label: def.name.toUpperCase(), tag: 'send', cls: 'send',
    colour: hueColour(hue), tint: hueTint(hue),
  });

  // Values only, in the order the card lists them — a 132px strip has room for the
  // numbers or for their names, and the numbers are what you are checking.
  body.append(deviceSummary(key, def.type === 'delay'
    ? `${fmtDelay(syncSeconds(cur.division, deskTempo()))} · ${cur.feedback.toFixed(2)}`
      + ` · ${cur.tone >= 1000 ? `${(cur.tone / 1000).toFixed(1)}k` : cur.tone}`
    : `${cur.decay.toFixed(1)}s · pre ${(cur.preDelay * 1000).toFixed(0)}ms`));

  // The return EQ, in the same three rows and the same place a channel keeps its
  // own. On a reverb this is the damping control in everything but name.
  for (const band of ['high', 'mid', 'low']) {
    body.append(eqRow(band, cur.eq?.[band] ?? 0, (x) => {
      editFx(def.id, { eq: { ...(fxOf(mixFor(trackId))[def.id].eq || {}), [band]: x } },
        `${def.id}:eq:${band}`);
    }));
  }

  // The return level IS this strip's fader, which is what it always was
  // semantically — it just used to be a slider called SEND halfway up the panel.
  const lvlDb = 20 * Math.log10(Math.max(0.001, cur.level ?? 1));
  const fb = faderBlock({
    value: Math.round(lvlDb * 10) / 10,
    // +6, the same ceiling every fader on the desk has. A return that went to +12
    // because the echo happens to be quiet is a fader that means something different
    // from the one beside it, and a desk you have to remember exceptions about is
    // worse than an echo you have to push. The loud end is still reachable: the send
    // itself goes to 2, which with this at +6 puts the return within a dB of the
    // channel it came from.
    title: def.legacy
      ? `${def.name} return level — a scale on the echo the song asks for`
        + ' (its sections automate that between 0 and about 0.35, so this lifts the'
        + ' whole ramp and keeps its shape)'
      : `${def.name} return level`,
    onInput: (x) => editFx(def.id, { level: 10 ** (x / 20) }, `${def.id}:level`),
  });

  // A return pans like a channel: the same pot in the same place. Mute takes the
  // return out of the mix; solo leaves the channels feeding it and mutes everything
  // else, so you hear the effect on its own.
  const pan = panKnob({
    value: cur.pan ?? 0,
    onInput: (x) => editFx(def.id, { pan: x }, `${def.id}:pan`),
  });
  const mute = document.createElement('button');
  mute.textContent = 'M';
  mute.className = 'mutebtn warn' + (cur.mute ? ' on' : '');
  mute.title = `Mute the ${def.name} return`;
  mute.onclick = (ev) => {
    ev.stopPropagation();
    const on = !mute.classList.contains('on');
    mute.classList.toggle('on', on);
    editFx(def.id, { mute: on }, null);
  };
  const solo = document.createElement('button');
  solo.textContent = 'S';
  solo.className = 'solobtn' + (soloedAux.has(def.id) ? ' on' : '');
  solo.title = `Solo the ${def.name} return — monitoring only, never saved`;
  solo.onclick = (ev) => {
    ev.stopPropagation();
    const on = !solo.classList.contains('on');
    solo.classList.toggle('on', on);
    if (on) soloedAux.add(def.id); else soloedAux.delete(def.id);
    Audio.mixer?.setAuxSolo(def.id, on);
    updateSoloLight();
  };
  foot.append(insertSlots(key, def.name, slotRows), faderRow(fb.col), panRow(pan.el),
    btnRow(mute, solo));
  stripMenu(el, key, 'send');
  meters.push({ key, chans: fb.chans, meter: fb.meter });
  return el;
}

/**
 * The master bus. No EQ rows: there is no EQ node on the master path — a parametric
 * EQ in the insert slots is how you do it, and it is a better EQ than three fixed
 * bands anyway. The limiter is the last slot in the insert block, where the rest of
 * the chain is: it is the LIMITER button under the fader, on the line the channels
 * keep their M and S on. There used to be a summary line up here saying "limiter off"
 * in words, and a checkbox on a card called "Master" in the panel below.
 */
function masterStrip(mix, slotRows) {
  const { el, foot } = stripShell('__master', { label: 'MASTER', tag: 'bus', cls: 'master' });
  const setMaster = (x) => setMasterControlValue(x, 'master');
  const fb = faderBlock({
    // The same fader as every channel, which it did not used to be: this one ran
    // −24…+12, so the master was the one strip that could be pushed somewhere none
    // of the channels feeding it could follow, and the one whose knee meant a
    // different gain from its neighbours'. The narrow range was buying fine control
    // near unity; the taper gives that to every fader on the desk — see FADER_SCALE.
    value: mix.master || 0,
    // The only stereo meter on the desk: the master is where a mix leaning to one side
    // shows up, and the one strip whose meter you read as a pair rather than a level.
    stereo: true,
    title: 'Master trim, on top of the bank’s own musicTrim',
    onInput: setMaster,
    onReset: (x) => setMasterControlValue(x),
  });
  masterStripControl = fb;
  syncMasterControls(mix.master || 0);
  // The master's own balance, in the pot every other strip keeps its pan in. It is
  // the last thing on the bus before the limiter, so it moves the whole mix rather
  // than anything in it — which is what a master pan is for.
  const pan = panKnob({
    value: mix.masterPan || 0,
    onInput: (x) => {
      editMix((m) => { m.masterPan = x; }, 'masterPan');
      Audio.mixer?.setMasterPan(x);
    },
  });
  // Where a channel keeps M and S, the master keeps its limiter — under the fader and
  // out of the insert block, which is the honest place for it. It is not in the chain
  // and cannot be moved within it: it is the last thing before the speakers, always.
  foot.append(insertSlots('__master', 'master', slotRows), faderRow(fb.col), panRow(pan.el),
    btnRow(limiterButton(!!mix.limiter)));
  stripMenu(el, '__master', 'master');
  meters.push({ key: '__master', chans: fb.chans, meter: fb.meter });
  return el;
}

// ---- the desk's vertical budget, in one place --------------------------------
// Every minimum and every automatic target the layout uses. They used to be six
// numbers spread across five functions — a 48 in the fader, a 140 in the --striph
// floor, a 96 in the effects panel, an 8 called a floor in the arrangement, and two
// ceiling expressions that disagreed with each other about what the effects panel
// was allowed to take. Anything that wants to know how small a region may be asks
// here, and there is one answer.

// The fader is the desk's shock absorber. In a short window it gives up height so
// the EQ and send rows above it stay on screen — they are read constantly while
// balancing, where the fader is a grip you can still hit, with an exact dB readout
// under it either way. Given room it takes all of it — there is no cap, so the
// strips always fill the rack exactly and a tall window ends up with long faders
// rather than a band of empty desk under short ones.
//
// A comfortable height rather than a floor: this is the fader the rack ASKS for when
// it is deciding how much of the window to want (see rackWant). What it will actually
// settle for is FADER_FLOOR below.
const FADER_MIN = 48;
// And how far it will compress to keep one more BLOCK on screen. Two numbers rather
// than one, because with only the comfortable minimum to bargain with the ladder shed
// far too eagerly: five pixels short of fitting the EQ, it would drop the EQ and the
// sends together and then hand the ninety pixels that freed straight back to the
// fader — a strip that was nearly all fader, with the rows you were reaching for
// gone. A fader is still a fader at this height; three EQ bands you cannot see are
// not an EQ.
const FADER_FLOOR = 34;
// The arrangement's automatic answer. Eight lanes is enough to read a song's shape
// and the rest is a scroll. It is a TARGET, not a floor: the floor is one lane, and
// calling the eight a floor is most of why this used to be hard to reason about.
// Read from the shell rather than written here twice: the CSS cap on #arrange is the
// same eight, and the two being separate numbers is a bug waiting for the day one of
// them is changed.
const ARR_AUTO_LANES = () => {
  const n = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--arrmax-lanes'));
  return Number.isFinite(n) && n >= 1 ? n : 8;
};
// The effects panel below its own header: enough for one card's controls. Below it
// the panel is a title bar with a sliver under it, which tells you nothing and
// still costs the height.
const DEV_MIN_EXTRA = 48;
// And the least the same panel may be while it is showing the piano roll instead:
// about eight keys under the scope, which is a hand's worth of range. A roll is a
// much taller thing than a rack of cards, and one floor cannot serve both.
const DEV_MIN_ROLL = 8 * 29;
/**
 * The rack's own vertical chrome: its padding, plus whatever the horizontal
 * scrollbar takes at the bottom. Measured, because `scrollbar-gutter: stable`
 * reserves that space whether or not the bar is showing — assuming 20px left six
 * pixels unaccounted for, which was enough to put a vertical scrollbar down the rack
 * and cut the padding under the strips.
 */
function rackPad() {
  const rack = $('rack');
  if (!rack) return 20;
  return px(rack, 'paddingTop') + px(rack, 'paddingBottom')
    + (rack.offsetHeight - rack.clientHeight);
}

const h = (el) => (el ? el.getBoundingClientRect().height : 0);
const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]) || 0;

/**
 * Every pixel #desk has to divide between its four regions:
 * the window, less the things that live outside the desk and are never
 * negotiated with.
 *
 * Note what is NOT in here: the effects panel is allocated by planDesk, not treated as
 * page chrome. Its natural or dragged height is subtracted there alongside the other
 * desk regions, while every border hit area remains layout-free.
 */
const deskPool = () => innerHeight
  - h(document.querySelector('header')) - h($('timeline'))
  - h(document.querySelector('footer')) - h($('err'));

// The window height the remembered panel sizes were dragged on. The sizes themselves
// are absolute pixels — coming back to the desk you left is the whole point of keeping
// them — but a height set on a tall display would swallow a laptop screen whole. A
// shorter window scales them all by the ratio the desk itself shrank by, so the panels
// keep their proportions, and the STORED numbers are left alone: plug the big screen
// back in and you get the desk you set up on it, not the squeezed version.
const DESK_VH_KEY = 'mash-mixer-deskvh';
const storedDeskVh = Number(localStorage.getItem(DESK_VH_KEY));
const deskScale = Number.isFinite(storedDeskVh) && storedDeskVh > 200
  ? Math.min(1, innerHeight / storedDeskVh)
  : 1;
// Clamped on the way in: a stale or nonsense height (drag hard upwards and it goes
// negative) would otherwise pin a panel shut on every load with no way to tell why.
const restoredDeskH = (value, floor) => (Number.isFinite(value) && value > floor
  ? Math.round(value * deskScale)
  : null);

// A height the user dragged the Notes border to, which beats the automatic fit until
// they double-click it away. Kept across reloads: it is a preference about this
// screen, not about the mix.
const ARR_KEY = 'mash-mixer-arrh';
const storedArrH = Number(localStorage.getItem(ARR_KEY));
let userArrH = restoredDeskH(storedArrH, 40);
// A one-lane height can be useful while actively dragging, but restoring one on the
// next load looks exactly like the arrangement has lost its other instruments. Keep
// that temporary squeeze for the current session; stale one-lane preferences fall
// back to automatic fitting once the rows have been built.
let restoredArrH = userArrH != null;

// A height the user dragged the Notes border to. Like the arrangement height, this
// is a preference about the desk rather than a mix edit, so it lives outside the song
// draft and returns on the next visit. Double-clicking the border clears it and lets
// the measured roll height take over again. DEV_KEY remains the persisted key for
// compatibility with existing mixer sessions.
const DEV_KEY = 'mash-mixer-devh';
const storedDevH = Number(localStorage.getItem(DEV_KEY));
let userDevH = restoredDeskH(storedDevH, 40);
const clampDeviceH = (value, max = notesRoom()) => clamp(value, MIN.notes(), max);

// Effects has its own remembered height. This is the panel's content room below
// its header, kept separate from DEV_KEY, which belongs to Notes.
const FX_KEY = 'mash-mixer-fxh';
const storedFxH = Number(localStorage.getItem(FX_KEY));
let userFxH = restoredDeskH(storedFxH, DEV_MIN_EXTRA);

/**
 * Write the three dragged panel heights and the window they belong to.
 *
 * All three together, never one on its own: the window stamp is what the next load
 * scales them by, so a single height written on a laptop would leave the other two
 * claiming to have been chosen there too, at their full desktop size.
 *
 * Called when a gesture ENDS, not while it runs — the drag handlers move these values
 * every frame, and localStorage is not a place to put a frame loop.
 */
function rememberDeskHeights() {
  const set = (key, value) => (value == null
    ? localStorage.removeItem(key)
    : localStorage.setItem(key, String(Math.round(value))));
  set(ARR_KEY, userArrH);
  set(DEV_KEY, userDevH);
  set(FX_KEY, userFxH);
  localStorage.setItem(DESK_VH_KEY, String(Math.round(innerHeight)));
}

// The arrangement's height is its header, its landing, the panel rule, and a whole
// number of row stacks. Every term is MEASURED off the live elements, so changing
// --arrrow, --arrgap, --arrgrid-pad or the header's control size in the shell moves
// the snap with it and nothing here needs touching.
//
// The gap belongs to the stack: leaving it out makes the last visible row spill below
// a snapped height. There is no trailing gap, so N rows carry N-1 of them.
const laneRowHeight = () => h(document.querySelector('.arrrow')) || 26;
const laneRowGap = () => px($('arrgrid'), 'rowGap');
const laneStackHeight = (count) => count * laneRowHeight()
  + Math.max(0, count - 1) * laneRowGap();
// The landing under the last visible row. It is #arrange's padding, NOT #arrgrid's:
// inside the scroller it is scroll content, which is only under the last row when you
// happen to be scrolled to the bottom — every other scroll position spent it on the
// gap and the top few pixels of the next lane, so a panel that had snapped correctly
// still showed a sliver of a row it had not made room for.
const laneLanding = () => px($('arrange'), 'paddingBottom');
const arrangeChrome = () => h($('arrhead')) + laneLanding()
  + px($('arrange'), 'borderBottomWidth');
const laneCount = () => document.querySelectorAll('.arrrow').length || 1;
/**
 * How many whole lanes fit in `px` of arrangement. Below one is a fold, not a row.
 *
 * The epsilon is load-bearing. Heights come from getBoundingClientRect and are
 * fractional, so a request built as "the header plus an eight-row stack" divides back
 * out to 7.99999… and Math.floor hands back seven — the automatic fit was one row short
 * of what it had just asked for, on every window tall enough to grant it.
 */
const lanesIn = (px, round = Math.round) => {
  const row = laneRowHeight();
  const gap = laneRowGap();
  const body = px - arrangeChrome();
  return round((body + gap) / (row + gap) + 1e-6);
};
/**
 * The nearest height that shows whole lanes, at least one. Rounding to the NEAREST is
 * right under the hand on the border — half a lane either way should settle on the
 * one you meant. It is wrong against a ceiling: rounding up there hands the rack back
 * a few pixels it was promised, and a strip four pixels short scrolls its last send
 * row out of sight. So the automatic fit passes Math.floor.
 */
const arrangeSnap = (px, round = Math.round) => arrangeChrome()
  + laneStackHeight(clamp(lanesIn(px, round), 1, laneCount()));

/**
 * And the most it can use: every lane at once. The scroller's content is now exactly
 * the row stacks — the landing lives outside it — so its scrollHeight adds straight
 * onto the chrome.
 */
function arrangementWants() {
  const arrange = $('arrange');
  if (arrange.classList.contains('collapsed')) return h(arrange);
  return arrangeChrome() + $('arrgrid').scrollHeight;
}

/**
 * What the strip body needs when nothing is squeezing it. Measured by taking the
 * body out of the flex layout for one frame rather than by adding up rows: the rows
 * carry margins as well as the container's gap and padding, and summing the pieces
 * by hand quietly lost the margins — which cost the last send row its slider.
 */
function naturalHeight(body) {
  const was = body.style.flex;
  body.style.flex = '0 0 auto';
  const natural = body.scrollHeight;
  body.style.flex = was;
  return natural;
}

/**
 * Everything in a strip whose height does not move with the fader — the pan, the
 * buttons and the readout are all fixed, so the fader is the only variable left.
 *
 * Measured across EVERY strip, not off the first one: the insert buttons live in the
 * foot, so a channel with five effects on it stands a hundred pixels taller in the
 * fixed parts than a channel with none. Sizing the rack from the first strip gave the
 * busy ones a body too short for their own rows, and the body scrolls without a
 * scrollbar — so the EQ and sends simply vanished off the bottom.
 *
 * Rounded up: a strip half a pixel short scrolls the last send row's slider out of
 * view, which is the whole thing this is here to prevent.
 */
/**
 * The rack's shrink ladder, in the order the blocks go. Inserts first — they are the
 * one block you set once and then leave alone. Sends next. EQ last, because it is the
 * one you are most likely to be reaching for while the window is small. Below the
 * bottom of this list is the strip you balance on: name, type, fader, dB, pan and
 * mute/solo, with nothing left to take.
 *
 * The same three blocks the header switches hide, hidden the same way — see the
 * #rackwrap.shed-* rules. A DIFFERENT set of classes from the switches, so growing
 * the window back restores exactly what is ticked and nothing more.
 */
const SHED_ORDER = ['effects', 'sends', 'eq'];
// One id space with the switches, and the class derived from theirs rather than
// spelled again: the insert block is `effects` to a switch and `fx` to a stylesheet,
// and writing that mapping down twice is how the two sets drift apart.
const shedClass = (id) => STRIP_PARTS.find((p) => p.id === id).cls.replace('no-', 'shed-');

/**
 * Measure the rack `n` blocks into the ladder, rather than wherever it happens to be
 * standing. Every number the fit is steered by has to be independent of the rung it
 * is currently on, or the fit stops being a function of the window and starts being a
 * function of its own last answer — which is a latch, and a short window once meant a
 * short window forever.
 *
 * `measuring` also lifts --striph off .strip and .voicepair, which are given it
 * explicitly and would otherwise answer the question with the previous answer. The
 * fader is pinned for the same reason: left live, a strip measures taller on a tall
 * window than on a short one and the rack's floor ratchets up as the window grows.
 */
function atShed(n, fn) {
  const wrap = $('rackwrap');
  const had = SHED_ORDER.map(shedClass).filter((c) => wrap.classList.contains(c));
  wrap.classList.remove(...SHED_ORDER.map(shedClass));
  wrap.classList.add(...SHED_ORDER.slice(0, n).map(shedClass), 'measuring');
  wrap.style.setProperty('--faderh', `${FADER_FLOOR}px`);
  try {
    return fn();
  } finally {
    wrap.style.removeProperty('--faderh');
    wrap.classList.remove('measuring', ...SHED_ORDER.map(shedClass));
    wrap.classList.add(...had);
  }
}

/**
 * Everything in a strip whose height does not move with the fader — the header,
 * readout, pan and buttons are all fixed, so the fader is the only variable left.
 * `n` blocks into the ladder.
 *
 * Measured across EVERY strip, not off the first one: the insert buttons live in the
 * foot, so a channel with five effects on it stands a hundred pixels taller in the
 * fixed parts than a channel with none, and sizing the rack from the first strip gave
 * the busy ones a body too short for their own rows.
 *
 * Rounded up: a strip half a pixel short cuts the last row it is showing.
 */
function measureChromeAt(n) {
  return atShed(n, () => {
    let chrome = 0;
    for (const s of document.querySelectorAll('.strip')) {
      const b = s.querySelector('.stripbody');
      if (!b) continue;
      // Each strip's own fader comes out of its own total — that is the part this is
      // solving for, and a strip without one has none to subtract.
      chrome = Math.max(chrome, Math.ceil(px(s, 'paddingTop') + px(s, 'paddingBottom')
        + naturalHeight(b) + h(s.querySelector('.striphead'))
        + h(s.querySelector('.stripfoot')) - h(s.querySelector('.faderwrap'))) + 2);
    }
    return chrome;
  });
}

/**
 * The four chrome heights, cached: one per rung of the ladder. Measuring all of them
 * costs four passes over the rack, so it is done once and thrown away by
 * forgetStripMetrics() when something that could move them moves — a rack rebuild, a
 * typeface change, or a part switch, since a block you have already hidden by hand
 * has no height for the ladder to save by hiding it again.
 */
let chromeRungs = null;
const forgetStripMetrics = () => { chromeRungs = null; };
function stripChromeAt(n) {
  if (!chromeRungs) {
    // Asked before the first buildRack — applyFont() and reserveDevices() both run at
    // load. Plausible numbers rather than a throw; the real ones arrive with the first
    // fit after the rack exists, and forgetStripMetrics() is what fetches them.
    // These are only a pre-build safety estimate. Keep them aligned with the current
    // selector-free strip: the preset now lives in the header and adds no body row.
    if (!document.querySelector('.strip[data-lane]')) return [230, 190, 150, 110][n];
    chromeRungs = SHED_ORDER.map((_, i) => measureChromeAt(i));
    chromeRungs.push(measureChromeAt(SHED_ORDER.length));
  }
  return chromeRungs[n];
}

/** What a full strip needs, and what the last one standing needs. */
const stripChrome = () => stripChromeAt(0);
const bareChrome = () => stripChromeAt(SHED_ORDER.length);

/**
 * The least the rack may be: a strip with every sheddable block gone and the fader at
 * its own minimum, plus the rack's padding. Nothing is hidden behind this — there is
 * no scrolled-away row under it, because the ladder hides whole blocks and says so on
 * the header switch rather than letting a body scroll silently.
 */
function rackFloor() { return bareChrome() + FADER_FLOOR + rackPad(); }

// The roll's scope strip, measured while it is up and kept while it is not. Zero only
// before the roll has ever been built, which is the same nothing the old direct
// measurement returned then.
let lastRollScopeH = 0;
function rollScopeH() {
  const now = h($('pianoroll').querySelector('.ssqscope'));
  if (now) lastRollScopeH = now;
  return lastRollScopeH;
}

/**
 * The least each region may be while it is OPEN, measured rather than written down:
 * every one of these moves with the typeface, and two of them move with the song. A
 * FOLDED region is not in here — its height is its own header and there is nothing
 * to negotiate about it.
 */
const MIN = {
  /** Fixed by CSS at 30 or 44; the sections fold is the only thing that moves it. */
  timeline: () => h($('timeline')),
  /** Header and one row. Whole rows only, always — see arrangeSnap. */
  arrange: () => arrangeChrome() + laneStackHeight(1),
  /** A strip with every sheddable block gone, and the rack's padding. */
  mixer: () => rackFloor(),
  /** The notes panel: header plus enough of a keyboard to play against. The scope
   *  strip is measured when it is on screen and REMEMBERED when it is not — a drum
   *  channel takes the roll out of the panel (see laneHidesRoll), and a floor that
   *  drops by the height of a hidden strip would let a cramped desk claw back room
   *  from the panel every time the selection landed on the kick. */
  notes: () => h($('notehead')) + rollScopeH() + DEV_MIN_ROLL,
  /** Effects panel: header plus room for one card row. */
  devices: () => h($('devhead')) + DEV_MIN_EXTRA,
};

/** What each region asks for when nothing is squeezing it. A dragged height wins. */
const WANT = {
  arrange: () => (userArrH != null ? userArrH
    : Math.min(arrangementWants(),
      arrangeChrome() + laneStackHeight(ARR_AUTO_LANES()))),
  /** Notes panel wants enough height for the roll. */
  notes: () => (userDevH != null ? userDevH : (autoDevH || 204)),
};

// The height the effect cards themselves ask for, measured by reserveDevices().
let autoDevH = 0;
/** Effects panel height — its content by default, or the user's dragged height. */
const effectsNaturalHeight = () => {
  if ($('devices').classList.contains('collapsed')) return 0;
  return h($('devhead')) + (userFxH != null ? userFxH : (autoDevH || DEV_MIN_EXTRA));
};

/** Maximum effects room while leaving the other open panels at their floors. */
function effectsRoom() {
  const arrH = $('arrange').classList.contains('collapsed')
    ? h($('arrange')) : plannedArrangeHeight();
  const notesH = $('notes').classList.contains('collapsed')
    ? h($('notes')) : Math.max(MIN.notes(), userDevH ?? MIN.notes());
  const rackH = $('rackwrap').classList.contains('collapsed') ? 0 : MIN.mixer();
  return Math.max(DEV_MIN_EXTRA, Math.floor(deskPool()
    - h($('mixhead')) - arrH - notesH - rackH - h($('devhead'))));
}
const clampEffectsH = (value) => clamp(value, DEV_MIN_EXTRA, effectsRoom());

/** The height the arrangement will be given, from preferences and content alone. */
const plannedArrangeHeight = () => ($('arrange').classList.contains('collapsed')
  ? h($('arrange'))
  : arrangeSnap(WANT.arrange(), Math.floor));

/**
 * What the notes panel is allowed to take — the room between the rack's floor and
 * the effects panel's selected height at the bottom.
 */
function notesRoom(arrH = plannedArrangeHeight()) {
  const fxH = effectsNaturalHeight();
  const room = deskPool()
    - h($('mixhead'))
    - arrH
    - ($('rackwrap').classList.contains('collapsed') ? 0 : MIN.mixer())
    - fxH;
  return Math.max(MIN.notes(), Math.floor(room));
}

/**
 * Exactly one region in the desk is elastic, chosen in this order: the rack, then
 * the arrangement, then the notes panel, then the empty band at the end. The effects
 * panel has its own selected height and is outside that elastic chain.
 */
const DESK_CHAIN = ['rackwrap', 'arrange', 'notes', 'deskslack'];
function applyDeskChain() {
  const winner = DESK_CHAIN
    .filter((id) => id !== 'arrange')
    .find((id) => id === 'deskslack' || !$(id).classList.contains('collapsed'));
  for (const id of DESK_CHAIN) $(id).classList.toggle('greedy', id === winner);
}

/**
 * Who gets which pixels, worked out before anything is written.
 *
 * The effects panel at the bottom takes its natural or manually selected height. If
 * that leaves the window short, the Mixer gives up its room first; only then do the
 * other panels surrender space to preserve their minimums.
 */
function planDesk() {
  const arrOpen = !$('arrange').classList.contains('collapsed');
  const rackOpen = !$('rackwrap').classList.contains('collapsed');
  // The FOLD, and only the fold. A panel with its roll out is still open and still
  // holds its room — see laneHidesRoll.
  const notesOpen = !$('notes').classList.contains('collapsed');

  if (restoredArrH && laneCount() > 1) {
    if (userArrH <= MIN.arrange() + 1) {
      userArrH = null;
      rememberDeskHeights();
    }
    restoredArrH = false;
  }

  const fxH = effectsNaturalHeight();
  // When the effects panel is collapsed, its header still occupies space in the
  // flex layout but effectsNaturalHeight() returns 0. Account for it so the rack
  // doesn't get over-allocated height that the header then steals.
  const fxCollapsedHeader = (!$('devices').classList.contains('collapsed') || fxH > 0) ? 0 : h($('devhead'));
  const fixed = h($('mixhead'))
    + (arrOpen ? 0 : h($('arrange')))
    + (notesOpen ? 0 : h($('notes')))
    + fxH + fxCollapsedHeader;
  const arrMin = arrOpen ? MIN.arrange() : 0;
  const notesMin = notesOpen ? MIN.notes() : 0;
  const rackMin = rackOpen ? MIN.mixer() : 0;
  const chrome = rackOpen ? stripChrome() : 0;
  const rackWant = !rackOpen ? 0
    : notesOpen ? MIN.mixer()
      : chrome + FADER_MIN + rackPad();
  const room = deskPool() - fixed;
  const lane = laneRowHeight() + laneRowGap();

  let arrH = !arrOpen ? 0
    : arrangeSnap(rackOpen ? WANT.arrange()
      : (userArrH != null ? userArrH : arrangementWants()), Math.floor);
  let notesH = notesOpen ? Math.max(notesMin, WANT.notes()) : 0;
  let rackH = room - arrH - notesH;

  const byHand = (arrOpen && userArrH != null)
    || (notesOpen && userDevH != null) || userFxH != null;

  const clawBack = (short, forced) => {
    if (notesOpen && (forced || !byHand)) {
      const give = Math.min(short, notesH - notesMin);
      notesH -= give;
      short -= give;
    }
    if (short > 0 && arrOpen && (forced || !byHand)) {
      arrH -= Math.min(Math.ceil(short / lane) * lane, arrH - arrMin);
    }
    rackH = room - arrH - notesH;
  };

  if (rackH < rackWant) clawBack(rackWant - rackH, false);
  if (rackH < rackMin) clawBack(rackMin - rackH, true);
  const cramped = rackH < rackMin - 1;
  return { arrOpen, rackOpen, notesOpen, arrH, notesH, fxH, chrome, rackH: rackOpen ? rackH : 0, cramped };
}

/** Write the plan out. */
function applyDesk({ arrOpen, rackOpen, notesOpen, arrH, notesH, fxH, chrome, rackH, cramped }) {
  $('desk').classList.toggle('cramped', cramped);
  $('arrange').style.maxHeight = arrOpen ? `${Math.round(arrH)}px` : '';
  // Notes panel height. When folded or greedy, let CSS handle it.
  if (!notesOpen) {
    $('notes').style.height = '';
  } else if ($('notes').classList.contains('greedy')) {
    $('notes').style.height = '';
  } else {
    $('notes').style.height = `${Math.round(notesH)}px`;
  }
  // Effects panel: natural or manually selected height.
  if (fxH > 0) {
    $('devices').style.height = `${Math.round(fxH)}px`;
  } else {
    $('devices').style.height = '';
  }
  if (rackOpen) sizeStrips(Math.floor(rackH - rackPad()));
}

/**
 * The rack's shrink ladder. `strips` is the height one strip may occupy — the rack's
 * own height less its padding and its horizontal scrollbar.
 *
 * The fader goes first and goes furthest: it is the shock absorber, uncapped upwards
 * so a tall window ends up with long faders rather than a band of empty desk, and
 * squeezed all the way to FADER_FLOOR before any block is touched. When even that is not
 * enough the desk starts shedding whole BLOCKS, in SHED_ORDER — inserts, then sends,
 * then EQ — until a strip fits. It never scrolls a strip body: a row half out of
 * sight is a row you cannot read and cannot click, and it goes without saying that it
 * has gone. A hidden block says so on its header switch instead.
 *
 * The rung is a state of the whole rack rather than of one strip. --striph and
 * --faderh are root variables, the chrome measurement takes its MAX across every
 * strip precisely so they all stand level, and a per-strip ladder would put the
 * faders on three different lines. The precedent is the part switches themselves,
 * which hide a block on every strip at once for the same reason.
 */
function sizeStrips(strips) {
  // Called before the first buildRack, from applyFont() and from the fold restore.
  // Nothing to size, and every measurement below would be zero.
  if (!document.querySelector('.strip[data-lane]')) return;
  const wrap = $('rackwrap');
  const root = document.documentElement.style;

  // The fewest blocks that make a strip fit. Fewest, so the desk gives up as little
  // as it has to and hands each block back at the same height it took it away at.
  let shed = 0;
  while (shed < SHED_ORDER.length && strips < stripChromeAt(shed) + FADER_FLOOR) shed++;
  const chrome = stripChromeAt(shed);
  const gone = SHED_ORDER.slice(0, shed);

  const wasBare = wrap.classList.contains(shedClass(SHED_ORDER[SHED_ORDER.length - 1]));
  for (const id of SHED_ORDER) wrap.classList.toggle(shedClass(id), gone.includes(id));
  markShedParts(gone);

  // The docked preset editor is given --striph too, so on the bottom rung it would be
  // a full editor squashed into the height of a bare strip. Send it away rather than
  // shrink it: the » on the strip head reopens it as soon as there is room.
  if (!wasBare && shed === SHED_ORDER.length
      && voiceEditEl.classList.contains('show')
      && !voiceEditEl.classList.contains('vefloat')) {
    dismissVoiceEditor();
    toast('Preset editor closed — the rack is too short to hold it');
  }

  // FADER_FLOOR, and the same number the shed loop above bargains with. They have to
  // be the one number: floored at FADER_MIN while the loop was letting the strip down
  // to chrome + FADER_FLOOR, a strip could be given fourteen pixels more content than
  // height — and a strip body that overflows scrolls, silently, which is the one
  // thing this whole ladder exists to avoid.
  const fader = Math.max(FADER_FLOOR, strips - chrome);
  root.setProperty('--faderh', `${Math.round(fader)}px`);
  // Sized to the rack, never past it: there is no vertical scrollbar on the rack, so
  // a strip that wanted more would simply be cut off. `strips` already accounts for
  // the rack's padding and its horizontal scrollbar, so this fills the space exactly
  // and leaves the padding showing under the last strip.
  root.setProperty('--striph', `${Math.round(Math.min(strips, chrome + fader))}px`);
}

/**
 * Mark the header switches for the blocks the desk is hiding of its own accord.
 *
 * The switch stays ON — it is still what you want, and it comes back the moment there
 * is room — but it is struck through, so "there is no space for this" reads as a
 * different thing from "you turned this off". This is the affordance the whole ladder
 * rests on: the reason it is allowed to hide a block at all is that it says it has.
 */
function markShedParts(gone) {
  for (const b of $('partfilter').querySelectorAll('button[data-part]')) {
    const off = hiddenParts.has(b.dataset.part);
    const shed = !off && gone.includes(b.dataset.part);
    b.classList.toggle('shed', shed);
    if (!shed) continue;
    b.title = `No room for ${STRIP_PARTS.find((p) => p.id === b.dataset.part).what}`
      + ' — the window is too short. Give the mixer more height and it comes back.';
  }
}

/** Size the desk to the window. */
function fitStrips() {
  applyDeskChain();
  applyDesk(planDesk());
  // Name clipping is a tooltip convenience, not part of the layout decision. Reading
  // scrollWidth/clientWidth immediately after the flex writes above forces the browser
  // to finish the whole desk reflow in the same task that opened a panel. Defer that
  // read so a fold only does the measurements needed to keep playback alive.
  scheduleMarkClipped();
}

// Panel folds can change several flex constraints at once. Coalesce all of the
// resulting requests into one frame, after the browser has applied the new classes,
// rather than measuring once before flex settles and again afterwards.
let deskFitPending = 0;
let deskFitSettle = false;
function scheduleDeskFit(settle = false) {
  deskFitSettle ||= settle;
  if (deskFitPending) return;
  deskFitPending = requestAnimationFrame(() => {
    deskFitPending = 0;
    fitStrips();
    // Flex assigns the newly freed/claimed panel pixels in this frame, while the
    // rack's strip height is written by fitStrips. A fold therefore gets one bounded
    // follow-up measurement so that the cards fill the new rack height instead of
    // leaving the old card height and a blank band below it.
    if (deskFitSettle) {
      deskFitSettle = false;
      deskFitPending = requestAnimationFrame(() => {
        deskFitPending = 0;
        fitStrips();
      });
    }
  });
}

let clippedMarkPending = 0;
function scheduleMarkClipped() {
  if (clippedMarkPending) return;
  const run = () => {
    clippedMarkPending = 0;
    markClipped();
  };
  if (typeof requestIdleCallback === 'function') {
    clippedMarkPending = requestIdleCallback(run, { timeout: 400 });
  } else {
    clippedMarkPending = setTimeout(run, 0);
  }
}

/**
 * A tooltip only where the name is cut off. "Electro-Fx" fits in a strip and needs no
 * hover; the ones that ellipsis do, and there is no way to read them otherwise. It is
 * a measurement, not a property of the name, so it is re-taken whenever the layout
 * moves — a name that fits at one window width is truncated at another.
 */
function markClipped(root = document) {
  for (const el of root.querySelectorAll('.strip h3, .arrname')) {
    const full = el.dataset.full || el.textContent;
    el.dataset.full = full;
    el.title = el.scrollWidth > el.clientWidth + 1 ? full : '';
  }
}

// Every border sizes the panel ABOVE it, so a handler never lives on the element it
// resizes. This is the first one: the top border of Notes, which is the Arrangement's
// bottom edge. Dragging it is a claim about how much Arrangement you want to see;
// double-clicking it withdraws the claim.
(() => {
  const edge = $('notes');
  let from = 0, startH = 0, dragging = false;
  edge.addEventListener('pointerdown', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    dragging = true;
    from = e.clientY;
    startH = h($('arrange'));
    edge.classList.add('edge-dragging');
    try { edge.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    e.preventDefault();
  });
  edge.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - from;
    const asked = startH + dy;
    const notesCollapsed = $('notes').classList.contains('collapsed');
    // Pulled up past the first lane: fold it away. Half a lane is not a thing to
    // leave someone looking at, and the fold is where they were heading anyway. If
    // Notes is the folded side of this border, dragging upward across it opens it —
    // the room the arrangement gives up has to go somewhere you can see.
    if (lanesIn(asked) < 1) {
      setArrangeCollapsed(true);
      userArrH = null;
      if (notesCollapsed && dy < 0) setNotesFolded(false, false);
    } else {
      setArrangeCollapsed(false);
      userArrH = arrangeSnap(asked);
    }
    fitStrips();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    edge.classList.remove('edge-dragging');
    rememberDeskHeights();
  };
  edge.addEventListener('pointerup', stop);
  edge.addEventListener('pointercancel', stop);
  edge.addEventListener('dblclick', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    userArrH = null;
    rememberDeskHeights();
    fitStrips();
    toast('Arrangement back to fitting itself');
  });
})();

// Coalesced to one fit a frame. A drag on the window edge fires this continuously,
// and a fit now measures every strip in the rack to find the tallest chrome — on a
// twenty-channel song that is twenty forced reflows, which is not a thing to do
// several times between two paints.
let fitPending = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(fitPending);
  fitPending = requestAnimationFrame(() => {
    fitStrips();
    updateArrangementNoteScale();
  });
});

// The second resize edge is the top border of the Mixer header, which is Notes'
// BOTTOM edge: moving it DOWN gives Notes more room, moving it UP gives Notes less.
// That is the opposite sense from when this handler sat on Notes' own top border, and
// the reason every sign in here is inverted from the Effects handler below — that one
// still grows a panel upward, this one grows it downward. It keeps the current height
// live while dragging and only writes the preference when the gesture ends, so a
// resize cannot fill localStorage with intermediate pixels.
(() => {
  const edge = $('mixhead');
  const panel = $('notes');
  let from = 0, startH = 0, startCollapsed = false, dragging = false;
  edge.addEventListener('pointerdown', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    dragging = true;
    from = e.clientY;
    startH = h(panel);
    startCollapsed = panel.classList.contains('collapsed');
    edge.classList.add('edge-dragging');
    try { edge.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    e.preventDefault();
  });
  edge.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - from;
    // A folded Notes panel starts at its header height, which is below the normal
    // open minimum. A downward drag must open it immediately; keep the gesture's
    // distance above the minimum so the panel grows with the pointer from there.
    const asked = startCollapsed && dy > 0
      ? MIN.notes() + dy
      : startH + dy;
    const mixerCollapsed = $('rackwrap').classList.contains('collapsed');
    // Like Arrangement, Notes folds once its open minimum would be crossed. Dragging
    // back across that same boundary reopens it and restores the roll's content. If
    // Mixer is folded, moving the border UP gives that side room instead — the Mixer
    // is below this border now, so it is an upward drag that hands it space.
    if (startCollapsed && dy > 0) {
      setNotesFolded(false, false);
      userDevH = clampDeviceH(asked);
    } else if (asked <= MIN.notes()) {
      setNotesFolded(true, false);
      userDevH = null;
      if (mixerCollapsed && dy < 0) setMixerFolded(false, false);
    } else {
      setNotesFolded(false, false);
      userDevH = clampDeviceH(asked);
      if (mixerCollapsed && dy < 0) setMixerFolded(false, false);
    }
    fitStrips();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    edge.classList.remove('edge-dragging');
    rememberDeskHeights();
    // The same drag folds and unfolds Notes as it crosses the panel's minimum, and
    // that fold belongs to the song, not to the desk.
    rememberSongLayout();
  };
  edge.addEventListener('pointerup', stop);
  edge.addEventListener('pointercancel', stop);
  edge.addEventListener('dblclick', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    userDevH = null;
    rememberDeskHeights();
    reserveDevices();
    fitStrips();
    toast('Notes panel back to fitting itself');
  });
})();

// Effects uses its top border as the resize edge. Moving it UP grows the shelf and
// takes room from the Mixer; moving it DOWN gives the Mixer room back. A folded shelf
// opens on the first upward movement, just like Notes.
(() => {
  const edge = $('devices');
  let from = 0, startH = 0, startCollapsed = false, dragging = false;
  edge.addEventListener('pointerdown', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    dragging = true;
    from = e.clientY;
    startH = h(edge);
    startCollapsed = edge.classList.contains('collapsed');
    edge.classList.add('edge-dragging');
    try { edge.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    e.preventDefault();
  });
  edge.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - from;
    const asked = startCollapsed && dy < 0
      ? MIN.devices() - dy
      : startH - dy;
    const bodyH = asked - h($('devhead'));
    if (startCollapsed && dy < 0) {
      setDevicesFolded(false, false);
      userFxH = clampEffectsH(bodyH);
    } else if (asked <= MIN.devices()) {
      setDevicesFolded(true, false);
      userFxH = null;
    } else {
      setDevicesFolded(false, false);
      userFxH = clampEffectsH(bodyH);
    }
    fitStrips();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    edge.classList.remove('edge-dragging');
    rememberDeskHeights();
  };
  edge.addEventListener('pointerup', stop);
  edge.addEventListener('pointercancel', stop);
  edge.addEventListener('dblclick', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.top - 6 || e.clientY > r.top + 6
        || e.target.closest?.('button')) return;
    userFxH = null;
    rememberDeskHeights();
    reserveDevices();
    fitStrips();
    toast('Effects panel back to fitting itself');
  });
})();

// ---- timeline --------------------------------------------------------------
// One segment per two-bar block of the song form. Sections get distinct hues so a
// verse/lift/bridge shape is readable at a glance, which is what you actually
// navigate by when balancing — "the loud bit" is a block, not a timestamp.
const SECTION_HUES = [168, 210, 275, 32, 130, 340, 190, 60];

// One hue per channel, shared by its strip and its arrangement row, so a colour
// means the same thing in both places. Grouped so the kit reads as a family.
const LANE_HUES = {
  kick: 6, snare: 22, clap: 38, hats: 48, ohats: 54, rim: 30, crash: 14,
  bass: 96, lead: 168, leadHarm: 186, twinkle: 200, chords: 212, organChords: 226,
  organGliss: 250, organSwoop: 260, keyGliss: 272, gliss: 284, electroFx: 296,
  sweeps: 308, vox: 330, shout: 344,
};
// Alternate desk themes use a small, deliberately quiet colour vocabulary. The
// track still owns its colour, but the palette is finite enough that the rack reads
// as a console rather than a rainbow. Keep the default on the original HSL path so
// saved screenshots and the familiar Midnight desk do not move unexpectedly.
const TRACK_PALETTES = {
  amber: ['#c87862', '#c59b5b', '#9ca45e', '#6f9b83', '#6e91b5', '#9179a8', '#b57c91', '#7d9d98'],
  ocean: ['#d17c76', '#c59b62', '#a1aa68', '#6ca9a6', '#75a1c4', '#9a88bd', '#c187a0', '#7ea99e'],
  plum: ['#d1847b', '#c9a36a', '#a0ad70', '#6fa5a1', '#7e9fc5', '#ad91c4', '#c98fa6', '#83aa9d'],
  light: ['#9a5d58', '#9b763f', '#6c7b43', '#3d7773', '#496f98', '#705c8e', '#925a73', '#4c7c72'],
  dawn: ['#aa6758', '#a47c4a', '#78834e', '#4c817b', '#58779a', '#786391', '#9b6278', '#5b847c'],
  dusk: ['#b8756d', '#b18b58', '#8d9860', '#64908c', '#6f8fad', '#927eab', '#ad778c', '#789991'],
  // Oscar's are panel legends rather than lights: one lightness, barely any chroma,
  // so a rack of them reads as printing on the bone plate. Any more saturation and
  // the one thing the theme is for — a machine with no colour on it — is gone.
  oscar: ['#b8a89a', '#b3a67c', '#a0a687', '#87a09b', '#8c9cae', '#a294a8', '#b39a9c', '#94a397'],
};
// A layer keeps its source's hue, nudged. It IS that part — a colour that said
// otherwise would break the one thing the colours are for — but two rows the same
// shade with the same name on them is a pair you cannot tell apart at a glance.
const laneHue = (key) => {
  if (LANE_HUES[key] != null) return LANE_HUES[key];
  const base = baseLane(key);
  if (base === key || LANE_HUES[base] == null) return 200;
  return (LANE_HUES[base] + 7 * (parseInt(key.slice(base.length), 10) - 1)) % 360;
};
/* Whether the desk's own surface is light. Measured from the theme rather than listed,
 * so a new theme never has to be added to a list of light ones to look right — read
 * once when the theme changes, because the alternative is a getComputedStyle per bar
 * and there are a few thousand bars. */
let panelIsLight = false;
const measureSurface = () => {
  const hex = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim();
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return;
  const n = parseInt(m[1], 16);
  // Rec. 601 luma: good enough to answer "is this paper or slate", which is all
  // anything downstream asks it.
  const luma = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  panelIsLight = luma > 0.5;
};
const themeHueColour = (hue) => {
  const palette = TRACK_PALETTES[document.documentElement.dataset.mixerTheme];
  if (!palette) return null;
  return palette[Math.floor((hue / 360) * palette.length) % palette.length];
};
const themeTrackColour = (key) => themeHueColour(laneHue(key));
/* The send returns are coloured by hue rather than by lane — they are not lanes — but
 * they have to go through the same two doors as everything else, or they keep their
 * raw teal and purple in a theme that has neither. */
const hueColour = (hue, l = 55) => themeHueColour(hue) || `hsl(${hue} 62% ${l}%)`;
const hueTint = (hue) => `color-mix(in srgb, ${hueColour(hue)} 24%, transparent)`;
const laneColour = (key, l = 55) => hueColour(laneHue(key), l);
/** The same hue, quiet enough to sit behind a name without shouting over it.
 *
 * Mixed toward the surface rather than darkened to a fixed lightness. The old path
 * was `hsl(h 32% 12%)` — Midnight's own background written into the colour — which
 * is right on slate and puts a row of black bars across a paper desk. Both paths are
 * one formula now, so a theme with no palette of its own tints correctly whatever
 * colour its panel is. */
const laneTint = (key) => `color-mix(in srgb, ${laneColour(key)} 24%, transparent)`;
const arrangementBarColour = (key, shade = 56) => {
  const themed = themeTrackColour(key);
  if (themed) return themed;
  // This is the original Solid fill: a strong lane colour, never a panel wash. Clamp
  // only protects custom density callers; the shared active field uses the full 56%
  // solid shade below.
  return `hsl(${laneHue(key)} 58% ${Math.min(62, Math.max(44, shade)).toFixed(0)}%)`;
};
/** A lane's active bar is the original Solid field; the selected note language supplies the
 * darker marks on top. Keeping this in one helper also makes recorded notes match the
 * bars that were drawn from the arrangement. */
const arrangementBarField = (key) => arrangementBarColour(key, 56);

/**
 * How long the song is, and what it is made of — in BARS.
 *
 * Counted off the bar plan rather than off `order.length * 2`, because an arranged
 * song no longer has two bars per order entry: an entry can be one bar, and the plan
 * is the only thing that knows how many there are. `order` is still handed back for
 * the timeline's section colours, and `bars` is what everything measuring the song
 * should use.
 */
function songShape() {
  const bank = viewBank();
  const order = bank.order || (bank.sections ? bank.sections.map((_, i) => i) : [0]);
  const bars = barPlan(bank, 1);
  const spb = (60 / deskTempo()) / 4;   // the tempo this song plays at, dragged or written
  const totalSteps = bars.length * 16;
  return { order, bars, spb, totalSteps, loopSecs: totalSteps * spb };
}

/**
 * Where in the song the music being HEARD right now is, as a fractional sixteenth.
 *
 * `songBeat()` backs off the scheduler's lookahead, so this is what has left the
 * speakers rather than what has been queued — the playhead has to match the ear.
 * Two more lags pull the line the other way from the audio's own: a note's attack ramp
 * means it is heard a few milliseconds after it is scheduled, and the frame this is
 * painted in reaches the glass a frame or two after that. Both put the line behind the
 * music, which is what "the playhead is early" looks like. `phOffset` is milliseconds
 * forward — positive moves it right — and it is the only part of the playhead that
 * cannot be computed, because it is a property of the screen.
 *
 * Before the first step is heard this is NEGATIVE: the scheduler has queued the next
 * step and nothing has left the speakers yet, so `songBeat()` backs off by more than
 * the position it is backing off from. Wrapping that with a modulo would put it at the
 * END of the song — the playhead jumping to the right edge every time play started — so
 * before the top of the song clamps to the top of the song rather than wrapping.
 *
 * Two callers, and it is one function because of the second. The playhead wants it to
 * draw; the recorder wants it to decide which step a note landed on, and a recorder
 * working from its own copy of this arithmetic would drift from the line the moment
 * anybody nudged `[` or `]` — which is a control that exists precisely because the
 * number is machine-specific. Null when there is nothing playing.
 *
 * `Audio.step` is NOT this. That is the scheduler's integer step, up to 120ms in the
 * future and carrying a cycle offset — right for scheduling, wrong for both of these.
 */
function heardStepNow() {
  const beat = Audio.songBeat();
  if (beat == null || !track) return null;
  const { spb, totalSteps } = songShape();
  if (!(totalSteps > 0)) return null;
  const at = beat * 4;
  const led = Math.max(0, at + (phOffset / 1000) / spb);
  // `phOffset` moves the line FORWARD, and forward from the last few milliseconds of a
  // lap is past the end of it. Modulo against the whole song does not catch that when a
  // loop is armed — the song is longer than the loop — so for `phOffset` milliseconds
  // every lap the desk read a step in the bar AFTER the loop, and lit its first note.
  // Wrap against the range the transport is actually turning round in instead.
  return wrappedPlaybackStep(led, at, totalSteps);
}

// The arrangement marks need a small amount of paint lead so the mark is on the glass
// when the attack reaches the ear. Two separate things put it behind the music. The
// frame this is computed in is composited on the NEXT screen refresh, which is one
// frame at best; and each note language spends a slice of its own keyframes getting
// to full strength, so the moment it READS as a hit is later than the moment the class
// went on. Lead by both, per language, rather than by one number that can only be
// right for one of them.
const ARRANGEMENT_PAINT_LEAD_MS = 24;
// Half of each language's time to peak. Leading by the whole of it would start the
// flourish visibly before the note; half puts the accent on the beat while the onset
// still reads as belonging to it.
const NOTE_VISUAL_LEAD_MS = { solid: 0, pulse: 10, trail: 45 };
function arrangementVisualLeadMs() {
  if (!noteAnimation) return ARRANGEMENT_PAINT_LEAD_MS;
  return ARRANGEMENT_PAINT_LEAD_MS + (NOTE_VISUAL_LEAD_MS[noteVisualMode] ?? 0);
}

/**
 * The range the playhead at `step` is turning round in, in song-relative steps.
 *
 * Inside an armed loop that is the LOOP, on every lap including the first: the transport
 * turns round at its end, so nothing drawn past it is ever heard, and what follows it is
 * its own start rather than the next bar. Outside the region — the intro of a song whose
 * loop starts part-way in, or the lookahead still draining after Loop was armed — the
 * song itself is the range, so a step that has left the region is never dragged back
 * into it.
 *
 * One function for both edges. Two would be two places to decide which range a step
 * belongs to, and a loop that ends on the last bar of the song makes them disagree:
 * its end IS the song's end, but its start is not the song's.
 */
function playbackWrapRange(step, totalSteps) {
  const { loopStart, loopEnd } = Audio;
  if (loopStart != null && loopEnd != null && loopEnd > loopStart
    && step >= loopStart && step < loopEnd) {
    return { start: loopStart, end: Math.min(loopEnd, totalSteps) };
  }
  return { start: 0, end: totalSteps };
}

/** Where the playhead this step belongs to will next WRAP. */
function playbackWrapStep(step, totalSteps) {
  return playbackWrapRange(step, totalSteps).end;
}

/**
 * A position carried forward by a lead, brought back inside the range it belongs to.
 *
 * The range is chosen from `at` — where the transport actually is — never from the led
 * position. Choosing it from the led position is the bug this exists to stop: once the
 * lead has crossed the end of the loop it is no longer inside the region, so it would
 * pick the whole song and be left exactly where it should not be.
 */
function wrappedPlaybackStep(led, at, totalSteps) {
  const { start, end } = playbackWrapRange(at, totalSteps);
  const span = end - start;
  if (!(span > 0)) return led;
  return start + ((led - start) % span + span) % span;
}

/**
 * Do not let the paint lead cross a wrap. The next bar becomes eligible only when the
 * heard playhead itself gets there — otherwise the lead spills over the end of the loop
 * and lights the first note of the bar AFTER it, a note that is never played.
 */
function arrangementVisualStep(step) {
  if (step == null) return null;
  const { spb, totalSteps } = songShape();
  const lead = arrangementVisualLeadMs() / 1000 / spb;
  return Math.min(playbackWrapStep(step, totalSteps) - 1e-6, step + lead);
}

function buildTimeline() {
  const { bars: plan, loopSecs } = songShape();
  // One segment per BAR (4 beats). A bar is the unit you count in your head, and
  // since the arrangement became bar-wise it is also the unit the song is made of:
  // an order entry can be one bar now, so two-bars-per-block is no longer a shape
  // the timeline can assume.
  //
  // Bars of the same section share its hue, the second half a shade darker, so the
  // block structure still reads without having to count — and a single bar taken out
  // of a section still shows as that section's colour.
  const secsPerBar = (60 / deskTempo()) * 4;

  // The ruler: a tick per bar, numbered often enough to read and rarely enough to
  // stay legible. Percentage positions, so it follows the window without rebuilding.
  const barCount = plan.length;
  const every = barCount <= 24 ? 2 : barCount <= 48 ? 4 : barCount <= 96 ? 8 : 16;
  const ruler = $('ruler');
  ruler.textContent = '';
  for (let b = 1; b <= barCount; b++) {
    const major = (b - 1) % every === 0;
    const tick = document.createElement('div');
    tick.className = 'tick' + (major ? ' major' : '');
    tick.style.left = `${((b - 1) / barCount) * 100}%`;
    if (major) {
      const n = document.createElement('span');
      n.textContent = String(b);
      tick.append(n);
    }
    ruler.append(tick);
  }

  const el = $('blocks');
  el.textContent = '';
  plan.forEach((bar, i) => {
    const sec = bar.sec ?? 0;
    const hue = SECTION_HUES[sec % SECTION_HUES.length];
    const d = document.createElement('div');
    d.className = 'blk' + (bar.half ? ' second' : '');
    d.style.background = `hsl(${hue} 42% ${bar.half ? 38 : 46}%)`;
    // A bar that drops lanes is marked on the timeline as well as in the grid: the
    // build-up is a shape you should be able to see from the ruler down.
    if (bar.off?.length) d.classList.add('muted');
    if (bar.delete?.length) d.classList.add('deleted');
    d.title = `Bar ${i + 1} · section ${sec + 1}, ${bar.half ? 'second' : 'first'} half`
      + ` · ${fmtTime(i * secsPerBar)} (${secsPerBar.toFixed(1)}s per bar)`
      + (bar.off?.length ? `\nSilenced here: ${bar.off.join(', ')}` : '')
      + (bar.delete?.length ? `\nDeleted here: ${bar.delete.join(', ')}` : '')
      + (bar.transpose ? `\nTranspose: ${JSON.stringify(bar.transpose)}` : '')
      + (bar.offset ? `\nTiming (1/32): ${JSON.stringify(bar.offset)}` : '')
      + (bar.gain ? `\nGain dB: ${JSON.stringify(bar.gain)}` : '');
    // No number in the block: the ruler above counts the bars, and these say which
    // section they belong to. One row, one question.
    el.append(d);
  });
  $('tnow').title = `Where you are in ${track.title}, and how long it runs`;
  $('tnow').textContent = `0:00/${fmtTime(loopSecs)}`;
  // Reserve both sides of the slash at the song's widest bar number. Without this,
  // the readout grows when 999 becomes 1000 and nudges the whole header to the right.
  const barDigits = String(Math.max(1, plan.length)).length;
  $('barnow').style.width = `${barDigits * 2 + 1}ch`;
  $('barnow').textContent = `1/${plan.length}`;
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Loop region is defined by two locator pins on the timeline rather than by bar
// counts. The loop starts OFF, so pressing play gives you the whole song.
// Click the timeline to place locators; click a locator to clear it.
let locA = null;              // first locator step (null = not placed)
let locB = null;              // second locator step
let loopOn = false;
// Two different positions. `loopAnchor` is the start of the LOOP REGION (the
// lesser of the two locators). `parkedAt` is where the playhead is, to the step
// — Play resumes exactly where you paused.
let loopAnchor = 0;
let pendingLoopAnchor = null;
let pendingSeekStep = null;
let parkedAt = 0;

/**
 * Resolve the range the transport should loop.
 *
 * The highlighted bar range is the desk's primary selection. Alt-click locators are
 * retained as a fallback for the older locator workflow, but they must not override a
 * range the user has visibly selected in the timeline or arrangement.
 */
function currentLoopBounds() {
  const { totalSteps } = songShape();
  if (selectedBar) {
    const totalBars = Math.max(1, Math.floor(totalSteps / 16));
    const from = clamp(Math.min(selectedBar.from, selectedBar.to), 0, totalBars - 1);
    const to = clamp(Math.max(selectedBar.from, selectedBar.to), from, totalBars - 1);
    return { start: from * 16, end: Math.min(totalSteps, (to + 1) * 16) };
  }
  if (locA != null && locB != null) {
    return { start: Math.min(locA, locB), end: Math.max(locA, locB) };
  }
  return null;
}

function syncLoopButton() {
  const button = $('looptoggle');
  const bounds = currentLoopBounds();
  const bars = bounds ? Math.max(1, Math.round((bounds.end - bounds.start) / 16)) : 0;
  button.textContent = loopOn
    ? (bars ? `Loop ${bars} Bar${bars === 1 ? '' : 's'}` : 'Loop On')
    : 'Loop Off';
  button.classList.toggle('on', loopOn);
  button.setAttribute('aria-pressed', loopOn ? 'true' : 'false');
  if (loopOn && bounds) showLoopUi(bounds.start, bounds.end, songShape().totalSteps);
}

function syncLoopAnchor() {
  if (!pendingLoopAnchor || Audio.pendingLoop != null) return;
  if (Audio.loopStart === pendingLoopAnchor.start && Audio.loopEnd === pendingLoopAnchor.end) {
    loopAnchor = pendingLoopAnchor.start;
    pendingLoopAnchor = null;
    $('loopregion').classList.remove('pending');
  }
}

function syncPendingSeek() {
  if (pendingSeekStep == null || Audio.pendingStep != null) return;
  pendingSeekStep = null;
  $('selregion').classList.remove('pending');
}

/** Arm the highlighted range, or the two song-relative locators. */
function applyLoop(atStep = null) {
  const { totalSteps } = songShape();
  const bounds = currentLoopBounds();
  pendingLoopAnchor = null;
  pendingSeekStep = null;
  $('selregion').classList.remove('pending');
  $('loopregion').classList.remove('pending');
  syncLoopButton();
  if (!loopOn || !bounds) {
    Audio.setLoop();
    hideLoopUi();
    return;
  }
  const { start, end } = bounds;
  if (end <= start) { Audio.setLoop(); hideLoopUi(); return; }
  // Both selection bars and locator positions are relative to this song, not to
  // whichever whole-song cycle the scheduler happened to be in when Loop was pressed.
  // Keeping the engine bounds in that same coordinate space makes every re-arm land on
  // the same region.
  Audio.setLoop(start, end);
  loopAnchor = start;
  showLoopUi(start, end, totalSteps);
}

function hideLoopUi() {
  $('loopregion').style.display = 'none';
  $('loopregion').classList.remove('pending');
  showLocatorUi();
}

function showLoopUi(start, end, totalSteps) {
  const reg = $('loopregion');
  reg.style.display = '';
  reg.style.left = (start / totalSteps * 100) + '%';
  reg.style.width = ((end - start) / totalSteps * 100) + '%';
  showLocatorUi(totalSteps);
}

// Locator placement is independent of whether the loop is armed. Hiding the pins when
// Loop was off made Alt-click appear to do nothing and made it impossible to check the
// two positions before enabling playback.
function showLocatorUi(totalSteps = songShape().totalSteps) {
  const span = Math.max(1, totalSteps);
  for (const [id, step] of [['locatorA', locA], ['locatorB', locB]]) {
    const pin = $(id);
    pin.style.display = step == null ? 'none' : '';
    if (step != null) pin.style.left = (step / span * 100) + '%';
  }
}

/** Place or clear a locator at the given step. Returns which locator changed. */
function toggleLocator(step) {
  const within = ((Math.floor(step) % songShape().totalSteps) + songShape().totalSteps) % songShape().totalSteps;
  // Clicking on an existing locator clears it
  if (locA === within) { locA = null; applyLoop(); return 'A-cleared'; }
  if (locB === within) { locB = null; applyLoop(); return 'B-cleared'; }
  // Place at the first empty slot
  if (locA == null) { locA = within; applyLoop(); return 'A'; }
  if (locB == null) { locB = within; applyLoop(); return 'B'; }
  // Both are set — replace the nearer one
  const dA = Math.abs(locA - within);
  const dB = Math.abs(locB - within);
  if (dA <= dB) { locA = within; } else { locB = within; }
  applyLoop();
  return dA <= dB ? 'A' : 'B';
}

/**
 * Arm the loop but do NOT jump the playhead — for "Play from start" where the
 * song should play from the beginning and only loop once it reaches the region.
 *
 * Uses Audio.setLoop() (the same proven path as applyLoop) then immediately
 * overrides the step back to 0, so the scheduler plays from the top and wraps
 * when it hits the region naturally.
 */
function applyLoopNoJump() {
  const { totalSteps } = songShape();
  const bounds = currentLoopBounds();
  pendingLoopAnchor = null;
  pendingSeekStep = null;
  $('selregion').classList.remove('pending');
  $('loopregion').classList.remove('pending');
  if (!loopOn || !bounds) {
    Audio.setLoop();
    hideLoopUi();
    return;
  }
  const { start, end } = bounds;
  if (end <= start) { Audio.setLoop(); hideLoopUi(); return; }
  // Arm the loop through the exact same path as applyLoop — setLoop validates
  // the bounds, sets loopStart/loopEnd, and would jump the playhead into the
  // region. We override the jump immediately after so the song starts from 0.
  Audio.setLoop(start, end);
  Audio.step = 0;  // override setLoop's jump — play from the top
  loopAnchor = start;
  showLoopUi(start, end, totalSteps);
}

$('looptoggle').onclick = () => {
  loopOn = !loopOn;
  applyLoop();
  if (loopOn) {
    const bounds = currentLoopBounds();
    if (!bounds) {
      toast('Loop on — select a bar range, or Alt-click the timeline to place locators');
    } else {
      toast(`Loop on — bars ${barOf(bounds.start)} to ${barOf(bounds.end - 1)}`);
    }
  } else {
    toast('Loop off — playing the whole song');
  }
};

// Clicking directly on a locator pin clears it.
$('locatorA').onclick = (e) => {
  e.stopPropagation();
  if (locA != null) { locA = null; applyLoop(); toast('Locator A cleared'); }
};
$('locatorB').onclick = (e) => {
  e.stopPropagation();
  if (locB != null) { locB = null; applyLoop(); toast('Locator B cleared'); }
};

/**
 * Move the playhead. While playing, an ordinary seek is queued for the next bar
 * boundary so the current bar is allowed to finish. With a bar loop armed, the
 * destination stays inside that loop rather than escaping it.
 *
 * Stopped, it parks the position instead, so Play starts from where you last
 * pointed; `start: true` (a double-click) skips the wait and plays from there.
 */
function jumpTo(step, { start = false, immediate = false } = {}) {
  const { totalSteps, spb, loopSecs } = songShape();
  const within = ((Math.floor(step) % totalSteps) + totalSteps) % totalSteps;
  // Moving the transport by hand is a request to look at that part of the song, so it
  // undoes a scroll that had told the roll to stop following.
  stepSeq.armFollow?.();
  pianoRoll.armFollow?.();
  if (!playing) {
    parkedAt = within;                              // Play resumes on this step
    if (start) { setPlaying(true, within); return; }
    // Nothing is running to move the playhead, so put it where the click was.
    applyLoop(within);
    $('playhead').style.left = `${(within / totalSteps) * 100}%`;
    $('tnow').textContent = `${fmtTime(within * spb)}/${fmtTime(loopSecs)}`;
    $('barnow').textContent = `${barOf(within)}/${totalSteps / 16}`;
    stepSeq.follow(within);
    pianoRoll.follow(within);
    return;
  }
  if (start && within === 0) {
    // A running loop has audio already queued ahead of the transport. Rewinding only
    // `Audio.step` leaves those loop notes audible before the restart. Re-enter the
    // transport so setBank cuts that queue, resets the song, and then arms the loop
    // without jumping into it.
    setPlaying(false);
    setPlaying(true, 0);
    return;
  }
  if (!immediate) {
    // A normal click is a musical seek, not a transport restart. Let the current
    // bar finish before moving the scheduler so the change lands like a live deck.
    pendingLoopAnchor = null;
    $('loopregion').classList.remove('pending');
    Audio.setStepAtBoundary(within);
    pendingSeekStep = within;
    $('selregion').classList.add('pending');
    return;
  }
  Audio.setLoop();                       // explicit transport actions move immediately
  pendingSeekStep = null;
  $('selregion').classList.remove('pending');
  Audio.step = within;
  Audio.nextTime = Audio.ctx.currentTime + 0.03;
  applyLoop(within);
}

// The bars area, not the whole strip: the ruler is inset by the arrangement's name
// column, so measuring against the full width put every click a few bars early.
const timelineStep = (e) => {
  const r = $('barsarea').getBoundingClientRect();
  return Math.floor(clamp((e.clientX - r.left) / r.width, 0, 1) * songShape().totalSteps);
};
const barOf = (step) => Math.floor(step / 16) + 1;
const timelineBar = (e) => Math.max(0, Math.min(songShape().bars.length - 1, barOf(timelineStep(e)) - 1));

// Selecting structure is a timeline gesture. The arrangement grid can still add a
// lane target to the same range, but the bar numbers and the ripple operations start
// here, where the song's form is visible and easy to count.
let timelineDrag = null;
let timelineClickSuppress = false;
$('barsarea').onpointerdown = (ev) => {
  if (ev.button !== 0) return;
  timelineClickSuppress = false;
  const bar = timelineBar(ev);
  const anchor = ev.shiftKey && selectedBar ? selFrom() : bar;
  markBar(null, anchor, bar);
  timelineDrag = { anchor, moved: false };
  try { $('barsarea').setPointerCapture(ev.pointerId); } catch { /* browserless */ }
};
$('barsarea').onpointermove = (ev) => {
  if (!timelineDrag || !(ev.buttons & 1)) return;
  const bar = timelineBar(ev);
  if (bar !== selTo()) timelineDrag.moved = true;
  markBar(null, timelineDrag.anchor, bar);
};
$('barsarea').onpointerup = () => {
  timelineClickSuppress = !!timelineDrag?.moved;
  timelineDrag = null;
};
$('barsarea').onpointercancel = () => { timelineDrag = null; timelineClickSuppress = false; };
$('barsarea').oncontextmenu = (ev) => timelineMenu(ev);

// The section blocks under the ruler have been drawn all along and shown to nobody.
// A fold is cheaper than the row they used to cost: songs whose form you are working
// on get it, and the rest of the time the timeline stays one line tall. The choice is
// remembered, because it is a way of working and not a one-off look.
const SECTIONS_KEY = 'mash-mixer-sections';
function setSectionsShown(on, refit = true) {
  $('timeline').classList.toggle('sections', on);
  $('tlfold').classList.toggle('folded', !on);
  $('tlfold').title = on ? 'Hide the song sections' : 'Show the song sections';
  localStorage.setItem(SECTIONS_KEY, on ? '1' : '0');
  syncPanelResizeEdges();
  if (refit) fitStrips();       // the timeline is chrome; the rack gets the difference
}
$('tlfold').onclick = (e) => {
  e.stopPropagation();          // the row under it seeks — the fold is not a seek
  setSectionsShown(!$('timeline').classList.contains('sections'));
};
setSectionsShown(localStorage.getItem(SECTIONS_KEY) === '1', false);

// Timeline uses its bottom border as the resize edge. It has two useful heights —
// the ruler alone and the ruler plus section blocks — so dragging down opens the
// latter and dragging back up folds it away. The desk below absorbs the difference.
(() => {
  const edge = $('timeline');
  let from = 0, startH = 0, dragging = false;
  edge.addEventListener('pointerdown', (e) => {
    const r = edge.getBoundingClientRect();
    if (!edge.classList.contains('edge-resizable')
        || e.clientY < r.bottom - 6 || e.clientY > r.bottom + 6
        || e.target.closest?.('button')) return;
    dragging = true;
    from = e.clientY;
    startH = h(edge);
    edge.classList.add('edge-dragging');
    try { edge.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    e.preventDefault();
  });
  edge.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const asked = startH + (e.clientY - from);
    if (asked > 30) setSectionsShown(true, false);
    else setSectionsShown(false, false);
    fitStrips();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    edge.classList.remove('edge-dragging');
  };
  edge.addEventListener('pointerup', stop);
  edge.addEventListener('pointercancel', stop);
})();

$('timeline').onclick = (e) => {
  if (e.target.closest('#tlhead')) return;
  const at = timelineStep(e);
  if (timelineClickSuppress) { timelineClickSuppress = false; return; }
  // Alt-click (or option-click) places/clears a locator instead of seeking.
  if (e.altKey) {
    const which = toggleLocator(at);
    if (which === 'A-cleared' || which === 'B-cleared') {
      toast(`Locator cleared`);
    } else {
      toast(`Locator ${which} set at bar ${barOf(at)}`);
    }
    return;
  }
  const bar = timelineBar(e);
  markBar(null, bar);
  // While a loop is playing, choosing a different bar is a loop edit, not a seek.
  // Seeking here tears down the live scheduler just as the boundary handoff is being
  // queued, which can leave playback silent until the transport is restarted.
  const target = bar * 16;
  if (!(playing && loopOn)) jumpTo(playing ? target : at);
  const looping = loopOn && locA != null && locB != null;
  toast(!playing ? `Parked at bar ${barOf(at)} — double-click to play from here`
    : looping ? `Looping bars ${barOf(Math.min(locA, locB))} to ${barOf(Math.max(locA, locB))}`
    : `Jumped to bar ${barOf(at)}`);
};

// Double-click plays from where you pointed. Stopped, reaching for Play and then
// hunting back to the bar you wanted was the long way round to hear one bar.
$('timeline').ondblclick = (e) => {
  if (e.target.closest('#tlhead')) return;
  const at = timelineStep(e);
  jumpTo(at, { start: true });
  toast(`Playing from bar ${barOf(at)}`);
};

// A lane in by the second bar counts as being in from the top: it starts with the
// song, and dropping the playhead onto bar 2 to hear it would only cost you the bar
// it came in on.
const INTRO_BARS = 2;

/**
 * The bar a lane first plays in, counted from 0. Memoised against the bank, because
 * the answer is a walk of every step of every block and the song does not change
 * while you mix it — switching track swaps the bank and the cache goes with it.
 */
let laneStarts = { bank: null, map: new Map() };
function firstBarOf(key) {
  // Against the SHAPED bank, so a layer has an answer of its own — the same one its
  // source has, which is the point, but the cache has to hold it under its own key.
  const view = viewBank();
  if (laneStarts.bank !== view) {
    const map = new Map();
    // One cell per bar: the question is which bar, not which beat of it.
    for (const row of laneActivity(view, 1, 1)) {
      const bar = row.density.findIndex((d) => d > 0);
      if (bar >= 0) map.set(row.key, bar);
    }
    laneStarts = { bank: view, map };
  }
  return laneStarts.map.get(key);
}

/**
 * Double-click a channel — its strip head, or its name in the arrangement — and the
 * song plays from where that channel comes in. A crash that only sounds in section
 * three was otherwise a matter of pressing Play and waiting for it, or reading along
 * the arrangement row for the first lit bar and double-clicking that.
 *
 * Lanes that are in from the top play from the top: see INTRO_BARS.
 */
function playFromLaneStart(key) {
  selectLane(key);
  const label = targetLabel(key);
  const bar = firstBarOf(key);
  // Only active lanes get a strip or an arrangement row, so this is a fallback and
  // not a case you can click your way into.
  if (bar == null) { jumpTo(0, { start: true }); toast(`${label} never plays — from the top`); return; }
  const from = bar < INTRO_BARS ? 0 : bar;
  jumpTo(from * 16, { start: true });
  markBar(key, from);              // where it starts, marked in the row you can see it in
  toast(from ? `Playing ${label} from bar ${from + 1} — where it comes in`
    : `${label} is in from the top — playing from bar 1`);
}

// ---- device panel ----------------------------------------------------------
// The selected channel's effect chain, along the bottom. Strips carry only a
// one-line summary; a 132px column cannot hold four parameters legibly, and most
// channels have no effects at all.
// Readable names for parameters whose internal keys are terse — the parametric EQ's
// bands especially, where f2/g2/q2 says nothing about what it does.
const PARAM_LABELS = {
  f1: 'LOW FREQ', g1: 'LOW GAIN',
  f2: 'LOW-MID FREQ', g2: 'LOW-MID GAIN', q2: 'LOW-MID Q',
  f3: 'HIGH-MID FREQ', g3: 'HIGH-MID GAIN', q3: 'HIGH-MID Q',
  f4: 'HIGH FREQ', g4: 'HIGH GAIN',
  // One word for a left/right control across the whole catalogue: BALANCE. The KEYS
  // differ — `pan` on the Advanced Delay, `dryPan`/`wetPan` on the Doubler, `balance`
  // on the Gain — because they are what saved mixes hold and renaming them would read
  // as a reset of every song carrying one. What is on the card is what has to be
  // consistent, and two names for one gesture is what sent you looking for the pan
  // control on an effect that called it something else.
  wet: 'WET / DRY', mix: 'MIX', pan: 'BALANCE', balance: 'BALANCE', tone: 'DAMPING',
  feedback: 'FEEDBACK', delayMs: 'TIME', frequency: 'RATE', depth: 'DEPTH',
  baseFrequency: 'BASE FREQ', octaves: 'OCTAVES', distortion: 'DRIVE',
  order: 'ORDER', width: 'WIDTH', pitch: 'PITCH', windowSize: 'WINDOW',
  detune: 'DETUNE', dryPan: 'DRY BALANCE', wetPan: 'WET BALANCE',
  decay: 'DECAY', preDelay: 'PRE-DELAY', threshold: 'THRESHOLD', ratio: 'RATIO',
  attack: 'ATTACK', release: 'RELEASE', spread: 'SPREAD', sensitivity: 'SENSITIVITY',
  delayTime: 'TIME', Q: 'Q', knee: 'KNEE',
  lowFrequency: 'LOW X-OVER', highFrequency: 'HIGH X-OVER',
  ceiling: 'OUT CEILING', lookahead: 'LOOKAHEAD', arc: 'Auto Release (ARC)',
};

/**
 * A parameter's label. Dotted names are labelled a part at a time — `low.threshold`
 * reads LOW THRESHOLD — so the three bands of a multiband compressor need one entry
 * for THRESHOLD between them rather than one per band.
 */
const paramLabel = (p) => PARAM_LABELS[p] || p.split('.')
  .map((s) => PARAM_LABELS[s] || s.replace(/([A-Z])/g, ' $1').toUpperCase())
  .join(' ');

/**
 * Make a dB readout typable, so a level can be entered exactly rather than nudged
 * to it. Double-click still resets, and the Reset channel button is untouched.
 *
 * `ctl` is the level in dB — `{ get, set, min, max, step }` — and not the slider
 * itself, because the slider under a tapered fader holds a position rather than a
 * level. What is typed is what is applied: the position follows, and never the other
 * way round, so a typed −3.0 stays −3.0 and does not come back as whatever the
 * nearest position rounds to.
 */
function makeTypableDb(el, ctl, apply, fmt) {
  el.classList.add('typable');
  el.title = 'Drag to set the level · click to type it · double-click to reset';
  const put = (x) => { const v = clamp(x, ctl.min, ctl.max); ctl.set(v); apply(v); return v; };
  const openEditor = () => {
    if (el.querySelector('input')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein';
    box.value = String(ctl.get());
    el.textContent = '';
    el.append(box);
    box.focus(); box.select();
    const done = (commit) => {
      const n = parseFloat(box.value);
      const v = commit && Number.isFinite(n) ? put(n) : ctl.get();
      el.textContent = fmt(v);
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true);
      else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  };
  dragNumber(el, {
    value: () => ctl.get(),
    set: put,
    range: ctl.max - ctl.min,
    step: ctl.step,
    onClick: openEditor,
  });
}

/**
 * A circular pan pot, as on a Logic channel strip. Drag anywhere on it — vertical
 * or horizontal, whichever your hand does — and the arc fills from centre toward
 * the side you are heading. A horizontal slider reads as a position on a line; a
 * pot reads as a position in the room, which is what pan actually is.
 */
function panKnob({ value, onInput }) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', 'panpot');
  // Full grey track first, green arc drawn over it from the top centre — the
  // Logic layout. The number lives inside the ring, so the knob needs no label
  // and no separate readout: 0 in the middle with no arc IS "centred".
  const track = document.createElementNS(NS, 'path');
  track.setAttribute('class', 'pottrack');
  const arc = document.createElementNS(NS, 'path');
  arc.setAttribute('class', 'potarc');
  const face = document.createElementNS(NS, 'circle');
  face.setAttribute('cx', 22); face.setAttribute('cy', 22); face.setAttribute('r', 13);
  face.setAttribute('class', 'potface');
  const label = document.createElementNS(NS, 'text');
  label.setAttribute('x', 22); label.setAttribute('y', 22);
  label.setAttribute('class', 'pottext');
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('dominant-baseline', 'central');
  svg.append(track, arc, face, label);

  let val = value;
  const SWEEP = 145;                       // degrees either side of top centre
  const R = 18;
  const pt = (deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [22 + Math.cos(a) * R, 22 + Math.sin(a) * R];
  };
  const arcPath = (fromDeg, toDeg) => {
    const [x1, y1] = pt(fromDeg); const [x2, y2] = pt(toDeg);
    const big = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    const sweep = toDeg > fromDeg ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${big} ${sweep} ${x2} ${y2}`;
  };
  track.setAttribute('d', arcPath(-SWEEP, SWEEP));

  const draw = () => {
    const deg = val * SWEEP;
    arc.setAttribute('d', Math.abs(val) < 0.005 ? '' : arcPath(0, deg));
    const n = Math.round(val * 100);
    label.textContent = n === 0 ? '0' : (n > 0 ? '+' : '') + n;
  };
  draw();

  const set = (x) => { val = clamp(x, -1, 1); draw(); onInput(val); };
  let dragging = false, lastX = 0, lastY = 0, moved = 0, fromLabel = false;
  svg.addEventListener('pointerdown', (e) => {
    // The number drags the knob like the rest of the pot does; a click that never
    // moved opens the type-in instead. Dragging over it used to select the text.
    if (holder.querySelector('.typein')) return;
    dragging = true; moved = 0; fromLabel = e.target === label;
    lastX = e.clientX; lastY = e.clientY;
    svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = lastY - e.clientY;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    lastX = e.clientX; lastY = e.clientY;
    // Whichever axis moved more wins, so neither grip feels wrong. Shift is fine.
    const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * (e.shiftKey ? 0.002 : 0.008);
    set(val + delta);
  });
  const stop = () => {
    if (dragging && fromLabel && moved < 3) openPanEditor();
    dragging = false;
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  svg.addEventListener('dblclick', () => set(0));
  svg.title = 'Drag to pan · click the number to type · double-click to centre';

  // Type an exact value. The readout lives inside the SVG, so the editor is an HTML
  // input laid over the knob rather than a foreignObject — simpler, and it inherits
  // the same styling as every other type-in on the desk.
  const holder = document.createElement('div');
  holder.className = 'panholder';
  holder.append(svg);
  function openPanEditor() {
    if (holder.querySelector('.typein')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein panin';
    box.value = String(Math.round(val * 100));
    holder.append(box); box.focus(); box.select();
    let closed = false;
    const done = (commit) => {
      if (closed) return;          // blur fires after Enter has already removed it
      closed = true;
      const n = parseFloat(box.value);
      box.remove();
      if (commit && Number.isFinite(n)) set(clamp(n / 100, -1, 1));
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  }

  // The knob alone: the caller owns the row, because mute and solo share it.
  return { el: holder, set: (x) => { val = x; draw(); } };
}

/**
 * The same knob, sweeping from one end instead of from the centre.
 *
 * `panKnob` is bipolar because pan is: nothing is the middle, and the arc growing
 * either way from top-dead-centre is the whole reading. An attack time has no middle —
 * it has a floor — so this fills from the left stop, which is the pot on every synth
 * ever built.
 *
 * Returns the same shape `slider` does (`{ wrap, label, set }`), so a caller can swap
 * one for the other without knowing which it has.
 */
function knob({ min, max, step, value, fmt, onInput, reset, scale = 1 }) {
  const NS = 'http://www.w3.org/2000/svg';
  const wrap = document.createElement('div');
  wrap.className = 'row potrow';
  const k = document.createElement('span'); k.className = 'k';
  const holder = document.createElement('div'); holder.className = 'panholder';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', 'panpot vepot');
  const track = document.createElementNS(NS, 'path'); track.setAttribute('class', 'pottrack');
  const arc = document.createElementNS(NS, 'path'); arc.setAttribute('class', 'potarc');
  const face = document.createElementNS(NS, 'circle');
  face.setAttribute('cx', 22); face.setAttribute('cy', 22); face.setAttribute('r', 13);
  face.setAttribute('class', 'potface');
  const text = document.createElementNS(NS, 'text');
  text.setAttribute('x', 22); text.setAttribute('y', 22);
  text.setAttribute('class', 'pottext');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  svg.append(track, arc, face, text);
  holder.append(svg);
  wrap.append(k, holder);

  const SWEEP = 145;                       // degrees either side of top centre
  const R = 18;
  const pt = (deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [22 + Math.cos(a) * R, 22 + Math.sin(a) * R];
  };
  const arcPath = (fromDeg, toDeg) => {
    const [x1, y1] = pt(fromDeg); const [x2, y2] = pt(toDeg);
    const big = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    const sweep = toDeg > fromDeg ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${big} ${sweep} ${x2} ${y2}`;
  };
  track.setAttribute('d', arcPath(-SWEEP, SWEEP));

  // A scale above one gives the low end more physical travel without changing the
  // stored range. Envelope times opt into this shared response; ordinary desk knobs
  // remain linear because their values do not represent elapsed time.
  const curve = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const valueAt = (position) => min + (max - min) * Math.pow(clamp(position, 0, 1), curve);
  const positionAt = (x) => {
    const frac = (max - min) ? clamp((x - min) / (max - min), 0, 1) : 0;
    return Math.pow(frac, 1 / curve);
  };
  let val = clamp(value, min, max);
  let position = positionAt(val);
  const draw = () => {
    const deg = -SWEEP + position * SWEEP * 2;
    // Nothing to draw at the floor — an arc of zero length still paints a round cap,
    // which reads as a value slightly above the minimum rather than as the minimum.
    arc.setAttribute('d', position < 0.004 ? '' : arcPath(-SWEEP, deg));
    text.textContent = fmt(val);
  };
  draw();

  const set = (x) => {
    const stepped = Math.round(x / step) * step;
    val = clamp(Number(stepped.toFixed(6)), min, max);
    position = positionAt(val);
    draw();
    onInput(val);
  };
  const setPosition = (x) => set(valueAt(x));

  let dragging = false, lastX = 0, lastY = 0, moved = 0, fromText = false;
  svg.addEventListener('pointerdown', (e) => {
    if (holder.querySelector('.typein')) return;
    dragging = true; moved = 0; fromText = e.target === text;
    lastX = e.clientX; lastY = e.clientY;
    svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = lastY - e.clientY;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    lastX = e.clientX; lastY = e.clientY;
    // Whichever axis moved more wins, so neither grip feels wrong. A full sweep in
    // about 150px, a fifth of that with shift — the same feel as the desk's faders.
    const px = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    setPosition(position + (px / 150) * (e.shiftKey ? 0.2 : 1));
  });
  const stop = () => {
    if (dragging && fromText && moved < 3) openEditor();
    dragging = false;
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  svg.addEventListener('dblclick', () => set(reset));
  svg.title = 'Drag to change · click the number to type · double-click to reset';

  function openEditor() {
    if (holder.querySelector('.typein')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein panin';
    box.value = String(val);
    holder.append(box); box.focus(); box.select();
    let closed = false;
    const done = (commit) => {
      if (closed) return;            // blur fires after Enter has already removed it
      closed = true;
      const n = parseFloat(box.value);
      box.remove();
      if (commit && Number.isFinite(n)) set(n);
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  }

  // Click the label to reset, the way every slider on the desk does.
  k.classList.add('resettable');
  k.title = `Reset to ${fmt(reset)}`;
  k.addEventListener('click', () => set(reset));

  return { wrap, label: k, set: (x) => { val = clamp(x, min, max); position = positionAt(val); draw(); } };
}

/** A one-line labelled checkbox — a whole row plus a full-width button was three
 *  lines of card height to say one boolean. */
function checkRow(label, checked, onChange) {
  const row = document.createElement('label');
  row.className = 'checkrow';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = !!checked;
  box.onchange = () => onChange(box.checked);
  const t = document.createElement('span');
  t.textContent = label;
  row.append(box, t);
  return row;
}

function effectsOf(key) {
  const mix = mixFor(trackId);
  // The master opens EMPTY — nothing on the bus until you put it there. The seed is
  // read on the way OUT rather than stored, so whatever it is applies to every song,
  // including the ones that already have a saved mix, and no song gains a
  // masterEffects line in mix.js for a chain nobody has touched.
  if (key === '__master') return mix.masterEffects || DEFAULT_MASTER_CHAIN();
  if (key && key.startsWith('__aux:')) return mix.fx?.[key.slice(6)]?.effects || [];
  return mix.lanes[key]?.effects || [];
}

function liveChain(key) {
  if (key === '__master') return Audio.mixer?.masterEffects;
  if (key && key.startsWith('__aux:')) return Audio.mixer?.auxEffects(key.slice(6));
  return Audio.mixer?.lane(key)?.effects;
}

function bypassOn(key, i, on) {
  if (key === '__master') Audio.mixer?.setMasterEffectBypass(i, on);
  else if (key && key.startsWith('__aux:')) Audio.mixer?.setAuxEffectBypass(key.slice(6), i, on);
  else Audio.mixer?.lane(key)?.setEffectBypass(i, on);
}

function targetLabel(key) {
  if (key === '__master') return 'MASTER';
  if (key && key.startsWith('__aux:')) {
    return (AUXES.find((a) => a.id === key.slice(6))?.name || key.slice(6)) + ' return';
  }
  if (pendingAddTrack?.key === key) return pendingAddTrack.label;
  const found = deskLanes(viewBank(), 1).find((l) => l.key === key);
  // A DELETED track has no row and no strip, so it is not in the desk's lane list —
  // and the one place it is still named is the menu that offers to put it back. The
  // engine's own list still knows it, which is what that falls through to.
  return found?.label || cap(LANES.find((l) => l.key === key)?.label) || cap(key);
}

function setEffects(key, list) {
  const bpm = deskTempo();
  // Stored through storeEffects, not beside it: this used to carry its own copy of
  // the same three branches, and the copies disagreed about what an empty master
  // chain means — one wrote it, the other deleted it, and taking the seeded bus
  // compressor off the master came straight back.
  editMix((m) => storeEffects(m, key, list), null);
  if (key === '__master') Audio.mixer?.setMasterEffects(list, bpm);
  else if (key && key.startsWith('__aux:')) Audio.mixer?.setAuxEffects(key.slice(6), list, bpm);
  else Audio.mixer?.lane(key)?.setEffects(list, bpm);
  // Rebuild the rack, not just the summary line: the per-effect bypass buttons live
  // on the strip and have to appear and disappear with the chain.
  buildRack();
}

/**
 * What a dropdown entry reads as. The value is the engine's — a BiquadFilter's type
 * is the string 'lowpass' and nothing else — so the capital goes on at the last
 * moment, on the label alone, and never on what gets stored or sent to the node.
 */
const optionLabel = (s) => String(s).replace(/\b[a-z]/g, (c) => c.toUpperCase());

/**
 * A select row with a live readout, for parameters that are a note division rather
 * than a number — the delay's time, an LFO's rate.
 *
 * Label, select and readout on one line, unlike every other row. The readout used to
 * sit on a head line above the select, which stacked "1.24 Hz" directly on top of
 * "1/4 dotted": two spellings of the same number, one over the other, and a row twice
 * as tall for it. In tempo mode the division is the value, so it gets the line, and
 * what it works out to trails on the right as a reading rather than a second control.
 */
function divisionRow(label, divisions, value, fmt, onChange) {
  const row = document.createElement('div'); row.className = 'row divrow';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  const v = document.createElement('span'); v.className = 'v';
  const sel = document.createElement('select'); sel.className = 'fxsel';
  for (const [name, beats] of Object.entries(divisions)) {
    const o = document.createElement('option');
    o.value = String(beats); o.textContent = optionLabel(name);
    if (Math.abs(beats - value) < 1e-6) o.selected = true;
    sel.append(o);
  }
  const show = () => { v.textContent = fmt(+sel.value); };
  show();
  sel.onchange = () => { show(); onChange(+sel.value); };
  row.append(k, sel, v);
  return row;
}

/** A named choice — a filter's shape, anything else that is a list not a range. */
function optionRow(label, options, value, onChange) {
  const row = document.createElement('div'); row.className = 'row';
  const hd = document.createElement('div'); hd.className = 'head';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  hd.append(k);
  const sel = document.createElement('select'); sel.className = 'fxsel';
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = optionLabel(o);
    if (o === value) opt.selected = true;
    sel.append(opt);
  }
  sel.onchange = () => onChange(sel.value);
  row.append(hd, sel);
  return row;
}

/**
 * The strip's OWN device, pinned as the first card in the panel: a send's delay or
 * its reverb. These used to be rows on the strip itself, where they crowded out the
 * return EQ and still had no room to be read — a note division and a damping
 * frequency need more than 132px of column.
 *
 * It is not an insert: no bypass, no close, no dragging. It is what the strip is.
 */
function pinnedCard(key) {
  const card = document.createElement('div');
  card.className = 'device pinned';
  const bar = document.createElement('div'); bar.className = 'devbar';
  const h = document.createElement('h4');
  const badge = document.createElement('span'); badge.className = 'devbadge'; badge.textContent = 'BUILT IN';
  bar.append(h, badge);
  const grid = document.createElement('div'); grid.className = 'devgrid';
  card.append(bar, grid);

  const def = AUXES.find((a) => a.id === key.slice(6));
  if (!def) return null;
  const cur = fxOf(mixFor(trackId))[def.id];
  h.textContent = def.name;
  const fxSlider = (param, label, opts) => {
    const r = slider({ ...opts, onInput: (x) => editFx(def.id, { [param]: x }, `${def.id}:${param}`) });
    r.label.textContent = label;
    grid.append(r.wrap);
  };

  if (def.type === 'delay') {
    grid.append(divisionRow('TIME', DELAY_DIVISIONS, cur.division,
      // What the line will actually run, not what the division asks for: past a few
      // bars the delay buffer is the limit and the readout should say so.
      (beats) => fmtDelay(syncSeconds(beats, deskTempo())),
      (beats) => editFx(def.id, { division: beats }, `${def.id}:division`)));
    fxSlider('feedback', 'FEEDBACK', {
      min: 0, max: 0.9, step: 0.01, value: cur.feedback,
      reset: AUX_DEFAULTS[def.id].feedback, fmt: (x) => x.toFixed(2),
    });
    fxSlider('tone', 'DAMPING', {
      min: 400, max: 12000, step: 100, value: cur.tone, reset: AUX_DEFAULTS[def.id].tone,
      fmt: (x) => (x >= 1000 ? `${(x / 1000).toFixed(1)}k` : String(x)) + ' Hz',
    });
  } else {
    // Log taper: decay spans 0.1–10s (100×), pre-delay spans 0.001–0.2s (200×).
    // Tiny differences at the short end matter — a 2ms vs 10ms pre-delay is the
    // difference between intimacy and distance.
    const logSliders = (mn, mx) => {
      const toPos = (v) => Math.log(v / mn) / Math.log(mx / mn);
      const fromPos = (p) => mn * Math.pow(mx / mn, p);
      return { toPos, fromPos };
    };
    const decLog = logSliders(0.1, 10);
    fxSlider('decay', 'DECAY', {
      min: 0, max: 1, step: 0.001,
      value: decLog.toPos(cur.decay),
      reset: decLog.toPos(AUX_DEFAULTS[def.id].decay),
      fmt: (pos) => `${decLog.fromPos(pos).toFixed(1)}s`,
      display: {
        format: (pos) => `${decLog.fromPos(pos).toFixed(1)}s`,
        parse: (s) => {
          const n = parseFloat(String(s).replace(/[^0-9.\-+eE]/g, ''));
          return Number.isFinite(n) ? clamp(decLog.toPos(n), 0, 1) : null;
        },
      },
    });
    const preLog = logSliders(0.001, 0.2);
    fxSlider('preDelay', 'PRE-DELAY', {
      min: 0, max: 1, step: 0.001,
      value: preLog.toPos(cur.preDelay || 0.001),
      reset: preLog.toPos(AUX_DEFAULTS[def.id].preDelay),
      fmt: (pos) => `${(preLog.fromPos(pos) * 1000).toFixed(0)}ms`,
      display: {
        format: (pos) => `${(preLog.fromPos(pos) * 1000).toFixed(0)}ms`,
        parse: (s) => {
          const n = parseFloat(String(s).replace(/[^0-9.\-+eE]/g, ''));
          return Number.isFinite(n) ? clamp(preLog.toPos(n / 1000), 0, 1) : null;
        },
      },
    });
    const note = document.createElement('div');
    note.className = 'devnote';
    note.textContent = 'Tone the tail with the return EQ on the strip — that is what a damping '
      + 'control is, and this reverb is a convolution so it has no other.';
    grid.append(note);
  }
  return card;
}

/** Keep the Effects panel header in sync with the selected channel. Notes names a
 *  preset too, but its own one — see syncNotesPanel: Effects is always the selected
 *  strip, the roll is not. */
function updatePanelTitles() {
  renderPresetHeading($('devtitle'), selectedLane);
}

function buildDevices() {
  const rack = $('devrack');
  rack.textContent = '';
  updatePanelTitles();
  if (!selectedLane) {
    return;
  }

  // A send's delay or reverb comes first: it is what the strip IS, and the inserts
  // are things you put in front of it. The master has no card of its own — its
  // limiter is a button under the fader, where nothing about the rack can put it
  // anywhere but last.
  const pinned = selectedLane.startsWith('__aux:') ? pinnedCard(selectedLane) : null;
  if (pinned) rack.append(pinned);

  const list = effectsOf(selectedLane);
  if (!list.length) {
    rack.append(addCard(true));
    fitDevices();
    return;
  }

  let dragFrom = null;
  rack.addEventListener('dragover', (e) => e.preventDefault());

  list.forEach((entry, i) => {
    const def = EFFECT_BY_ID[entry.id];
    const card = document.createElement('div');
    card.className = 'device' + (entry.bypass ? ' bypassed' : '');
    // Draggable only while the pointer went down on the title bar. With the whole
    // card draggable, dragging a slider inside it started a card drag instead —
    // the control and the container were fighting for the same gesture.
    card.draggable = false;
    card.dataset.idx = String(i);

    const bar = document.createElement('div');
    bar.className = 'devbar';
    const byp = document.createElement('button');
    byp.className = 'devtoggle' + (entry.bypass ? '' : ' on');
    byp.append(powerIcon());
    byp.title = entry.bypass ? 'Enable this effect' : 'Bypass this effect';
    byp.onclick = () => {
      const next = list.map((e, j) => (j === i ? { ...e, bypass: !e.bypass } : e));
      editMix((m) => storeEffects(m, selectedLane, next), null);
      bypassOn(selectedLane, i, !entry.bypass);
      buildRack();
    };
    const h = document.createElement('h4');
    h.textContent = def ? def.name : entry.id;
    const close = document.createElement('button');
    close.className = 'devclose';
    close.append(closeIcon());
    close.title = `Remove ${def ? def.name : entry.id} from this chain`;
    close.onclick = () => {
      setEffects(selectedLane, list.filter((_, j) => j !== i));
      toast(`${def ? def.name : entry.id} removed`);
    };
    bar.append(byp, h, close);
    bar.title = 'Drag here to reorder';
    bar.addEventListener('mousedown', (ev) => {
      if (ev.target.closest('button')) return;
      card.draggable = true;
    });
    addEventListener('mouseup', () => { card.draggable = false; }, { once: true });
    card.append(bar);
    const grid = document.createElement('div');
    grid.className = 'devgrid';
    card.append(grid);
    card.addEventListener('dragstart', (e) => {
      dragFrom = i;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      // Firefox will not start a drag without payload.
      e.dataTransfer.setData('text/plain', String(i));
    });
    card.addEventListener('dragend', () => {
      dragFrom = null; card.classList.remove('dragging'); card.draggable = false;
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (dragFrom == null || dragFrom === i) return;
      card.classList.add('dropzone');
    });
    card.addEventListener('dragleave', () => card.classList.remove('dropzone'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('dropzone');
      if (dragFrom == null || dragFrom === i) return;
      const next = list.slice();
      const [moved] = next.splice(dragFrom, 1);
      next.splice(i, 0, moved);
      dragFrom = null;
      setEffects(selectedLane, next);
      toast(`${moved.id} moved to position ${i + 1}`);
    });

    const entryParams = { ...(def?.defaults || {}), ...(entry.params || {}) };
    // Guarded on the effect actually HAVING a tempo switch, not just on the value of
    // one. `sync` defaults to on, so an effect with a free millisecond time and no
    // switch to sync it — the Doubler — read as "synced" and had its TIME row silently
    // skipped, leaving a control that existed everywhere except on screen.
    const hasSync = (def?.params || []).includes('sync');
    const synced = hasSync && (entryParams.sync ?? 1) >= 0.5;
    const patch = (p, tag) => {
      const next = list.map((e, j) => (j === i ? { ...e, params: { ...(e.params || {}), ...p } } : e));
      const link = liveChain(selectedLane)?.[i];
      if (link) link.set(p, deskTempo());
      editMix((m) => storeEffects(m, selectedLane, next), tag);
      list[i] = next[i];
    };

    // Delay time is either a note division or free milliseconds, and a modulation rate
    // either a division or a free frequency; show whichever mode is active rather than
    // both. The rule is in effects.js beside the catalogue it reads — it has to know
    // which switches an effect HAS, not just what they are set to, and getting that
    // wrong here once cost the Doubler its TIME row on screen.
    for (const pname of visibleParams(def, entryParams)) {
      const rateSynced = (entryParams.rateSync ?? 0) >= 0.5;
      if (pname === 'rateSync') {
        grid.append(checkRow('Tempo Mode', rateSynced,
          (on) => { patch({ rateSync: on ? 1 : 0 }, null); buildDevices(); }));
        continue;
      }
      if (pname === 'rateDivision') {
        grid.append(divisionRow('RATE', RATE_DIVISIONS, entryParams.rateDivision ?? 1,
          // No space before the unit, as fmtDelay has it: on one line beside the
          // select the reading is fighting for its width, and "1/16 triplet" is
          // the wider thing to keep.
          (beats) => `${(deskTempo() / (60 * beats)).toFixed(2)}Hz`,
          (beats) => patch({ rateDivision: beats }, `fx:${selectedLane}:${i}:rate`)));
        continue;
      }
      if (pname === 'sync') {
        grid.append(checkRow('Tempo Mode', synced,
          (on) => { patch({ sync: on ? 1 : 0 }, null); buildDevices(); }));
        continue;
      }
      if (pname === 'division') {
        grid.append(divisionRow('TIME', SYNC_DIVISIONS, entryParams.division ?? 0.5,
          (beats) => fmtDelay(syncSeconds(beats, deskTempo())),
          (beats) => patch({ division: beats }, `fx:${selectedLane}:${i}:div`)));
        continue;
      }
      // An effect can override a shared range — `frequency` is an LFO rate on a
      // tremolo and a cutoff on a filter, and one range cannot be both.
      const rng = paramRange(pname, def);
      // Anything a range calls a toggle gets a box. The two tempo switches above are
      // handled by name because they also decide which OTHER rows are drawn; this is
      // for the plain ones, where on and off is the whole of it.
      if (rng.toggle) {
        grid.append(checkRow(paramLabel(pname),
          (entryParams[pname] ?? def.defaults?.[pname] ?? 0) >= 0.5,
          (on) => patch({ [pname]: on ? 1 : 0 }, null)));
        continue;
      }
      if (rng.options) {
        grid.append(optionRow(paramLabel(pname), rng.options,
          entryParams[pname] ?? rng.options[0],
          (v) => patch({ [pname]: v }, null)));
        continue;
      }
      const val = entryParams[pname] ?? rng.min;
      // Log taper for parameters that span a wide ratio (frequency, attack, etc.).
      // The slider stores a 0–1 position; the displayed value follows a log curve
      // so tiny adjustments at the low end are as easy to reach as big ones at the top.
      const useLog = rng.log && rng.min > 0;
      const logToPos = (v) => Math.log(v / rng.min) / Math.log(rng.max / rng.min);
      const logFromPos = (p) => rng.min * Math.pow(rng.max / rng.min, p);
      const unitFmt = (x) => (rng.unit === 'Hz' && x >= 1000 ? (x / 1000).toFixed(1) + 'k'
        : rng.unit === 's' ? (x * 1000).toFixed(0) + 'ms'
        : x.toFixed(rng.step >= 1 ? 0 : 2)) + (rng.unit && rng.unit !== 's' ? ' ' + rng.unit : '');
      const row = slider({
        min: useLog ? 0 : rng.min,
        max: useLog ? 1 : rng.max,
        step: useLog ? 0.001 : rng.step,
        value: useLog ? logToPos(val) : val,
        reset: useLog ? logToPos(def.defaults[pname] ?? rng.min) : (def.defaults[pname] ?? rng.min),
        fmt: (x) => unitFmt(useLog ? logFromPos(x) : x),
        display: useLog ? {
          format: (pos) => unitFmt(logFromPos(pos)),
          parse: (s) => {
            const n = parseFloat(String(s).replace(/[^0-9.\-+eE]/g, ''));
            return Number.isFinite(n) ? clamp(logToPos(n), 0, 1) : null;
          },
        } : undefined,
        // Update the live node directly; a full chain rebuild on every drag would
        // retrigger LFOs and click.
        onInput: (x) => patch({ [pname]: useLog ? logFromPos(x) : x }, `fx:${selectedLane}:${i}:${pname}`),
      });
      row.label.textContent = paramLabel(pname);
      grid.append(row.wrap);
    }

    rack.append(card);
  });
  rack.append(addCard());              // the next slot, at the end of the chain
  fitDevices();
}

/**
 * The panel's height, reserved ONCE for the tallest card the catalogue can produce.
 *
 * It used to be reserved for the tallest card it had happened to show so far, which
 * meant the panel — and the whole rack sitting on top of it — moved a few pixels
 * every time you opened a channel whose effect was taller than anything you had
 * clicked yet. Cards run from two controls (the Gain) to 174px (the Advanced Delay),
 * so that is a lot of small jumps before a session settles down.
 *
 * Only ever four rows tall, however long the list: the grid flows into extra COLUMNS
 * past four, so the Multiband Compressor's seventeen controls make a wide card and
 * not a tall one, and the reserved height still holds.
 *
 * Measured rather than written down: row heights move with the typeface, so a
 * constant would clip the tallest card in one font and waste a band of window in
 * another. The probe is the worst shape a card can take — a grid flows into a second
 * column past four rows, and the tallest row is the one stacking a full-width select
 * under its label. That is optionRow, not divisionRow: a division now puts its label,
 * select and readout on one line, so probing with it under-reserves by a row's worth
 * of height on every card and leaves fitDevices to grow the panel a step at a time,
 * which is the jumping this exists to stop.
 */
function reserveDevices() {
  const probe = document.createElement('div');
  probe.className = 'device';
  probe.style.cssText = 'position:absolute; visibility:hidden; left:-9999px; top:0';
  const bar = document.createElement('div');
  bar.className = 'devbar';
  const title = document.createElement('h4');
  title.textContent = 'Probe';
  bar.append(title);
  const grid = document.createElement('div');
  grid.className = 'devgrid';
  for (let i = 0; i < 4; i++) {
    grid.append(optionRow('SHAPE', ['lowpass'], 'lowpass', () => {}));
  }
  probe.append(bar, grid);
  document.body.append(probe);
  // The cards' own height, plus a few pixels so the bottom border isn't flush
  // against the panel edge. The header is added separately in effectsNaturalHeight.
  const need = Math.ceil(h(probe) + 6);
  probe.remove();
  // Recorded as what the cards ASK for, not written to --devh. The planner clamps
  // it against the room actually available and against a dragged height, so the
  // measurement and the layout can no longer arrive at two different answers and
  // overwrite each other — which is what capDevices() used to referee, by reading
  // the panel's live height and making each fit depend on the previous one.
  autoDevH = need;
  fitStrips();
}

/**
 * The reserve is the height in all but exceptional cases; this is the guard for the
 * card that outgrows it anyway — a future effect with taller rows than the probe.
 * It only ever grows the ASK, and the planner still clamps that against the room
 * available, so it cannot take height off the rack on a short screen.
 */
function fitDevices() {
  requestAnimationFrame(() => {
    // A dragged height is a deliberate answer about how much of the shelf to see;
    // do not grow it behind the user's back when a taller card is opened.
    if (userFxH != null) return;
    // Folded, the rack is display:none and every card measures zero — a measurement
    // taken there would hand the panel back a height of nothing to unfold into.
    if ($('devices').classList.contains('collapsed')) return;
    const rack = $('devrack');
    const cards = [...rack.children].filter((c) => c.classList.contains('device'));
    if (!cards.length) return;
    // The cards are stretched to a common height, so their measured height is the
    // panel's, not their own. Let them stand up for one measurement to find out how
    // tall the tallest actually needs to be.
    rack.style.alignItems = 'flex-start';
    const tallest = Math.max(...cards.map(h));
    rack.style.alignItems = '';
    const need = Math.ceil(tallest + 6);
    if (need > autoDevH) {
      autoDevH = need;
      fitStrips();
    }
  });
}

// The catalogue, grouped for the picker. Anything a future effect adds that is not
// listed here still shows up, under Other — a new effect appearing nowhere would be
// a worse bug than one appearing in the wrong column.
const EFFECT_GROUPS = [
  ['Level & EQ', ['gain', 'peq', 'filter']],
  ['Delay', ['chandelay', 'delay', 'pingpong']],
  ['Modulation', ['chorus', 'phaser', 'tremolo', 'vibrato', 'autofilter', 'autowah', 'autopanner']],
  ['Drive', ['exciter', 'distortion', 'chebyshev']],
  ['Space & stereo', ['reverb', 'doubler', 'widener', 'shifter', 'pitch']],
  ['Dynamics', ['l7', 'compressor', 'msComp', 'mbComp']],
];

function addEffect(id, at = null) {
  if (!id || !selectedLane) return;
  const cur = effectsOf(selectedLane);
  if (cur.length >= MAX_EFFECTS) {
    toast(`${MAX_EFFECTS} effects is the limit on one strip — remove one first`);
    return;
  }
  const next = [...cur];
  if (at == null) next.push({ id, params: {} });
  else next.splice(clamp(at, 0, next.length), 0, { id, params: {} });
  setEffects(selectedLane, next);
  toast(`${EFFECT_BY_ID[id].name} added to ${targetLabel(selectedLane)}`);
}

// One effect's settings, for copying onto another of the same kind. Separate from
// the strip clipboard: a Parametric EQ you have dialled in is worth moving on its
// own, without the channel it happens to sit on.
let fxClipboard = null;

/** The effect catalogue as a panel: grouped, and priced with its measured cost. */
function openPicker({ at = null, anchor = null, x = null, y = null } = {}) {
  const el = $('fxpicker');
  el.textContent = '';
  const placed = new Set();
  const column = (title, ids) => {
    const list = ids.map((id) => EFFECT_BY_ID[id]).filter(Boolean);
    if (!list.length) return;
    const g = document.createElement('div');
    g.className = 'fxgroup';
    const h5 = document.createElement('h5');
    h5.textContent = title;
    g.append(h5);
    for (const def of list) {
      placed.add(def.id);
      const b = document.createElement('button');
      const n = document.createElement('span');
      n.textContent = def.name;
      const c = document.createElement('span');
      c.className = 'cost';
      c.textContent = `${(def.cost ?? 0).toFixed(2)}%`;
      b.append(n, c);
      b.title = `${def.name} — about ${(def.cost ?? 0).toFixed(2)}% of one core each`;
      b.onclick = () => { closeMenu(); addEffect(def.id, at); };
      g.append(b);
    }
    el.append(g);
  };
  for (const [title, ids] of EFFECT_GROUPS) column(title, ids);
  column('Other', EFFECTS.filter((e) => !placed.has(e.id)).map((e) => e.id));

  el.classList.add('show');
  // Anchored to the button, pinned inside the window: the panel is wider than the
  // gap between the button and the right-hand edge.
  // Where the pointer is, when the pointer is what opened it; otherwise above the
  // button that did. Either way it is pulled back inside the window.
  const r = el.getBoundingClientRect();
  const from = (anchor || $('devrack')).getBoundingClientRect();
  const left = x != null ? x : from.right - r.width;
  const top = y != null ? y : from.top - r.height - 6;
  el.style.left = `${Math.max(6, Math.min(left, innerWidth - r.width - 6))}px`;
  el.style.top = `${Math.max(6, Math.min(top, innerHeight - r.height - 6))}px`;
}

/**
 * The empty slot at the end of a chain: click it to add the next effect.
 *
 * `first` is the empty rack — nothing added yet, so the square is alone in the panel
 * and wears its plus faintly rather than waiting for the pointer to find it.
 */
function addCard(first = false) {
  const btn = document.createElement('button');
  btn.className = `devaddcard${first ? ' first' : ''}`;
  const full = effectsOf(selectedLane).length >= MAX_EFFECTS;
  btn.disabled = full;
  btn.title = full ? `${MAX_EFFECTS} effects is the limit on one strip`
    : `Add an effect to ${targetLabel(selectedLane)}`;
  btn.onclick = (ev) => {
    ev.stopPropagation();
    if (btn.disabled) return;
    if ($('fxpicker').classList.contains('show')) { closeMenu(); return; }
    closeMenu();
    openPicker({ anchor: btn, x: ev.clientX, y: ev.clientY });
  };
  return btn;
}
/**
 * Every panel boundary is a real resize edge: Timeline/Arrangement, Arrangement/
 * Notes, Notes/Mixer and Mixer/Effects. Their hit areas stay active even when one
 * side is folded, so dragging can reopen that side. The Mixer is the flexible region
 * that gives up space first.
 *
 * The element a hit area hangs off is the panel BELOW the border, not the one being
 * resized: #notes draws the Arrangement's bottom edge and #mixhead draws the Notes
 * panel's. That is why the two drag handlers look swapped relative to their names.
 */
function syncPanelResizeEdges() {
  $('timeline').classList.add('edge-resizable');
  $('mixhead').classList.add('edge-resizable');
  $('notes').classList.add('edge-resizable');
  $('devices').classList.add('edge-resizable');
}

// Folded or not survives a reload, like the Mixer's fold and the panel heights.
const FX_FOLD_KEY = 'mash-mixer-fx-folded';
function setDevicesFolded(on, refit = true) {
  const changed = $('devices').classList.contains('collapsed') !== on;
  $('devices').classList.toggle('collapsed', on);
  $('devfold').classList.toggle('folded', on);
  $('devfold').title = on ? 'Show the effects panel' : 'Collapse the effects panel';
  syncPanelResizeEdges();
  // Only on a real change — the border drag calls this on every pointermove.
  if (changed) localStorage.setItem(FX_FOLD_KEY, on ? '1' : '0');
  if (refit) scheduleDeskFit(true);
}

$('devfold').onclick = () => setDevicesFolded(!$('devices').classList.contains('collapsed'));
setDevicesFolded(localStorage.getItem(FX_FOLD_KEY) === '1', false);



function selectLane(key) {
  selectedLane = key;
  localStorage.setItem(LANE_KEY, key);
  for (const el of document.querySelectorAll('.strip[data-lane]')) {
    el.classList.toggle('selected', el.dataset.lane === key);
  }
  // The editor's wrapper draws the selected outline for the strip inside it, so it has
  // to follow the selection too — set once when the pair was built, it stayed lit after
  // the selection moved on.
  const chosenStrip = document.querySelector('.strip[data-lane].selected');
  for (const pair of document.querySelectorAll('.voicepair')) {
    pair.classList.toggle('selected', !!chosenStrip && pair.contains(chosenStrip));
  }
  for (const el of document.querySelectorAll('.arrrow')) {
    el.classList.toggle('sel', el.dataset.lane === key);
  }
  // Do not leave the previous lane's playback accent behind until the next beat
  // after selection moves; the selected-only cue should change immediately.
  clearArrangementPlayback();
  buildDevices();
  // Drums or pitched decides whether there is a roll in the panel at all. Before the
  // refresh below, so a roll on its way out is not repainted first.
  syncNotesPanel();
  // The roll is scoped through lane(), so changing the strip selection must repaint it
  // immediately while it is open. Without this, the panel header follows the click but
  // the roll keeps the previous lane's rows and notes until another roll gesture occurs.
  // Not while it is off screen: a hidden roll paints nothing, and the fit it would take
  // from the drum channel it is standing in for is a window onto the wrong part.
  if (notesRollUp()) pianoRoll.refresh();
  // The Notes panel is this channel's part, so moving the selection redraws the roll.
  // The roll's own `lane()` already follows the selection; the panel stays open at
  // whatever fold state the user left it in.
  // The keyboard plays the SELECTED channel, so it follows the selection — new keys,
  // in the octave the new channel's part is written in.
  refreshOsk();
}

// ---- arrangement -----------------------------------------------------------
// One row per instrument, one cell per bar, shaded by how busy that bar is. This
// is the answer to "there is a lane called crash but I have no idea where it
// sounds" — you can see it, and click straight to it.
let arrCells = [];
// What you picked in the grid — a lane and a RANGE of bars. `from` and `to` are the
// same bar for a plain click, which is what every gesture that predates ranges still
// produces, so the one-bar case needed no special handling anywhere.
//
// The timeline owns the song-range selection. A lane key is added only when an
// arrangement row is the current target for lane-specific actions; the range itself
// remains the same selection in both places.
let selectedBar = null;
let arrangementClipboard = null;

const selFrom = () => (selectedBar ? Math.min(selectedBar.from, selectedBar.to) : 0);
const selTo = () => (selectedBar ? Math.max(selectedBar.from, selectedBar.to) : 0);
const selWidth = () => (selectedBar ? selTo() - selFrom() + 1 : 0);

let selectionEditorsDirty = false;
let selectionRefreshIdle = 0;

function paintSelectionEditors() {
  selectionEditorsDirty = false;
  stepSeq.refresh();
  pianoRoll.refresh();
}

function scheduleSelectionEditors() {
  selectionEditorsDirty = true;
  if (!playing) {
    paintSelectionEditors();
    return;
  }
  // A large piano roll or drum grid can take longer than the audio lookahead. Let
  // the browser paint it only when there is idle time; playback remains authoritative
  // and the timeline/loop overlay already show the new selection immediately.
  if (typeof requestIdleCallback !== 'function' || selectionRefreshIdle) return;
  selectionRefreshIdle = requestIdleCallback(() => {
    selectionRefreshIdle = 0;
    if (selectionEditorsDirty) paintSelectionEditors();
  });
}

function flushSelectionEditors() {
  if (selectionRefreshIdle && typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(selectionRefreshIdle);
  }
  selectionRefreshIdle = 0;
  if (selectionEditorsDirty) paintSelectionEditors();
}

function markBar(key, from, to = from) {
  selectedBar = from != null ? { key: key ?? null, from, to: to ?? from } : null;
  syncLoopButton();
  if (loopOn) {
    const bounds = currentLoopBounds();
    if (playing && bounds && Audio.loopStart != null && Audio.loopEnd != null) {
      // Keep the current bar intact. The audio engine swaps to the newest selection
      // at the next bar line, so selecting bars mid-playback never cuts a bar in half
      // or jumps into the middle of the newly selected range.
      pendingSeekStep = null;
      $('selregion').classList.remove('pending');
      Audio.setLoopAtBoundary(bounds.start, bounds.end);
      pendingLoopAnchor = { start: bounds.start, end: bounds.end };
      $('loopregion').classList.add('pending');
    } else {
      applyLoop();
    }
  }
  redrawSelection();
  // The grid shows the selection, so selecting bars IS how you choose what it shows —
  // one bar or eight, without a control of its own.
  scheduleSelectionEditors();
  // The piano roll is a whole-song view, so its last scroll position can be nowhere
  // near the bar just selected. Keep the selection visible on both axes; a large
  // range is centred by the roll rather than pretending the whole thing can fit.
  pianoRoll.focusRange(selFrom(), selTo());
}

/**
 * Paint the current selection onto rows that have just been rebuilt.
 *
 * Separate from `markBar` because the two are different questions — "select this"
 * and "the DOM is new, put the selection back" — and folding them into one function
 * with defaulted arguments is how a rebuild silently collapsed a range to its first
 * bar every time the grid was redrawn.
 */
function redrawSelection() {
  for (const el of document.querySelectorAll('.arrbar.sel')) el.classList.remove('sel');
  if (!selectedBar) { drawSelRegion(); return; }
  // The range is marked on the lane you dragged in, because that is the lane the
  // menu's per-lane items will act on. Everything else about the range — delete,
  // duplicate, silence — is the whole song, and the timeline band says so.
  const row = selectedBar.key == null ? null
    : document.querySelector(`.arrrow[data-lane="${CSS.escape(selectedBar.key)}"]`);
  const cells = row?.querySelectorAll('.arrbar');
  if (cells) for (let b = selFrom(); b <= selTo(); b++) cells[b]?.classList.add('sel');
  drawSelRegion();
}

/**
 * The selection as a band on the timeline, in the same percentages the loop region
 * uses. A range picked in the grid is a range of the SONG, so it belongs on the ruler
 * as well as in the rows — that is where you read bar numbers.
 */
function drawSelRegion() {
  const el = $('selregion');
  if (!el) return;
  const total = songShape().bars.length;
  if (!selectedBar || !total) { el.classList.remove('show'); return; }
  el.classList.add('show');
  el.style.left = `${(selFrom() / total) * 100}%`;
  el.style.width = `${(selWidth() / total) * 100}%`;
}

// ---- editing the arrangement -------------------------------------------------
//
// Every other edit on this desk is about BALANCE. These are about the song's SHAPE:
// which bars play, in what order, with what dropped out of them — the build-up and
// breakdown move that was hand-typed into `order` arrays until now.
//
// The editor works in bars (`tools/lib/arrangement-edit.js`), the file stores an
// order, and the conversion between them happens on the way in and out. Nothing here
// touches a composition file: an edit lands in `src/data/arrangements.js`, and
// deleting that entry puts the song back exactly as it was written.

/**
 * The song's OWN bank — layer lanes rewritten in, but the arrangement NOT applied.
 *
 * This is the bank the editing seam works against, and the distinction from
 * `viewBank()` is load-bearing. `applyArrangement` appends an entry's layer sections
 * onto `bank.sections`, and a draft built against that counts them twice: `sec` then
 * addresses a list one longer than the file will have, the saved order points one
 * past the end, and the bar falls back to the bare bank with the previous edit's
 * notes gone. Only the SECOND edit to a song shows it, so it stayed invisible for as
 * long as nothing wrote notes.
 *
 * `viewBank()` is still what everything that DRAWS the song wants — it is the song as
 * it now plays. This is the song as it is written, which is what an edit is relative to.
 */
const editBank = () => deskBank(track?.bank, mixFor(trackId));

/** This song as an editable bar list, built from whatever is in force for it. */
const arrDraftOf = () => draftOf(editBank(), arrFor(trackId));

/**
 * Take an edited bar list and make it true — in the draft, in the engine, and on
 * screen, in that order.
 *
 * The engine is handed the whole arrangement rather than a diff, and takes it
 * WITHOUT stopping: `setArrangement` swaps the order and drops the memoised plan,
 * leaving the transport where it is. You hear the change from the next bar, which is
 * the only way to judge a build-up — stopping the song to audition an edit to the
 * song is how you lose the thing you were listening for.
 *
 */
function applyArrangementEdit(next, what, {
  undo: undoable = true, atStep = null, undoTag = null,
  render = true, persist = true, rearmLoop = true,
} = {}) {
  if (next?.refused) { toast(next.refused); return false; }
  // A painted note can introduce a drum lane the original song did not contain.
  // Remember the lane set so that edit gets a strip immediately, while ordinary
  // note moves avoid tearing down and rebuilding every control on the desk.
  const lanesBefore = render ? deskLanes(viewBank(), 1).map((l) => l.key).join('\0') : null;
  // `null` never coalesces, which is right for a gesture that ends — a drawn note, a
  // pasted clip. A performance has no ending, so recording tags its writes and the run
  // of them collapses into the one snapshot `pushUndo` already knows how to make.
  if (undoable) pushUndo(undoTag);
  // The song's own bank, not the arranged one — see `editBank`. Compaction counts
  // `bank.sections` to number the layer, so handing it the arranged bank writes an
  // index past the end of the list the file will actually have.
  const entry = entryOf(editBank(), next);
  const issues = arrangementIssues(track.bank, entry, deskLanes(editBank(), 1).map((l) => l.key));
  if (issues.length) {
    // Refused rather than written: an unplayable arrangement is silence with a
    // playhead running through it, and the desk should say so while there is still
    // something to undo it from.
    toast(`That edit would not play — ${issues[0]}`, 6000);
    undo();
    return false;
  }
  arrDraft[trackId] = entry;
  if (persist) localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
  bankCache.sig = null;                       // the song's shape changed under it
  Audio.setArrangement(entry);
  // When playback is stopped, Audio.setArrangement only stores the patch because
  // there is no live bank to swap. Keep the stopped desk's audition/keyboard bank in
  // step as well; otherwise a mute appears in the grid but the next note audition
  // still comes from the pre-edit arrangement. Playing uses the gap-free swap above.
  if (!playing) applyToEngine(mixFor(trackId));
  if (render) {
    const lanesAfter = deskLanes(viewBank(), 1).map((l) => l.key).join('\0');
    buildTimeline();
    if (lanesAfter !== lanesBefore) rebuildForShape();
    else buildArrangement();
  }
  // `atStep` is which bar the loop should re-arm from, and it matters as soon as an
  // edit can land while the song is running. `applyLoop` snaps to the bar containing
  // the step it is given, so re-arming from `Audio.step` moves a multi-bar loop forward
  // whenever the scheduler happens to be past its first bar — a two-bar loop written
  // into during its second bar comes back as bars 2-3. A caller that knows the loop
  // did not move says so by passing `loopAnchor`.
  if (rearmLoop) applyLoop(atStep != null ? atStep : Audio.step);
  if (render) updateStatus();
  if (what) toast(`${what} — ⌘Z to undo`);
  return true;
}

/**
 * The step grid.
 *
 * It edits notes rather than shape, but it lands in the same place: a note edit is a
 * layer section on the arrangement, so it goes through `applyArrangementEdit` like a
 * build-up does and inherits undo, the A/B, Save and Revert without knowing they exist.
 *
 * The bars it shows are the SELECTION — the same rule `barMenu` follows, so "select
 * four bars, right-click, build up" and "select four bars and paint a fill" are the
 * same gesture with two endings. With nothing selected it shows the bar being played,
 * so opening it mid-loop lands you where you are listening.
 */
const stepSeq = createStepSeq({
  el: $('stepseq'),
  Audio,
  bank: () => viewBank(),
  editBank: () => editBank(),
  draft: () => arrDraftOf(),
  sel: () => {
    if (selectedBar) return { from: selFrom(), to: selTo() };
    const bars = songShape().bars.length;
    const b = bars ? Math.floor((Audio.step || 0) / 16) % bars : 0;
    return { from: b, to: b };
  },
  apply: (next, what) => applyArrangementEdit(next, what),
  laneColour,
  engineBank: () => engineBank(),
  toast,
  // The same row order and numbering the arrangement rows carry, so the two lists
  // read as one list rather than two opinions about the kit.
  kitLanes: () => deskLanes(viewBank(), 1).map((l) => l.key),
  laneNumber: (key) => laneNumbers.get(key),
  laneLabel: (key) => presetHeadingFor(key).name,
  addInstrument: () => addPercussionLane(),
  menu: (x, y, title, items) => { closeMenu(); openMenu(x, y, title, items); },
  // Closed from its own × as well as from the button, so the button is told rather
  // than assumed — the same reason `showOsk` sets the class instead of toggling it.
  onClose: () => { $('seqbtn').classList.remove('on'); rememberSongLayout(); },
});

// The roll follows the SELECTED CHANNEL. It had its own `rollLane` while it was a window
// of its own — a strip click yanking a floating panel would have been two things fighting
// — but it lives in that channel's panel now, under a header naming the channel, and
// directly above the rack whose selected strip is doing the choosing. Not following
// would be the odd behaviour.
//
// The panel sits between the arrangement and the mixer because it is driven from both:
// openNoteEditor() enters it by double-clicking an arrangement cell, and the strip
// selection below scopes it. It used to sit under the rack, next to that channel's
// effects, which grouped it with a panel that does not drive it and put the whole rack
// between the roll and the double-click that opens it.
const rollLanes = () => deskLanes(viewBank(), 1).map((l) => l.key).filter(rollEditable);

// Which part the roll is actually showing. A drum channel has no roll, so the selection
// falls through to the first melodic lane — and the region's caption has to name what is
// on screen rather than what is selected, so both read this one function.
function rollShownLane() {
  const sel = selectedLane && !selectedLane.startsWith('__') && rollEditable(selectedLane)
    ? selectedLane : null;
  return sel || rollLanes()[0] || 'lead';
}

const pianoRoll = createPianoRoll({
  el: $('pianoroll'),
  Audio,
  bank: () => viewBank(),
  editBank: () => editBank(),
  draft: () => arrDraftOf(),
  sel: () => {
    if (selectedBar) return { from: selFrom(), to: selTo() };
    const bars = songShape().bars.length;
    const b = bars ? Math.floor((Audio.step || 0) / 16) % bars : 0;
    return { from: b, to: b };
  },
  apply: (next, what) => applyArrangementEdit(next, what),
  laneColour,
  engineBank: () => engineBank(),
  // The channel is chosen on the desk. The roll shows whichever one is selected and no
  // longer offers a picker of its own, so there is nothing to tell the desk back.
  lane: rollShownLane,
  laneLabel: (key) => presetHeadingFor(key).name,
  // The key, shared with the on-screen keyboard rather than copied: see the note on
  // `scale` in mixer-piano-roll.js. Read-only — the keyboard is where it is chosen.
  scale: () => ({ root: oskScaleRoot, id: oskScaleId }),
  // The desk's own toast, so choosing a mouse mode says what that mode now does.
  toast: (msg) => toast(msg),
  // No button of its own to un-light: the notes panel's fold button is what says
  // whether the roll is up.
  onClose: () => rememberSongLayout(),
});

// ---- the bottom row's two panels ------------------------------------------------
//
// Effects and Notes are now independent, side-by-side panels. Each folds on its
// own, and either panel's border lets you give more room to the panel you are working
// on. The kit's step grid remains a floating window — it belongs to the song, not to a
// channel.

/**
 * Put the roll away, or bring it back, for the channel that is now selected.
 *
 * Two things move together: the roll itself, and the preset named in the header. They
 * are one function because they answer the same question — what part is on screen —
 * and a header naming a preset with no roll under it is the bug this replaced.
 *
 * Nothing about the LAYOUT moves. Neither the fold nor the panel's height is touched:
 * the panel is the same box either way, empty while the selection has no part for it,
 * and the desk around it does not shift when you click from a drum strip to a melodic
 * one. Both of those are also why this can run on every selection change.
 */
function syncNotesPanel() {
  const hide = laneHidesRoll(selectedLane);
  const changed = $('notes').classList.contains('rollless') !== hide;
  $('notes').classList.toggle('rollless', hide);
  // What is ON THE ROLL, not what is selected: with the master selected the roll still
  // shows a lane, and the caption has to name the part you are looking at.
  $('notepreset').textContent = hide ? '' : presetHeadingFor(rollShownLane()).name;
  if (!changed || hide) return;
  // Coming back. The roll's window has to be re-fitted to the part whatever lane this
  // is: hiding the panel took its scroll position with it, so an unfitted roll opens
  // at the top of the keyboard — C8, with the part four octaves below the field. The
  // fit is keyed on the lane CHANGING, and coming back to the lane you left is not a
  // change, which is exactly the trip that was landing on C8. See forgetFit.
  pianoRoll.forgetFit();
  // And the roll may never have been built at all, or was left unbuilt while the panel
  // had nothing to show. Same idle-time build the fold uses.
  schedulePianoRollOpen();
}

/** Fold or unfold the notes (piano roll) panel. */
function setNotesFolded(on, refit = true) {
  const hasRoll = !laneHidesRoll(selectedLane);
  const needsBuild = !on && !pianoRoll.isOpen() && hasRoll;
  // Unfolding a roll that is already built. The fold hides it with `display: none`,
  // which takes the scroll position with it, and the lane has not changed, so nothing
  // would fit the window again — it came back at the top of the keyboard. Same trip
  // and same fix as the rollless one in syncNotesPanel. Only on a real fold change:
  // the border drag calls this on every pointermove, and a refresh per move would be
  // a rebuild of the whole roll per frame.
  const reopening = !on && !needsBuild && hasRoll && pianoRoll.isOpen()
    && $('notes').classList.contains('collapsed');
  $('notes').classList.toggle('collapsed', on);
  $('notefold').classList.toggle('folded', on);
  $('notefold').title = on ? 'Show the notes panel' : 'Collapse the notes panel';
  $('rollbtn').classList.toggle('on', !on);
  syncPanelResizeEdges();
  if (refit) {
    scheduleDeskFit(true);
  }
  if (needsBuild) {
    // A song can restore with Notes folded, in which case loadTrack deliberately did
    // not build the roll. Do that work after the fold/layout task, not inside the click
    // handler that is competing with the audio scheduler.
    schedulePianoRollOpen();
  } else if (reopening) {
    pianoRoll.forgetFit();
    pianoRoll.refresh();
  }
}

let pianoRollOpenPending = 0;
function schedulePianoRollOpen() {
  if (pianoRollOpenPending) return;
  const run = () => {
    pianoRollOpenPending = 0;
    // Nothing to build for a channel that has no roll — and building one would paint
    // some other lane's part into a hidden panel, ready to flash up on the next fold.
    if (!notesRollUp() || pianoRoll.isOpen()) return;
    pianoRoll.open(true);
  };
  if (typeof requestIdleCallback === 'function') {
    pianoRollOpenPending = requestIdleCallback(run, { timeout: 250 });
  } else {
    pianoRollOpenPending = setTimeout(run, 0);
  }
}

$('notefold').onclick = () => {
  setNotesFolded(!$('notes').classList.contains('collapsed'));
  // Notes is the one fold that belongs to the song rather than to the desk — the roll
  // you were editing is context for that melody. pagehide records it eventually; do it
  // on the click so a crash or a hard reload does not lose the fold.
  rememberSongLayout();
};

function showStepSeq(on) {
  stepSeqWanted = on;
  if (on && !stepSeq.isOpen()) {
    scheduleStepSeqOpen();
  } else {
    stepSeq.open(on);
  }
  $('seqbtn').classList.toggle('on', on);
  rememberSongLayout();
}

let stepSeqWanted = false;
let stepSeqOpenPending = 0;
function scheduleStepSeqOpen() {
  if (stepSeqOpenPending) return;
  const run = () => {
    stepSeqOpenPending = 0;
    if (!stepSeqWanted || stepSeq.isOpen()) return;
    stepSeq.open(true);
    rememberSongLayout();
  };
  if (typeof requestIdleCallback === 'function') {
    stepSeqOpenPending = requestIdleCallback(run, { timeout: 250 });
  } else {
    stepSeqOpenPending = setTimeout(run, 0);
  }
}

function showPianoRoll(on) {
  setNotesFolded(!on);
  // Unfolding a panel that has no roll to show would be a button doing nothing. The
  // fold still happens — it is remembered for the next pitched channel — but say why
  // the roll did not arrive, and where that channel's bars actually are.
  if (on && laneHidesRoll(selectedLane)) {
    toast(`${presetHeadingFor(selectedLane).name} has no roll — its bars are on the step grid`);
  }
  rememberSongLayout();
}

/**
 * Open whichever note editor the lane actually has.
 *
 * A percussion lane is booleans and gets the step grid; a pitched one gets the roll.
 * The gesture is the same either way — double-click the bar you want to work on —
 * because making you know which panel a snare belongs in before you can move it would
 * be the desk's filing system leaking into the work.
 *
 * They are two different places, and that is the point: opening the kit does not put
 * away the part you were looking at. Neither right-click panel offers this any more;
 * the double-click is the direct route, and both editors have a button and a key.
 */
function openNoteEditor(laneKey, bar) {
  if (bar != null && !(selectedBar && bar >= selFrom() && bar <= selTo())) {
    markBar(laneKey || 'kick', bar);
  }
  if (laneKey && !rollEditable(laneKey)) { showStepSeq(true); return; }
  // Selecting the channel is what chooses the part — the roll is that channel's.
  if (laneKey) selectLane(laneKey);
  showPianoRoll(true);
}

const activeMelodicLanes = () => deskLanes(viewBank(), 1)
  .filter((l) => l.group === 'melodic').map((l) => l.key);
const laneHasBarFlag = (draft, from, to, field, lane) => {
  for (let i = from; i <= to; i++) {
    if (!(draft.plan[i]?.[field] || []).includes(lane)) return false;
  }
  return true;
};
const pasteLane = (draft, from, lane, clip) => {
  let out = draft;
  for (let i = 0; i < clip.bars.length; i++) {
    // The lengths go with the notes. A clip copied before this existed has none, and
    // sixteen nulls is the right thing to write for it: the destination's own lengths
    // belonged to the notes being replaced.
    const lengths = clip.lengths?.[i] || new Array(16).fill(null);
    out = writeBarNotes(editBank(), out, from + i, lane, clip.bars[i], lengths);
  }
  return out;
};

/**
 * Empty a lane over a range of bars. Clear, in both panels.
 *
 * It WRITES the rests rather than setting the bar-level `delete` flag it used to. A
 * flag is a mark over notes that are still there: the lane went quiet, the roll still
 * showed the part, Reset brought it back, and the saved song kept every note. What
 * Clear means is that the bars are empty, so the bars are emptied — and ⌘Z, not a
 * second toggle, is what puts the part back.
 *
 * A percussion rest is `false` and a pitched one is `null`; the two are different
 * values in the file, and a lane of the wrong one stops writing back out as `seq(...)`
 * shorthand. `shared` is for clearing a whole track, where every bar is going anyway
 * and forking each one would write the same silence four times over; a range inside a
 * song must fork, or clearing bar 3 would empty the other bars of its pattern too.
 */
function clearLaneBars(laneKey, from, to, what, { shared = false } = {}) {
  const rest = PERCUSSION_LANES.includes(baseLane(laneKey)) ? false : null;
  const empty = Array.from({ length: 16 }, () => rest);
  // Cleared means cleared: the lengths of notes that are gone go with them, or the
  // next note drawn on one of these steps inherits the length of whatever used to be
  // there. `null` here, always — a length has no percussion form.
  const noLengths = Array.from({ length: 16 }, () => null);
  const write = shared ? writeBarNotesShared : writeBarNotes;
  const eb = editBank();
  // The flags come off with the notes: a bar that was marked deleted and is now empty
  // would otherwise still read as deleted, over nothing.
  let next = setLanesDeleted(arrDraftOf(), from, to, [laneKey], false);
  for (let bar = from; bar <= to; bar++) next = write(eb, next, bar, laneKey, empty, noLengths);
  applyArrangementEdit(next, what);
}

const barFieldValue = (bar, field, lane) => {
  const value = bar?.[field];
  if (typeof value === 'number') return value;
  return Number.isFinite(value?.[lane]) ? value[lane] : 0;
};

/** One value when every selected bar/target agrees, otherwise null for "mixed". */
const uniformRegionValue = (draft, from, to, field, lanes) => {
  const values = new Set();
  for (let bar = from; bar <= to; bar++) {
    for (const lane of lanes) values.add(barFieldValue(draft.plan[bar], field, lane));
  }
  return values.size === 1 ? [...values][0] : null;
};

const rangeHasEveryFlag = (draft, from, to, field, lanes) => {
  for (let bar = from; bar <= to; bar++) {
    const flags = draft.plan[bar]?.[field] || [];
    if (!lanes.every((lane) => flags.includes(lane))) return false;
  }
  return true;
};

const signed = (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}`;
const timingText = (units) => {
  if (!units) return 'On the grid';
  let a = Math.abs(units); let b = 32;
  while (b) { const next = a % b; a = b; b = next; }
  const divisor = a || 1;
  return `${units > 0 ? 'Delay' : 'Bring ahead'} ${Math.abs(units) / divisor}/${32 / divisor} note`;
};

/**
 * The right-click editor. One panel, three scopes, and the scope is whatever you
 * right-clicked: bars on a lane row edit that lane in those bars, the timeline edits
 * song structure, and a track — its strip or its row header — opens the whole track.
 *
 * There is no switch between them. Swapping scope inside the panel meant a window
 * that could quietly grow to cover the song while you were reading it, and every
 * label had to keep saying which mode was on. Exact values are staged and one Apply
 * creates one undo point; moving three sliders should not create thirty.
 */
function openRegionEditor(x, y, {
  laneKey = null, from = selFrom(), to = selTo(), wholeTrack = false, focusName = false,
} = {}) {
  closeMenu();
  const el = $('regionedit');
  el.textContent = '';
  const draft = arrDraftOf();
  if (laneKey && wholeTrack) { from = 0; to = Math.max(0, draft.plan.length - 1); }
  const n = to - from + 1;
  const span = wholeTrack ? 'Entire track'
    : n === 1 ? `Bar ${from + 1}` : `Bars ${from + 1}–${to + 1}`;
  const scopeName = wholeTrack ? 'the whole song' : span.toLowerCase();
  const melodic = activeMelodicLanes();
  const lanes = laneKey ? [laneKey] : melodic;
  const laneLabel = laneKey ? targetLabel(laneKey) : 'All melodic tracks';
  const allSongLanes = deskLanes(viewBank(), 1).map((lane) => lane.key);

  const head = document.createElement('div'); head.className = 'reghead';
  const heading = document.createElement('div'); heading.className = 'regtitle';
  // On a whole track the title is the track, said the way the desk says it everywhere
  // else: its number and its name, exactly as the strip head and the arrangement row
  // carry them. "Hats-closed · Entire track" was a caption explaining the panel; this
  // names the thing the panel is about, which is the only question the title has to
  // answer. Bar-scoped panels still need to say WHICH bars, so those keep the span.
  const number = laneKey && laneNumbers.get(laneKey);
  heading.textContent = laneKey
    ? (wholeTrack ? `${number ? `Track ${number}. ` : ''}${laneLabel}` : `${laneLabel} · ${span}`)
    : span;
  const trackSeam = laneKey && seamFor(laneKey);
  const trackVoice = trackSeam && laneVoiceId(laneKey);
  const trackPreset = trackVoice && VOICES[trackVoice];
  // No sub-line on a track panel. "all 8 bars in the song" was telling you what the
  // panel already is — every section on it says track or channel, and there is nothing
  // else it could be operating on. The other two scopes are genuinely ambiguous and
  // keep theirs.
  if (!(laneKey && wholeTrack)) {
    const target = document.createElement('div'); target.className = 'regtarget';
    target.textContent = laneKey
      ? `Only ${laneLabel}, only ${scopeName}`
      : 'Timeline · the song structure in these bars; adjustments target every melodic track';
    heading.append(target);
  }
  const close = document.createElement('button'); close.className = 'regclose';
  close.textContent = '×'; close.title = 'Close'; close.onclick = closeMenu;
  head.append(heading, close); el.append(head);

  const section = (caption) => {
    const wrap = document.createElement('div'); wrap.className = 'regsection';
    const cap = document.createElement('div'); cap.className = 'regcap'; cap.textContent = caption;
    wrap.append(cap); el.append(wrap); return wrap;
  };
  const actionSection = (caption, actions) => {
    const wrap = section(caption);
    const grid = document.createElement('div'); grid.className = 'regactions';
    for (const action of actions.filter(Boolean)) {
      const button = document.createElement('button');
      button.textContent = action.label; button.title = action.title || action.label;
      button.disabled = !!action.disabled;
      if (action.danger) button.classList.add('danger');
      button.onclick = () => { closeMenu(); action.run(); };
      grid.append(button);
    }
    wrap.append(grid);
  };

  const controls = [];
  let applyButton = null;
  let nameChanged = false;
  const updateApply = () => {
    if (applyButton) applyButton.disabled = !nameChanged && !controls.some((control) => control.dirty);
  };

  // Renaming is the first thing on a track panel, not something under a heading about
  // adjustments — it is what the track is called, not something done to it. Only a
  // desk-owned track has a name of its own; an authored lane is named by the song.
  const layer = laneKey && (mixFor(trackId).layers || []).find((item) => item.key === laneKey);
  const nameInput = layer && wholeTrack ? document.createElement('input') : null;
  const originalName = layer?.label || laneLabel;
  if (nameInput) {
    const wrap = section('Track name');
    const row = document.createElement('label'); row.className = 'regname';
    nameInput.type = 'text'; nameInput.maxLength = 48; nameInput.spellcheck = false;
    nameInput.value = originalName;
    nameInput.oninput = () => {
      const next = nameInput.value.trim().replace(/\s+/g, ' ');
      nameChanged = !!next && next !== originalName;
      row.classList.toggle('changed', nameChanged);
      updateApply();
    };
    row.append(nameInput);
    wrap.append(row);
  }

  // Each of the three takes a noun, and this one's is EDITS: the desk's own bar-level
  // changes — mute, transpose, timing, gain — as opposed to Notes (the part) and Track
  // (the channel and the row). It was `Reset` / `Reset track`, which read as "put the
  // track back" beside an Erase that had just taken the notes out, and could not have
  // done that: a note edit is a section of its own, and ⌘Z is what undoes one.
  const resetAction = laneKey && {
    label: 'Reset Edits',
    title: `Set ${laneLabel}'s mute, transpose, timing and gain back to none in ${scopeName} — the notes are not touched`,
    run: () => {
      let next = arrDraftOf();
      next = setLanesOff(next, from, to, [laneKey], false);
      next = setLanesDeleted(next, from, to, [laneKey], false);
      next = transposeBars(next, from, to, [laneKey], 0);
      next = offsetBars(next, from, to, [laneKey], 0);
      next = gainBars(next, from, to, [laneKey], 0);
      applyArrangementEdit(next, wholeTrack
        ? `${laneLabel} adjustments reset across the whole song`
        : `${laneLabel} adjustments reset in ${span.toLowerCase()}`);
    },
  };

  if (!laneKey) {
    const allMuted = rangeHasEveryFlag(draft, from, to, 'off', allSongLanes);
    actionSection('Song structure', [
      { label: 'Cut', title: `Copy ${span.toLowerCase()}, then remove it from the song`, run: () => {
        arrangementClipboard = { kind: 'bars', ...copyBars(editBank(), arrDraftOf(), from, to) };
        applyArrangementEdit(deleteBars(arrDraftOf(), from, to), `${span} cut`);
      }},
      { label: 'Copy', title: `Copy ${span.toLowerCase()} with every track`, run: () => {
        arrangementClipboard = { kind: 'bars', ...copyBars(editBank(), arrDraftOf(), from, to) };
        toast(`${span} copied`);
      }},
      { label: 'Paste', title: `Insert the copied bars at bar ${from + 1}`,
        disabled: arrangementClipboard?.kind !== 'bars',
        run: () => applyArrangementEdit(pasteBars(editBank(), arrDraftOf(), from, arrangementClipboard), `Bars pasted at ${from + 1}`) },
      { label: 'Repeat', title: `Duplicate ${span.toLowerCase()} once, immediately after it`,
        run: () => applyArrangementEdit(duplicateBars(arrDraftOf(), from, to, 1), `${span} repeated`) },
      { label: 'Insert Silence', title: `Insert ${n} silent bar${n === 1 ? '' : 's'} at bar ${from + 1}`,
        run: () => applyArrangementEdit(insertSilence(arrDraftOf(), from, n, allSongLanes), `Silence inserted at bar ${from + 1}`) },
      { label: allMuted ? 'Unmute Bars' : 'Mute Bars',
        title: `${allMuted ? 'Restore' : 'Silence'} every track in ${span.toLowerCase()} without removing the bars`,
        run: () => applyArrangementEdit(setLanesOff(arrDraftOf(), from, to, allSongLanes, !allMuted), `${span} ${allMuted ? 'unmuted' : 'muted'}`) },
      { label: 'Delete Bars', danger: true, title: `Remove ${span.toLowerCase()} and move everything after it earlier`,
        run: () => applyArrangementEdit(deleteBars(arrDraftOf(), from, to), `${span} deleted`) },
    ]);
  } else if (!wholeTrack) {
    const muted = laneHasBarFlag(draft, from, to, 'off', laneKey);
    // Every label here is already scoped by the heading, so they stay short: this
    // panel cannot touch anything but this track in these bars.
    // No Edit notes… here either, for the reason the track panel does not have one: both
    // note editors have a toolbar button and a key of their own, they open on the
    // selected channel, and the right-click that opened this panel already selected it.
    actionSection(`${laneLabel} in ${scopeName}`, [
      { label: muted ? 'Unmute' : 'Mute', title: `${muted ? 'Unmute' : 'Mute'} ${laneLabel} in ${span.toLowerCase()}`,
        run: () => applyArrangementEdit(setLanesOff(arrDraftOf(), from, to, [laneKey], !muted), `${laneLabel} ${muted ? 'unmuted' : 'muted'} in ${span.toLowerCase()}`) },
      // The same three verbs as the track panel, meaning the same three things — only the
      // scope differs, and the heading is what says the scope. See NOTE-VERBS.
      { label: 'Copy Notes', title: `Copy only ${laneLabel}'s notes from ${span.toLowerCase()}`,
        run: () => {
          arrangementClipboard = { kind: 'lane', ...copyLaneBars(editBank(), arrDraftOf(), from, to, laneKey) };
          toast(`${laneLabel} copied from ${span.toLowerCase()} — right-click another track to paste`);
        }},
      { label: 'Paste Notes', title: arrangementClipboard?.kind === 'lane'
          ? `Paste ${targetLabel(arrangementClipboard.lane)} onto ${laneLabel} from bar ${from + 1}`
          : 'Copy notes from a track first',
        disabled: arrangementClipboard?.kind !== 'lane',
        run: () => applyArrangementEdit(pasteLane(arrDraftOf(), from, laneKey, arrangementClipboard), `${laneLabel} pasted from ${targetLabel(arrangementClipboard.lane)}`) },
      { label: 'Erase Notes', danger: true,
        title: `Empty ${laneLabel} in ${span.toLowerCase()}, leaving the other tracks and the rest of this one alone (⌘Z restores it)`,
        run: () => clearLaneBars(laneKey, from, to, `${laneLabel} erased in ${span.toLowerCase()}`) },
      resetAction,
    ]);
  } else if (wholeTrack) {
    // Everything you can do TO a track, on the thing you right-clicked. Mute and solo
    // are the two that are missing on purpose: they have their own buttons on both the
    // strip and the arrangement row, and a second copy in here would be a switch you
    // have to close the panel to see the state of.
    if (trackSeam) {
      // Two buttons, both about the preset: which one, and what it sounds like. The
      // preset's own name is not in either label — it is on the line under the title,
      // and it was making both buttons different lengths on every track.
      //
      // "New preset from this…" is gone: the preset editor's own Save as new is the same
      // gesture at the moment you actually want it, which is after you have moved
      // something and decided to keep it rather than before you have opened the panel.
      actionSection('Sound', [
        { label: 'Preset', title: `Choose what plays ${laneLabel}`,
          run: () => openVoicePickerFor(laneKey) },
        // An engine preset is a bundle of bank keys rather than a synth, so there is
        // nothing for the editor to show.
        trackPreset && trackPreset.kind !== 'engine' && {
          label: 'Edit Preset', title: `Open ${trackPreset.label} in the preset editor`,
          run: () => editVoice(laneKey) },
      ]);
    }
    actionSection('Track', [
      layer && { label: 'Rename Track…', title: `Rename ${laneLabel} — a desk-owned track name`,
        run: () => openTrackEditor(x, y, laneKey, { focusName: true }) },
      // No Edit notes… here. The two note editors have a button each in the toolbar and a
      // key each (G and N), they open on the selected channel, and either can be left up
      // while you work — so a menu item that opens one of them is a third route to a panel
      // that is probably already on screen. The bar-scoped panel keeps its copy, because
      // there it also carries the selection into the editor, which nothing else does.
      // Always the one word. Which layer number the copy lands on is in the tooltip and
      // in the new track's name; on the button it was the one label too long for a cell.
      trackSeam && { label: 'Duplicate',
        title: layersOf(laneKey).length
          ? `Add ${laneLabel} layer ${layersOf(laneKey).length + 1}, playing the same part`
          : `Add another ${laneLabel} track playing the same part`,
        run: () => duplicateLane(laneKey) },
      // NOTE-VERBS. Three things can happen to the notes and each has one name, used in
      // this panel and in the bar panel with the same meaning:
      //
      //   Copy/Paste Notes — the part itself, moved between tracks or bars.
      //   Erase Notes      — the notes go. The track, its channel and its sound stay.
      //   Revert Edits     — the desk's own edits come off and the song's written part
      //                      comes back, erased notes included.
      //
      // They were Clear, Reset and Delete, three words for "less than there was" whose
      // difference you had to already know: Clear kept the track, Reset undid the clear,
      // and Delete was the only one that took the strip away. Now the noun says what is
      // affected — notes, edits, or the track — and only Delete Track removes anything
      // from the desk.
      { label: 'Copy Notes', title: `Copy ${laneLabel}'s notes from every bar`,
        run: () => {
          arrangementClipboard = { kind: 'lane', ...copyLaneBars(editBank(), arrDraftOf(), from, to, laneKey) };
          toast(`${laneLabel} copied — right-click another track to paste`);
        }},
      { label: 'Paste Notes', title: arrangementClipboard?.kind === 'lane'
          ? `Paste ${targetLabel(arrangementClipboard.lane)} onto ${laneLabel} from bar 1`
          : 'Copy notes from a track first',
        disabled: arrangementClipboard?.kind !== 'lane',
        run: () => applyArrangementEdit(pasteLane(arrDraftOf(), from, laneKey, arrangementClipboard), `${laneLabel} pasted from ${targetLabel(arrangementClipboard.lane)}`) },
      // Shared, because every bar is going anyway — see clearLaneBars.
      { label: 'Erase Notes', title: `Empty every bar of ${laneLabel}, keeping the track and its sound (⌘Z restores the part)`,
        run: () => clearLaneBars(laneKey, from, to, `${laneLabel} erased`, { shared: true }) },
      resetAction,
      // Two words, no track name, no wide row. The name was in the label because the item
      // used to live in a context menu that could be about anything; on a panel titled
      // `Track 3. Hats-closed` it was the third time the same word appeared, and it was the
      // one that made the button too long to fit its own cell. The confirmation names the
      // track — which is where a name earns its place, on the step you cannot take back.
      { label: 'Delete Track', danger: true,
        title: `Delete ${laneLabel} from this mix; the song bars and other tracks stay (⌘Z restores it)`,
        run: () => deleteLane(laneKey) },
    ]);
    // No Channel section. Copy channel, Paste channel, Paste effects, Bypass and Reset
    // channel are the signal path, not the part — they belong to the strip, and the strip's
    // own right-click has had exactly these five since before this panel existed. Keeping
    // them here as well gave the desk two routes to one set of buttons and made "what does
    // right-click do" depend on which view of the instrument you happened to be over.
  }

  // "Adjust Hats-closed across the whole song" on a panel called `Track 3. Hats-closed`
  // said the track's name twice and its scope once more than it needed to.
  const controlsSection = section(wholeTrack ? 'Adjust' : `Adjust ${laneLabel}`);
  const controlsWrap = document.createElement('div'); controlsWrap.className = 'regcontrols';
  controlsSection.append(controlsWrap);

  const addControl = ({ field, label, min, max, step, format }) => {
    const uniform = uniformRegionValue(draft, from, to, field, lanes);
    let current = uniform ?? 0;
    const row = document.createElement('div'); row.className = `regcontrol${uniform == null ? ' mixed' : ''}`;
    const name = document.createElement('span'); name.textContent = label;
    const range = document.createElement('input'); range.type = 'range';
    range.min = min; range.max = max; range.step = step; range.value = current;
    const number = document.createElement('input'); number.type = 'number';
    number.min = min; number.max = max; number.step = step;
    number.value = uniform == null ? '' : current; number.placeholder = 'mixed';
    const reset = document.createElement('button'); reset.textContent = 'Reset'; reset.title = `Reset ${label.toLowerCase()} to zero`;
    const readout = document.createElement('div'); readout.className = 'regread';
    readout.textContent = uniform == null ? 'Mixed values in this selection' : format(current);
    const control = { field, dirty: false, value: () => current };
    const set = (raw) => {
      if (!Number.isFinite(raw)) return;
      current = clamp(Math.round(clamp(raw, min, max) / step) * step, min, max);
      range.value = current; number.value = current;
      readout.textContent = format(current);
      control.dirty = true; row.classList.add('changed'); row.classList.remove('mixed');
      updateApply();
    };
    range.oninput = () => set(+range.value);
    number.oninput = () => { if (number.value !== '') set(+number.value); };
    reset.onclick = () => set(0);
    row.append(name, range, number, reset, readout);
    controlsWrap.append(row); controls.push(control);
  };

  if (!laneKey || melodic.includes(laneKey)) {
    addControl({ field: 'transpose', label: 'Transpose', min: -12, max: 12, step: 1,
      format: (value) => value ? `${signed(value)} semitone${Math.abs(value) === 1 ? '' : 's'}` : 'Original pitch' });
  }
  // Timing and gain are per-TRACK: nudging every melodic track in a bar by the same
  // sixteenth moves nothing relative to anything, and a bar's worth of gain across the
  // band is the master fader with extra steps. The timeline keeps transpose, which does
  // mean something across a whole section — a key change for four bars.
  if (laneKey) {
    addControl({ field: 'offset', label: 'Timing', min: -8, max: 8, step: 1, format: timingText });
    addControl({ field: 'gain', label: 'Gain', min: -12, max: 12, step: 0.5,
      format: (value) => value ? `${signed(value)} dB` : 'Original level' });
  }

  const foot = document.createElement('div'); foot.className = 'regfoot';
  const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.onclick = closeMenu;
  applyButton = document.createElement('button'); applyButton.className = 'regapply';
  applyButton.textContent = 'Apply changes'; applyButton.disabled = true;
  applyButton.onclick = () => {
    const label = nameInput ? nameInput.value.trim().replace(/\s+/g, ' ') : '';
    const nameOnly = !!nameChanged && !controls.some((control) => control.dirty);
    if (nameChanged && label) {
      // Name and arrangement edits share one undo snapshot when Apply changes
      // contains both. The mix mutation is deliberately staged before the
      // arrangement serializer reads the desk-owned layer list.
      pushUndo(null);
      editMix((m) => {
        m.layers = (m.layers || []).map((item) => item.key === laneKey ? { ...item, label } : item);
      }, null, { undo: false });
      bankCache.sig = null;
    }
    let next = arrDraftOf();
    for (const control of controls.filter((item) => item.dirty)) {
      if (control.field === 'transpose') next = transposeBars(next, from, to, lanes, control.value());
      else if (control.field === 'offset') next = offsetBars(next, from, to, lanes, control.value());
      else if (control.field === 'gain') next = gainBars(next, from, to, lanes, control.value());
    }
    closeMenu();
    if (controls.some((control) => control.dirty)) {
      applyArrangementEdit(next, wholeTrack
        ? `${laneLabel} adjusted across the entire track`
        : `${laneLabel} adjusted in ${span.toLowerCase()}`, { undo: !nameChanged });
    } else if (nameOnly) {
      rebuildForShape();
      selectLane(laneKey);
      toast(`${label} renamed — ⌘Z to undo`);
    }
  };
  foot.append(cancel, applyButton); el.append(foot);
  el.onkeydown = (event) => { if (event.key === 'Escape') { event.stopPropagation(); closeMenu(); } };

  el.style.left = `${x}px`; el.style.top = `${y}px`; el.classList.add('show');
  const rect = el.getBoundingClientRect();
  el.style.left = `${Math.max(6, Math.min(x, innerWidth - rect.width - 6))}px`;
  el.style.top = `${Math.max(6, Math.min(y, innerHeight - rect.height - 6))}px`;
  if (focusName) requestAnimationFrame(() => el.querySelector('.regname input')?.focus());
}

function timelineMenu(ev) {
  ev.preventDefault();
  ev.stopPropagation();
  const clicked = timelineBar(ev);
  const inSel = selectedBar && clicked >= selFrom() && clicked <= selTo();
  if (!inSel) markBar(null, clicked);
  openRegionEditor(ev.clientX, ev.clientY, { from: selFrom(), to: selTo() });
}

/**
 * The menu on a bar. This is where arranging happens.
 *
 * Scope is the SELECTION when there is one covering the bar you right-clicked, and
 * that one bar otherwise — the same rule a file manager uses, and the one that makes
 * "select four bars, right-click, duplicate" work without a modifier.
 */
function barMenu(ev, laneKey, bar) {
  ev.preventDefault();
  ev.stopPropagation();
  const inSel = selectedBar && bar >= selFrom() && bar <= selTo();
  if (!inSel) markBar(laneKey, bar);
  else if (selectedBar.key !== laneKey) markBar(laneKey, selFrom(), selTo());
  openRegionEditor(ev.clientX, ev.clientY, { laneKey, from: selFrom(), to: selTo() });
}

/**
 * What a lane actually plays in one cell, step by step: 'A2 · — · A2 · C3'. The
 * shading says how busy a bar is; this says what is in it, which is the difference
 * between finding the bar and knowing whether the bass is on the root.
 *
 * Percussion is a hit or nothing, melodic lanes are frequencies, and chord lanes
 * are arrays of them — all three come back as one line you can read.
 */
function cellSteps(row, cell) {
  return (row.steps?.[cell] || []).map((v) => {
    if (v === true) return '●';
    if (Array.isArray(v)) return v.map(noteName).filter(Boolean).join('+') || '·';
    if (typeof v === 'number' && v > 0) return noteName(v) || '·';
    return '·';
  });
}

const cellNotes = (row, cell) => cellSteps(row, cell).join(' ');

/** Return the pitched values represented by one activity cell. */
function noteFrequencies(values) {
  return values.flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === 'number' && value > 0);
}

/** Keep every percussion hit visible when a long song forces several sixteenths into
 * one visual cell. Return the exact fractional slots so the renderer can place a
 * rounded pattern-mixer hit at each boolean attack. */
function percussionHitPositions(values) {
  return values.reduce((out, value, index) => {
    if (value === true) out.push(index);
    return out;
  }, []);
}

/**
 * Place melodic marks on the vertical pitch contour of their lane. Percussion has no
 * pitch and stays centred; chords use the centre of their notes, with the same stable
 * lane range so a melody does not jump around merely because another cell is empty.
 */
function noteVisualGeometry(values, range) {
  const freqs = noteFrequencies(values);
  if (!freqs.length || !range) return { y: '50%', span: '0px' };
  const midis = freqs.map((hz) => 69 + 12 * Math.log2(hz / 440));
  const centre = midis.reduce((sum, midi) => sum + midi, 0) / midis.length;
  // Use the taller arrangement row: keep a small air margin, but let the contour
  // occupy most of the available pitch space so dots and the SVG trail agree.
  const y = 12 + (1 - ((centre - range.min) / range.span)) * 76;
  const spread = Math.min(10, Math.max(0, (Math.max(...midis) - Math.min(...midis)) * 1.8));
  return { y: `${clamp(y, 12, 88).toFixed(1)}%`, span: `${spread.toFixed(1)}px` };
}

/** Flatten a bar's visual cells into note events without confusing sequential notes
 * with a chord. A cell can contain several original sixteenths when a long song is
 * compressed; each event keeps its slot so the miniature marks retain rhythm. */
function melodicMovementPoints(steps, range) {
  if (!range || !steps.length) return [];
  const points = [];
  steps.forEach((values, cellIndex) => {
    const slots = Math.max(1, values.length);
    values.forEach((value, slot) => {
      const frequencies = noteFrequencies([value]);
      if (!frequencies.length) return;
      const x = ((cellIndex + (slot + 0.5) / slots) / steps.length) * 100;
      points.push({
        x,
        y: Number.parseFloat(noteVisualGeometry(frequencies, range).y),
      });
    });
  });
  return points;
}

/** The visible note heads use the same bar coordinates as the trail. Chord tones
 * share an x position but keep separate y positions; sequential tones move across
 * the bar instead of looking like a stack. */
function melodicDotPoints(steps, range) {
  if (!range || !steps.length) return [];
  const points = [];
  steps.forEach((values, cellIndex) => {
    const slots = Math.max(1, values.length);
    values.forEach((value, slot) => {
      const frequencies = noteFrequencies([value]);
      const x = ((cellIndex + (slot + 0.5) / slots) / steps.length) * 100;
      for (const hz of frequencies) {
        points.push({ x, y: Number.parseFloat(noteVisualGeometry([hz], range).y), cellIndex, slot });
      }
    });
  });
  return points;
}

/** Draw one smooth contour through the melodic note centres. It is deliberately a
 * visual shorthand, not a second piano roll: the dots still carry the attacks and
 * the curve only carries the movement of the line between them. */
function melodicMovementPath(steps, range) {
  const points = melodicMovementPoints(steps, range);
  return melodicMovementPathFromPoints(points);
}

function melodicMovementPathFromPoints(points) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
}

/** Fade the last note toward the next bar only when that next bar continues the
 * phrase. This keeps a melodic line legible across a bar boundary without inventing
 * a trail into silence. */
function melodicMovementTailPath(last, next) {
  if (!last || !next || last.x >= 99.5) return '';
  const span = 100 - last.x;
  const targetY = last.y + (next.y - last.y) * .4;
  const c1x = last.x + span * .34;
  const c2x = 100 - span * .22;
  const c1y = last.y + (targetY - last.y) * .2;
  const c2y = targetY;
  return `M ${last.x.toFixed(2)} ${last.y.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, 100 ${targetY.toFixed(2)}`;
}

// The drag in progress across the grid, if any. A range is picked by pressing in one
// bar and releasing in another; a press and release in the same bar is a click, and
// still means what it always meant.
let dragSel = null;
let dragClickSuppress = false;
addEventListener('pointerup', () => {
  dragClickSuppress = !!dragSel?.moved;
  dragSel = null;
});
addEventListener('pointercancel', () => { dragSel = null; dragClickSuppress = false; });

function buildArrangement() {
  const grid = $('arrgrid');
  grid.textContent = '';
  clearArrangementPlayback();
  arrCells = [];
  arrangementMeters.clear();
  const arrange = $('arrange');
  if (arrange) {
    arrange.dataset.noteVisual = noteVisualMode;
    arrange.dataset.noteAnimation = noteAnimation ? 'on' : 'off';
  }
  // The bar plan, so each cell knows whether the arrangement silences its lane here.
  const plan = songShape().bars;
  const patternStart = patternStarts(plan);
  // Keep the actual sixteenth grid wherever it remains legible. Four cells per bar
  // made every beat look like one note, which erased hats, syncopation and melodic
  // movement. The breakpoints cap the total at roughly 256 cells across a row while
  // preserving the finest useful rhythm for short songs.
  const perBar = [16, 8, 4, 2, 1].find((cells) => plan.length * cells <= 256) || 1;
  arrCellsPerBar = perBar;
  // Every lane, whatever the mixer is showing: the arrangement is the song, and a
  // song does not lose its drums because you are looking at the melody.
  const view = viewBank();
  const desk = deskLanes(view, 1).map((l) => l.key);
  const rows = laneActivity(view, 1, perBar);
  rows.sort((a, b) => desk.indexOf(a.key) - desk.indexOf(b.key));
  const pitchRanges = new Map();
  for (const row of rows) {
    const midis = row.steps.flatMap(noteFrequencies)
      .map((hz) => 69 + 12 * Math.log2(hz / 440));
    if (midis.length) {
      const min = Math.min(...midis);
      const max = Math.max(...midis);
      pitchRanges.set(row.key, { min, span: Math.max(1, max - min) });
    }
  }

  rows.forEach((row) => {
    const el = document.createElement('div');
    el.className = 'arrrow';
    el.dataset.lane = row.key;
    // What this row says when it has no preset to name. Kept on the row so a retitle
    // after a voice change can fall back to the same two words this build used, without
    // rebuilding the grid to find them again — see refreshLaneIdentity.
    el.dataset.laneLabel = row.label;
    el.dataset.group = row.group || '';
    el.style.setProperty('--lane', laneColour(row.key));
    // The track header follows Logic's two-line hierarchy: identity above, controls
    // below. The number spans both lines; the bars sit alongside the upper line.
    const header = document.createElement('div');
    header.className = 'arrhead-cell';
    // Desk order, numbered — the way you refer to a track out loud ("mute 3") and
    // the order the strips run in below.
    const num = document.createElement('span');
    num.className = 'arrnum';
    num.textContent = String(laneNumbers.get(row.key) ?? '');
    const btns = document.createElement('div');
    btns.className = 'arrbtns';
    btns.append(...muteSoloPair(row.key, row.label));
    const icon = groupIcon(row.group);
    icon.classList.add('arrtrack-icon');
    const top = document.createElement('div');
    top.className = 'arrtrack-top';
    const preset = presetForLane(row.key);
    const category = document.createElement('span');
    category.className = 'arrpresetcat';
    category.textContent = preset?.category || cap(row.group || 'track');
    const name = document.createElement('div');
    name.className = 'arrname';
    name.textContent = preset?.label || row.label;
    // No title here: markClipped() puts one on only if the name is actually cut off.
    //
    // The name is not a button. Changing what plays a track is the row's right-click
    // menu and nothing else — see the Sound section in openRegionEditor — because the
    // name is the first thing you point at on a track, and pointing at a track has to
    // stay safe.
    //
    // Selecting is what a plain click does, and it is the WHOLE header that does it: the
    // number, the family mark, the name, the type and the space around them are all the
    // same track, and a click that landed on the number and did nothing read as a dead
    // row. Only the controls with a job of their own opt out — M and S stop the click
    // themselves, and the level slider is a drag.
    header.addEventListener('click', () => selectLane(row.key));
    // The same double-click the strip head takes: play from the bar this lane comes in
    // on. Not on those same controls, where a double-click is two presses of a control
    // rather than a gesture on the track.
    header.addEventListener('dblclick', (ev) => {
      if (ev.target.closest('.arrbtns, .arrgain')) return;
      playFromLaneStart(row.key);
    });
    // The TRACK panel, and only here. The row is the track — what it plays, what plays
    // it, whether it is in the song — and the strip below is its channel. Both used to
    // open this, which meant two routes to one window and a right-click whose result you
    // could not predict from where you clicked. On the header cell only: the bars keep
    // their right-click for the bar menu.
    trackMenu(header, row.key);
    const bottom = document.createElement('div');
    bottom.className = 'arrtrack-bottom';
    top.append(name, category);
    bottom.append(btns);
    header.append(num, icon, top, bottom);
    const bars = document.createElement('div');
    bars.className = 'arrbars';
    // Runs of playing beats are one region, not a row of chips. The chosen visual
    // language paints the note marks; the cells themselves stay the same width so the
    // columns continue to line up with the ruler.
    // A whole bar is the unit you pick, whatever resolution the shading is drawn at:
    // the cells inside a bar are a picture of it, and the bar is the target.
    const barCount = Math.ceil(row.density.length / perBar);
    for (let bar = 0; bar < barCount; bar++) {
      const box = document.createElement('div');
      const playing = row.density.slice(bar * perBar, (bar + 1) * perBar).some((v) => v > 0);
      box.className = `arrbar${playing ? ' has-notes' : ''}`;
      const barColour = arrangementBarField(row.key);
      box.style.setProperty('--bar-colour', barColour);
      // A bar this lane plays in is tinted its own colour end to end, so the rests
      // inside it read as part of the bar rather than as the gap between two bars.
      // The tint also fills the gutters between beats, which is what makes a bar
      // with a hit on every other beat still look like one bar.
      if (playing) {
        box.style.background = barColour;
      }
      // Melodic detail is carried by the same fixed-size dots as percussion. The
      // smooth bar-wide trail uses those exact note positions, so compression
      // preserves rhythm without making the line drift from the marks.
      const barSteps = row.steps.slice(bar * perBar, (bar + 1) * perBar);
      const nextBarSteps = row.steps.slice((bar + 1) * perBar, (bar + 2) * perBar);
      const barPoints = row.group === 'melodic'
        ? melodicMovementPoints(barSteps, pitchRanges.get(row.key))
        : [];
      const nextBarPoints = row.group === 'melodic'
        ? melodicMovementPoints(nextBarSteps, pitchRanges.get(row.key))
        : [];
      const movement = row.group === 'melodic'
        ? melodicMovementPath(barSteps, pitchRanges.get(row.key))
        : '';
      const tail = melodicMovementTailPath(barPoints.at(-1), nextBarPoints[0]);
      const melodicDots = row.group === 'melodic'
        ? melodicDotPoints(barSteps, pitchRanges.get(row.key))
        : [];
      if (movement || tail) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        line.classList.add('arrmelodyline');
        line.setAttribute('viewBox', '0 0 100 100');
        line.setAttribute('preserveAspectRatio', 'none');
        line.setAttribute('aria-hidden', 'true');
        if (movement) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', movement);
          line.append(path);
        }
        if (tail) {
          const fadeId = `arrtrailfade-${row.key.replace(/[^a-z0-9_-]/gi, '_')}-${bar}`;
          const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
          gradient.id = fadeId;
          // Keep the handoff solid until the final few pixels of the bar. Using
          // bar-space coordinates avoids making a long tail look prematurely faded.
          gradient.setAttribute('x1', '94'); gradient.setAttribute('y1', '0');
          gradient.setAttribute('x2', '100'); gradient.setAttribute('y2', '0');
          gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
          const solid = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
          solid.setAttribute('offset', '0'); solid.setAttribute('stop-color', 'var(--trail-thread)');
          solid.setAttribute('stop-opacity', '.74');
          const fade = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
          fade.setAttribute('offset', '1'); fade.setAttribute('stop-color', 'var(--trail-thread)');
          fade.setAttribute('stop-opacity', '.42');
          gradient.append(solid, fade); defs.append(gradient); line.append(defs);
          const tailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          tailPath.classList.add('arrtrailtail');
          tailPath.setAttribute('d', tail);
          tailPath.style.stroke = `url(#${fadeId})`;
          line.append(tailPath);
        }
        box.append(line);
      }
      for (const point of melodicDots) {
        const dot = document.createElement('span');
        dot.className = 'arrmicrodot';
        dot.dataset.cell = String(point.cellIndex);
        // The sixteenth INSIDE that cell this attack belongs to. A compressed song puts
        // several of them in one cell, and the playback accent has to follow the note
        // rather than the box it is drawn in.
        dot.dataset.slot = String(point.slot);
        dot.setAttribute('aria-hidden', 'true');
        dot.style.setProperty('--micro-x', `${point.x.toFixed(2)}%`);
        dot.style.setProperty('--micro-y', `${point.y.toFixed(1)}%`);
        box.append(dot);
      }
      for (let beat = 0; beat < perBar; beat++) {
        const cell = bar * perBar + beat;
        const d = row.density[cell] ?? 0;
        // Regions stay joined inside one pattern, but stop cleanly at a pattern
        // boundary. Without this the divider sits over one uninterrupted colour bar
        // and reads as a ruler tick rather than a change in the music.
        const openL = d > 0 && cell > 0 && row.density[cell - 1] > 0
          && !(beat === 0 && patternStart[bar]);
        const openR = d > 0 && row.density[cell + 1] > 0
          && !(beat === perBar - 1 && patternStart[bar + 1]);
        const c = document.createElement('div');
        // The downbeat tick would cut a region in half, so it only marks bars that
        // start something — a rest, or the first beat of a region.
        const note = d > 0;
        c.className = 'arrcell'
          + (perBar > 1 && beat === 0 && !openL ? ' barstart' : '')
          + (note ? ' note' : '');
        if (note) {
          c.style.setProperty('--note-strength', String(clamp(d, 0, 1)));
          c.style.setProperty('--note-tilt', `${(((bar * perBar + beat) * 17) % 7) - 3}deg`);
          const values = row.steps[cell] || [];
          const frequencies = noteFrequencies(values);
          // Which sixteenths inside this cell are attacks. One character per slot, read
          // back by the playback accent so a note on the second half of a cell is set
          // off when it sounds and not when the playhead reaches the cell.
          c.dataset.hits = (values.length ? values : [true])
            .map((value) => (value === true || noteFrequencies([value]).length ? '1' : '0')).join('');
          const hasChord = values.some((value) => Array.isArray(value)
            && noteFrequencies([value]).length > 1);
          if (hasChord) c.classList.add('chord');
          if (row.group === 'melodic' && frequencies.length) {
            // One visual cell can represent a whole bar in a long song. Keep the
            // actual attacks visible at their local time positions; only tones in
            // the same source step share an x coordinate and read as a chord.
            c.classList.add('micro-notes');
          }
          const percussionHits = percussionHitPositions(values);
          if (percussionHits.length) {
            c.classList.add('percussion');
            const slots = values.length;
            for (const index of percussionHits) {
              const hit = document.createElement('span');
              hit.className = 'arrhit';
              hit.dataset.slot = String(index);
              hit.setAttribute('aria-hidden', 'true');
              hit.style.left = `${(((index + 0.5) / slots) * 100).toFixed(1)}%`;
              c.append(hit);
            }
          }
          const geometry = noteVisualGeometry(values, pitchRanges.get(row.key));
          c.style.setProperty('--note-y', geometry.y);
          c.style.setProperty('--note-span', geometry.span);
        }
        if (d > 0) {
          if (noteVisualMode === 'solid') c.style.background = 'transparent';
          else c.style.background = 'transparent';
        } else if (playing) {
          c.style.background = 'transparent';        // the bar's own tint shows through
        }
        box.append(c);
      }
      // A lane the arrangement silences here keeps its written colour but gets the
      // muted treatment below. That is a different thing from deletion: the bar still
      // occupies time and can be unmuted without restoring any notes.
      if (plan[bar]?.off?.includes(row.key)) {
        box.classList.add('barmuted');
        box.title += '\nMuted here — the track remains written and the bar still occupies time';
      }
      if (plan[bar]?.delete?.includes(row.key)) {
        box.classList.add('bardeleted');
        box.title += '\nDeleted here — restore to bring this track back';
      }
      const where = `${row.label} · bar ${bar + 1}`;
      const notes = Array.from({ length: perBar }, (_, b) => cellNotes(row, bar * perBar + b)).join('  ');
      const silenced = plan[bar]?.off?.length ? `\nSilenced here: ${plan[bar].off.join(', ')}` : '';
      const deleted = plan[bar]?.delete?.length ? `\nDeleted here: ${plan[bar].delete.join(', ')}` : '';
      const edits = [
        plan[bar]?.transpose?.[row.key] != null ? `Transpose ${plan[bar].transpose[row.key] > 0 ? '+' : ''}${plan[bar].transpose[row.key]}` : '',
        plan[bar]?.offset?.[row.key] != null ? `Timing ${plan[bar].offset[row.key] > 0 ? '+' : ''}${plan[bar].offset[row.key]}/32` : '',
        plan[bar]?.gain?.[row.key] != null ? `Gain ${plan[bar].gain[row.key] > 0 ? '+' : ''}${plan[bar].gain[row.key]} dB` : '',
      ].filter(Boolean);
      // Keep the most important melodic edit visible without opening a tooltip. The
      // full details remain in `title`, while a compact +5/-7 badge makes a transposed
      // bar immediately recognisable in the arrangement row.
      const transpose = typeof plan[bar]?.transpose === 'number'
        ? (row.group === 'melodic' ? plan[bar].transpose : null)
        : plan[bar]?.transpose?.[row.key];
      const offset = typeof plan[bar]?.offset === 'number'
        ? plan[bar].offset
        : plan[bar]?.offset?.[row.key];
      const gain = typeof plan[bar]?.gain === 'number'
        ? plan[bar].gain
        : plan[bar]?.gain?.[row.key];
      const badge = [
        transpose != null && `${transpose > 0 ? '+' : ''}${transpose}`,
        offset != null && `${offset > 0 ? '+' : ''}${offset}/32`,
        gain != null && `${gain > 0 ? '+' : ''}${gain}dB`,
      ].filter(Boolean).join(' · ');
      if (badge) {
        const meta = document.createElement('span');
        meta.className = 'arrmeta';
        meta.textContent = badge;
        box.append(meta);
      }
      box.title = `${where}\n${notes}${silenced}${deleted}${edits.length ? `\n${edits.join(' · ')}` : ''}\nRight-click to arrange · drag to select a range`;
      const at = bar * 16;
      box.onclick = (ev) => {
        if (dragClickSuppress) { dragClickSuppress = false; return; }
        const selectionChanges = !selectedBar || selFrom() !== bar || selTo() !== bar;
        if (!(playing && loopOn && selectionChanges)) jumpTo(at);
        selectLane(row.key);
        // Shift extends the selection from where it started, the way a list does.
        if (ev.shiftKey && selectedBar) markBar(selectedBar.key, selectedBar.from, bar);
        else markBar(row.key, bar);
        $('section').textContent = `${where} — ${notes}`;
        $('section').title = notes;
      };
      // Drag across the row to take a range. Held on the row rather than the cell so
      // the pointer can leave the bar it started in, which is the whole gesture.
      box.onpointerdown = (ev) => {
        if (ev.button !== 0) return;
        dragClickSuppress = false;
        dragSel = { key: row.key, from: bar, moved: false };
      };
      box.onpointerenter = () => {
        if (!dragSel) return;
        dragSel.moved = true;
        markBar(dragSel.key, dragSel.from, bar);
      };
      // The bar menu: mute a lane here, drop the kit, duplicate, build up, delete.
      box.oncontextmenu = (ev) => barMenu(ev, row.key, bar);
      // Double-click opens the notes, not the transport.
      //
      // It used to play from here, matching the timeline. But a bar of a TRACK is a
      // different thing to point at than a moment of the song: the timeline is where
      // you go to hear, and a lane's bar is where you go to look at what it plays. The
      // ruler above still plays from where you double-click, so nothing was lost —
      // and "open what I am pointing at" is what a double-click means everywhere else
      // on the desk.
      box.ondblclick = () => openNoteEditor(row.key, bar);
      bars.append(box);
    }
    // Expanded gain/VU control in the lower header line, below the name and beside M/S.
    // The thumb controls gain while the rail shows the live channel level.
    const gainSlider = document.createElement('input');
    gainSlider.type = 'range';
    gainSlider.className = 'arrgain';
    gainSlider.min = 0;
    gainSlider.max = 1;
    gainSlider.step = 0.002;
    gainSlider.title = `${row.label} level`;
    const curGain = mixFor(trackId).lanes?.[row.key]?.gain ?? 0;
    gainSlider.value = dbToPos(curGain);
    const gainWrap = document.createElement('span');
    gainWrap.className = 'arrgainwrap';
    const vu = document.createElement('span');
    vu.className = 'arrvumeter';
    vu.title = `${row.label} live level (smoothed RMS)`;
    vu.setAttribute('aria-hidden', 'true');
    const vuFill = document.createElement('i');
    const vuPeak = document.createElement('b');
    vu.append(vuFill, vuPeak);
    const gainReadout = document.createElement('span');
    gainReadout.className = 'arrgainreadout';
    const showGain = (db) => { gainReadout.textContent = `${db > 0 ? '+' : ''}${db.toFixed(1)}`; };
    showGain(curGain);
    gainSlider.addEventListener('pointerdown', () => {
      gainReadout.classList.add('show');
      showGain(posToDb(+gainSlider.value));
    });
    const hideGain = () => gainReadout.classList.remove('show');
    gainSlider.addEventListener('pointerup', hideGain);
    gainSlider.addEventListener('pointercancel', hideGain);
    gainSlider.addEventListener('lostpointercapture', hideGain);
    // Both handlers end the same way, because they are the same act: set the lane's
    // level, then let every control that shows it redraw. The only difference is that a
    // drag must not have its own slider written back to mid-drag.
    const setGain = (db, { except = null, tag } = {}) => {
      showGain(db);
      editMix((m) => { laneOf(m, row.key).gain = db; }, tag);
      Audio.mixer?.lane(row.key)?.setGain(db);
      syncLaneGain(row.key, { except });
    };
    gainSlider.addEventListener('input', () => {
      setGain(posToDb(+gainSlider.value), { except: gainSlider, tag: `gain:${row.key}` });
    });
    // Untagged, so the reset is its own undo step rather than being coalesced into the
    // drag before it — the same bargain the channel fader's reset makes.
    gainSlider.addEventListener('dblclick', () => setGain(0));
    gainWrap.append(vu, gainSlider, gainReadout);
    arrangementMeters.set(row.key, { meter: vu, fill: vuFill, peak: vuPeak,
      shown: 0, held: 0, heldAt: 0 });
    bottom.append(gainWrap);
    // Keep the two-line header self-contained so future lower-row controls can be
    // added beside M/S without moving the track identity or the bar grid.
    const main = document.createElement('div');
    main.className = 'arrrow-main';
    main.append(header, bars);
    el.append(main);
    grid.append(el);
    arrCells.push({ key: row.key, bars });
  });
  redrawSelection();            // the rows are new; the selection is not
  updateArrangementNoteScale();
}

/** Keep note marks readable as more bars share the same width. Five pixels is the
 * authored maximum; narrow bars scale down from their actual rendered width, and all
 * note languages consume the same variable so percussion and melodic marks agree. */
function updateArrangementNoteScale() {
  const arrange = $('arrange');
  const bar = arrange?.querySelector('.arrbar');
  if (!arrange || !bar) return;
  const width = bar.getBoundingClientRect().width;
  if (!width) return;
  const size = clamp(width * 0.12, 3, 5);
  arrange.style.setProperty('--arr-note-size', `${size.toFixed(2)}px`);
}

function stopArrangementEcho(cell) {
  const timer = arrEchoTimers.get(cell);
  if (timer != null) clearTimeout(timer);
  arrEchoTimers.delete(cell);
  arrEchoCells.delete(cell);
  cell.classList.remove('echoing');
}

/** Leave one selected-track mark behind briefly as a visual playback echo. */
function startArrangementEcho(cell) {
  if (!cell || noteVisualMode !== 'trail' || !noteAnimation) return;
  stopArrangementEcho(cell);
  cell.classList.remove('playing');
  // Restart the CSS fade if this mark was echoed again before its previous tail died.
  void cell.offsetWidth;
  cell.classList.add('echoing');
  arrEchoCells.add(cell);
  arrEchoTimers.set(cell, setTimeout(() => stopArrangementEcho(cell), ARR_ECHO_DURATION));
}

/** Remove the active playback cue and any fading echoes. */
function clearArrangementPlayback() {
  for (const cell of arrPlayingCells) cell.classList.remove('playing');
  for (const cell of arrEchoCells) cell.classList.remove('echoing');
  for (const timer of arrEchoTimers.values()) clearTimeout(timer);
  arrEchoCells.clear();
  arrEchoTimers.clear();
  arrPlayingCells = [];
  arrPlayingAt = null;
}

/**
 * Follow the heard transport position without rebuilding the arrangement. The note
 * cells are already the semantic surface; playback only changes the small set that the
 * current beat lands on. Keeping the same references avoids restarting a CSS flourish
 * on every animation frame.
 */
function followArrangementVisual(step) {
  const next = [];
  let at = null;
  if (step != null && track && arrCells.length) {
    const totalSteps = songShape().totalSteps;
    at = Math.max(0, Math.floor(step)) % Math.max(1, totalSteps);
    const bar = Math.floor(at / 16);
    const within = at % 16;
    // One drawn cell can stand for several sixteenths in a long song. `slot` is which
    // of them is sounding, and it is what the marks are matched against — the cell is
    // only the box they are drawn in.
    const perCell = 16 / arrCellsPerBar;
    const cellIndex = Math.floor(within / perCell);
    const slot = within - cellIndex * perCell;
    const selectedArrangementLane = selectedLane
      && arrCells.some((row) => row.key === selectedLane)
      ? selectedLane
      : null;
    for (const row of arrCells) {
      // A full-desk playback cue is useful when no track is selected. Once the
      // user chooses a lane, keep the animated accent on that lane so the rows
      // remain readable while the rest still show their static note language.
      if (selectedArrangementLane && row.key !== selectedArrangementLane) continue;
      const barEl = row.bars.children[bar];
      const cell = barEl?.querySelectorAll('.arrcell')[cellIndex];
      if (!cell) continue;
      if (!cell.classList.contains('note') && !cell.classList.contains('recording-note')) continue;
      // A cell whose attacks are all on other sixteenths is not playing yet. Cells
      // written by the recorder carry no map, so they light on the whole cell as before.
      const hits = cell.dataset.hits;
      if (hits && hits[slot] !== '1') continue;
      next.push(cell);
      for (const hit of cell.querySelectorAll(`.arrhit[data-slot="${slot}"]`)) next.push(hit);
      for (const dot of barEl.querySelectorAll(`.arrmicrodot[data-cell="${cellIndex}"][data-slot="${slot}"]`)) {
        next.push(dot);
      }
    }
  }
  const same = next.length === arrPlayingCells.length
    && next.every((cell, i) => cell === arrPlayingCells[i]);
  // The same marks on a NEW sixteenth are a second attack, not the first one still
  // ringing, so the step has to be part of the comparison as well as the set.
  if (same && at === arrPlayingAt) return;
  const nextSet = new Set(next);
  const rehit = next.some((cell) => arrPlayingCells.includes(cell));
  for (const cell of arrPlayingCells) {
    cell.classList.remove('playing');
    if (!nextSet.has(cell)) startArrangementEcho(cell);
  }
  for (const cell of arrEchoCells) {
    if (nextSet.has(cell)) stopArrangementEcho(cell);
  }
  // Removing and re-adding the class in one frame does not restart a CSS animation
  // on its own. Only pay for the reflow when a mark is actually struck twice running.
  if (rehit) void $('arrange').offsetWidth;
  for (const cell of next) cell.classList.add('playing');
  arrPlayingCells = next;
  arrPlayingAt = at;
}

/** Locate the visible arrangement cell that owns a recorded note's quantised step. */
function arrangementCellFor(lane, bar, step) {
  const row = arrCells.find((entry) => entry.key === lane);
  const barEl = row?.bars.children[bar];
  if (!barEl) return null;
  const cellIndex = arrCellsPerBar === 1 ? 0 : Math.floor(step / (16 / arrCellsPerBar));
  return barEl.querySelectorAll('.arrcell')[cellIndex] || null;
}

/**
 * Paint a newly recorded note immediately, without asking the desk to rebuild. The
 * recorder's beat flush can then keep doing its cheap live write; the final take redraw
 * replaces this provisional mark with the authoritative arrangement data.
 */
function markRecordedVisual(lane, bar, step, open) {
  const cell = arrangementCellFor(lane, bar, step);
  if (!cell) return;
  cell.classList.add('note', 'recording-note');
  cell.style.setProperty('--note-strength', '1');
  cell.style.setProperty('--note-tilt', `${(((bar * arrCellsPerBar + step) * 17) % 7) - 3}deg`);
  const barEl = cell.parentElement;
  barEl?.classList.add('has-notes');
  if (barEl && !barEl.style.background) {
    barEl.style.background = arrangementBarField(lane);
  }
  cell.classList.toggle('recording-note', open);
}

// Folded or not is remembered like the panel heights are, and for the same reason: it
// is a statement about this desk rather than about the mix, so the desk you come back
// to is the one you left.
const ARR_FOLD_KEY = 'mash-mixer-arr-folded';
function setArrangeCollapsed(on) {
  const arrange = $('arrange');
  const changed = arrange.classList.contains('collapsed') !== on;
  arrange.classList.toggle('collapsed', on);
  // Before the early return, so the resize edges always match the folds even when the
  // fold itself has not changed: there is nothing to drag the height of when the
  // arrangement is shut, and a handle for it says there is.
  syncPanelResizeEdges();
  if (!changed) return;
  // Only on a real change: the border drag calls this every frame, and a fold that has
  // not moved is not worth a write.
  localStorage.setItem(ARR_FOLD_KEY, on ? '1' : '0');
  $('arrfold').classList.toggle('folded', on);
  $('arrfold').title = on ? 'Show the arrangement' : 'Collapse the arrangement';
}

$('arrfold').onclick = () => {
  setArrangeCollapsed(!$('arrange').classList.contains('collapsed'));
  scheduleDeskFit(true);
};
setArrangeCollapsed(localStorage.getItem(ARR_FOLD_KEY) === '1');

// The mixer folds like the panels above and below it. The family switches stay in
// the header while it is folded — they are what you are about to unfold it for.
const MIXER_KEY = 'mash-mixer-rack-folded';
function setMixerFolded(on, refit = true) {
  const changed = $('rackwrap').classList.contains('collapsed') !== on;
  $('rackwrap').classList.toggle('collapsed', on);
  $('mixhead').classList.toggle('folded', on);
  $('mixfold').classList.toggle('folded', on);
  $('mixfold').title = on ? 'Show the mixer' : 'Collapse the mixer';
  syncPanelResizeEdges();
  // Only on a real change — the Notes border drag unfolds the rack on every frame it
  // is dragged upwards, and each of those was a localStorage write.
  if (changed) localStorage.setItem(MIXER_KEY, on ? '1' : '0');
  if (refit) scheduleDeskFit(true);
}
$('mixfold').onclick = () => setMixerFolded(!$('rackwrap').classList.contains('collapsed'));
setMixerFolded(localStorage.getItem(MIXER_KEY) === '1', false);

// ---- meters + transport readout --------------------------------------------
let peakSeen = 0;
// Meter ballistics. The bar rises instantly and falls at a rate you can read — a
// meter that tracks the signal exactly flickers and tells you nothing about a hit
// that has already gone. The peak line holds where the loudest moment was, which is
// the number you are actually mixing against.
const METER_FALL = 55;        // percent of the scale per second
const PEAK_HOLD = 1400;       // ms the line sits before it starts sliding down
const PEAK_FALL = 30;         // percent per second once it does
let meterAt = 0;

function updateArrangementMeter(readout, lin, now, dt) {
  const value = typeof lin === 'number' ? lin : 0;
  const db = 20 * Math.log10(Math.max(1e-6, value));
  const pos = clamp((db + 48) / 48 * 100, 0, 100);
  readout.shown = Math.max(pos, (readout.shown ?? 0) - METER_FALL * dt);
  readout.fill.style.width = `${readout.shown}%`;
  if (pos >= (readout.held ?? 0)) {
    readout.held = pos;
    readout.heldAt = now;
  } else if (now - (readout.heldAt || 0) > PEAK_HOLD) {
    readout.held = Math.max(readout.shown, readout.held - PEAK_FALL * dt);
  }
  readout.peak.style.left = `${readout.held || 0}%`;
  readout.peak.style.opacity = readout.held > 0.5 ? '1' : '0';
  readout.meter.classList.toggle('clip', value >= 1);
}

function tick() {
  const now = performance.now();
  const dt = meterAt ? Math.min(0.25, (now - meterAt) / 1000) : 0;
  meterAt = now;
  syncLoopAnchor();
  syncPendingSeek();
  if (Audio.mixer) {
    const laneLevels = new Map();
    for (const mt of meters) {
      // One number for a mono meter, [L, R] for the master's pair. Everything below is
      // per-channel and reads the same either way; the clip light and the session peak
      // take the louder side, which is the side that clipped.
      const v = mt.master || mt.key === '__master' ? Audio.mixer.masterLevels()
        : mt.key.startsWith('__aux:') ? Audio.mixer.auxLevel(mt.key.slice(6))
        : Audio.mixer.lane(mt.key)?.level();
      const vals = Array.isArray(v) ? v : [v];
      let loudest = 0;
      mt.chans.forEach((ch, i) => {
        const lin = typeof vals[i] === 'number' ? vals[i] : 0;
        if (lin > loudest) loudest = lin;
        // dB scale bottoming at -48 reads far better than linear for quiet lanes.
        const db = 20 * Math.log10(Math.max(1e-6, lin));
        const pos = clamp((db + 48) / 48 * 100, 0, 100);
        ch.shown = Math.max(pos, (ch.shown ?? 0) - METER_FALL * dt);
        if (mt.horizontal) ch.fill.style.width = `${ch.shown}%`;
        else ch.fill.style.height = `${ch.shown}%`;
        if (pos >= (ch.held ?? 0)) { ch.held = pos; ch.heldAt = now; }
        else if (now - (ch.heldAt || 0) > PEAK_HOLD) {
          ch.held = Math.max(ch.shown, ch.held - PEAK_FALL * dt);
        }
        if (mt.horizontal) ch.peak.style.left = `${ch.held || 0}%`;
        else ch.peak.style.bottom = `${ch.held || 0}%`;
        ch.peak.style.opacity = ch.held > 0.5 ? '1' : '0';
      });
      laneLevels.set(mt.key, loudest);
      mt.meter.classList.toggle('clip', loudest >= 1);
      if (mt.key === '__master' && loudest > peakSeen) peakSeen = loudest;
    }
    // Use the already-read channel level where the rack has a strip; only filtered
    // lanes need a second lookup, so every arrangement VU still follows the same
    // engine meter source without doubling normal visible-lane reads.
    for (const [key, readout] of arrangementMeters) {
      const lin = laneLevels.has(key) ? laneLevels.get(key) : Audio.mixer.lane(key)?.level();
      updateArrangementMeter(readout, lin, now, dt);
    }
  }
  const beat = Audio.songBeat();
  if (beat != null && track) {
    const { spb, totalSteps, loopSecs } = songShape();
    const heardStep = heardStepNow() ?? 0;
    const frac = heardStep / totalSteps;
    $('playhead').style.left = (frac * 100) + '%';
    $('tnow').textContent = `${fmtTime(heardStep * spb)}/${fmtTime(loopSecs)}`;
    $('barnow').textContent = `${Math.floor(heardStep / 16) + 1}/${totalSteps / 16}`;
    $('pos').textContent = `Beat ${(beat % 4 + 1).toFixed(1)}`;
    const visualStep = arrangementVisualStep(heardStep);
    followArrangementVisual(visualStep);
    oskFollow(heardStep);
    stepSeq.follow(heardStep);
    pianoRoll.follow(heardStep);
    recordFollow(heardStep);
  } else {
    followArrangementVisual(null);
    oskFollow(null);
    stepSeq.follow(null);
    pianoRoll.follow(null);
  }
  $('peakinfo').textContent = peakSeen > 0
    ? `Master peak ${(20 * Math.log10(peakSeen)).toFixed(1)} dBFS${peakSeen >= 1 ? '  ** CLIPPING **' : ''}` : '';
  requestAnimationFrame(tick);
}

// A rough live load estimate: the engine's own measured cost plus every active
// effect's. Deliberately approximate — a phone is not this machine — but the
// ratios hold, and it is enough to notice that four Phasers cost more than the
// entire rest of the song.
function updateCpu() {
  const mix = mixFor(trackId);
  let total = ENGINE_BASE_COST;
  const counts = [];
  for (const [key, L] of Object.entries(mix.lanes || {})) {
    for (const e of (L.effects || [])) {
      if (e.bypass) continue;
      const def = EFFECT_BY_ID[e.id];
      if (def) { total += def.cost || 0.1; counts.push(def.name); }
    }
  }
  if ((mix.lanes && Object.values(mix.lanes).some((L) => (L.send?.reverb ?? 0) > 0))) total += 0.73;
  // Voices are NOT in this number. `ENGINE_BASE_COST` is the engine's own measured
  // cost with its own hand-written voices in it, and a Tone voice replacing one costs
  // something else again — nobody has measured what. Rather than quietly under-report,
  // the readout says how many are running and admits the figure does not cover them.
  const voiced = Object.entries(VOICE_LANES)
    .filter(([, seam]) => VOICES[mix.voice?.[seam.voiceKey]] || mix.voiceParams?.[seam.voiceKey])
    .map(([lane]) => lane);
  const el = $('cpu');
  el.textContent = `~${total.toFixed(0)}%${voiced.length ? '+' : ''}`;   // the caption beside it says CPU
  el.title = `${counts.length} active effect${counts.length === 1 ? '' : 's'}`
    + (counts.length ? `: ${counts.join(', ')}` : '')
    + (voiced.length ? `\n${voiced.length} lane${voiced.length === 1 ? '' : 's'} on a synth voice`
      + ` (${voiced.join(', ')}) — not counted here, hence the +. No voice has been`
      + ' cost-measured the way the effects have.' : '')
    + `\nEngine alone is about ${ENGINE_BASE_COST}%. Rough estimate on a desktop; audio runs on its own thread.`;
  el.classList.toggle('dirty', total > 45);   // a readout, not a label — see the header CSS
}

/**
 * Where the work stands against the file. Not a badge in the header any more: the
 * desk is for mixing, and a mix that is not in src/data/mix.js yet is not an alarm —
 * drafts are kept in localStorage, so the only thing at stake is whether the game has
 * heard it. So it is a dot on the drawer that holds Save, and the item inside says it
 * in words, naming the song it would write.
 */
function updateStatus() {
  updateCpu();
  const d = isDirty(trackId);
  // A library preset carrying unsaved edits is a change to the game that Save song
  // will not write — it belongs to voices.js, and only the panel's own Save puts it
  // there. So it lights the same lamp and says which sounds it means: the alternative
  // is a desk that looks saved while an hour of sound design is one reload from gone.
  const owed = [...dirtyLibraryVoices].map((id) => VOICES[id]?.label || id);
  $('navbtn').classList.toggle('unsaved', d || owed.length > 0);
  $('navbtn').title = [
    d ? `${track.title} has changes that are not in its song file yet` : '',
    owed.length ? `Unsaved preset edits: ${owed.join(', ')} — these live in the library,`
      + ' so Save song does not write them. Use the editor’s own Save.' : '',
  ].filter(Boolean).join('\n') || 'Open songs and file actions';
  // The label does not name the song — the menu is headed "this song", and an
  // imported title like CHECKOUT-PROMENADE-GARY-BRIGHT-ORGAN-DANCE-MIX would set the
  // width of the whole drawer. The name is in the tooltip, where it costs nothing.
  const save = $('save');
  const writable = track?.writable !== false;
  save.textContent = !writable ? 'Read-only MIDI import' : d ? 'Save song' : 'Saved — matches the file';
  save.disabled = !writable || !d;
  save.title = !writable ? 'This legacy MIDI import has no desk-owned file section to save'
    : d ? `Write ${track.title} into its own source file`
      : `${track.title} already matches its file`;
  const deleteButton = $('deletesong');
  if (deleteButton) {
    const scratch = isDeskSong(track) && track?.writable === true;
    deleteButton.hidden = !scratch;
    deleteButton.title = scratch
      ? `Permanently remove ${track.title} from src/data/imported and discard its desk history`
      : 'Only scratch songs created in this desk can be deleted';
  }
}

// The drawer is the one project-level surface. The song browser is rendered on every
// open so imported and newly-created scratch songs appear without a page reload.
function resetDrawerSections() {
  document.querySelectorAll('#navdrawer .drawersection[data-drawer-section]').forEach((section) => {
    section.classList.remove('collapsed');
    section.querySelector('.drawersectiontoggle')?.setAttribute('aria-expanded', 'true');
  });
}

document.querySelectorAll('#navdrawer .drawersectiontoggle').forEach((toggle) => {
  toggle.onclick = (ev) => {
    ev.stopPropagation();
    const section = toggle.closest('.drawersection');
    const collapsed = section.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
  };
});

function openDrawer() {
  const drawer = $('navdrawer');
  if (drawer.classList.contains('show')) { closeMenu(); return; }
  closeMenu();
  resetDrawerSections();
  $('songsearch').value = '';
  renderSongBrowser();
  drawer.classList.add('show');
  $('drawerbackdrop').classList.add('show');
  drawer.setAttribute('aria-hidden', 'false');
  $('drawerbackdrop').setAttribute('aria-hidden', 'false');
  $('navbtn').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => $('songsearch').focus());
}

$('navbtn').onclick = (ev) => { ev.stopPropagation(); openDrawer(); };
$('drawerclose').onclick = closeMenu;
$('drawerbackdrop').onclick = closeMenu;
addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && $('navdrawer').classList.contains('show')) {
    // Stopped as well as handled, and immediately: Escape is the desk's panic, and that
    // handler listens on this same window. Closing the drawer you just opened is not a
    // reason to cut the sound as well.
    ev.preventDefault();
    ev.stopImmediatePropagation();
    closeMenu();
  }
});
$('navdrawer').addEventListener('click', (ev) => {
  const button = ev.target.closest('button');
  if (!button || button.id === 'navbtn' || button.id === 'newsong') return;
  // Keep font and playhead controls live while the drawer is open; action buttons
  // leave the drawer before opening a modal, render job, or file chooser.
  if (!['save', 'revert', 'history', 'resetsong', 'deletesong', 'renderwav', 'auditionwav', 'midi',
    'importmidi', 'exportjson', 'voicelibbtn'].includes(button.id)) return;
  closeMenu();
});

// ---- typeface --------------------------------------------------------------
// A desk you stare at for hours may as well be set in something you like. Only
// fonts actually on this machine are offered: a list of names that quietly fall
// back to the same default is a list of one font wearing ten labels.
const FONTS = [
  ['System mono', 'ui-monospace, SFMono-Regular, Menlo, monospace'],
  ['SF Mono', '"SF Mono", ui-monospace, monospace'],
  ['Menlo', 'Menlo, monospace'],
  ['Monaco', 'Monaco, monospace'],
  ['JetBrains Mono', '"JetBrains Mono", monospace'],
  ['IBM Plex Mono', '"IBM Plex Mono", monospace'],
  ['Fira Code', '"Fira Code", monospace'],
  ['Source Code Pro', '"Source Code Pro", monospace'],
  ['Iosevka', 'Iosevka, monospace'],
  ['Avenir Next', '"Avenir Next", sans-serif'],
  ['Helvetica Neue', '"Helvetica Neue", sans-serif'],
  ['Futura', 'Futura, sans-serif'],
  ['Optima', 'Optima, sans-serif'],
];

/**
 * Is this family really installed? document.fonts.check answers yes for names it
 * has never heard of, so this measures instead: a string set in the family and in a
 * generic comes out the same width only when the family fell back to the generic.
 */
const fontProbe = document.createElement('canvas').getContext('2d');
function fontInstalled(name) {
  const probe = 'mmmMMMwwWWiil1@%#';
  for (const generic of ['monospace', 'serif']) {
    fontProbe.font = `72px ${generic}`;
    const base = fontProbe.measureText(probe).width;
    fontProbe.font = `72px "${name}", ${generic}`;
    if (Math.abs(fontProbe.measureText(probe).width - base) > 0.5) return true;
  }
  return false;
}

const FONT_KEY = 'mash-mixer-font';
const fontSel = $('font');
for (const [name, stack] of FONTS) {
  if (name !== 'System mono' && !fontInstalled(name.replace(/"/g, ''))) continue;
  const o = document.createElement('option');
  o.value = stack; o.textContent = name;
  fontSel.append(o);
}
const savedFont = localStorage.getItem(FONT_KEY);
if (savedFont && [...fontSel.options].some((o) => o.value === savedFont)) fontSel.value = savedFont;
const applyFont = () => {
  document.documentElement.style.setProperty('--font', fontSel.value);
  localStorage.setItem(FONT_KEY, fontSel.value);
  // Row heights move with the typeface, so the strips, the rack's floor and the
  // panel's reserved height all have to be measured again.
  requestAnimationFrame(() => { forgetStripMetrics(); reserveDevices(); fitStrips(); });
};
applyFont();
fontSel.onchange = () => { applyFont(); toast(`Set in ${fontSel.selectedOptions[0].textContent}`); };

// Colour is a desk preference, not part of a song. Keep it next to the typeface
// picker so a long listening session can change its atmosphere without touching
// any arrangement or mix data.
const THEMES = [
  ['default', 'Midnight'],
  ['amber', 'Amber CRT'],
  ['ocean', 'Ocean Terminal'],
  ['plum', 'Plum Night'],
  ['light', 'Light Paper'],
  ['midday', 'Midday'],
  ['dawn', 'Dawn'],
  ['dusk', 'Dusk'],
  ['oscar', 'Oscar'],
];
const THEME_KEY = 'mash-mixer-theme';
const themeSel = $('theme');
for (const [id, label] of THEMES) {
  const option = document.createElement('option');
  option.value = id; option.textContent = label;
  themeSel.append(option);
}
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme && THEMES.some(([id]) => id === savedTheme)) themeSel.value = savedTheme;
const applyTheme = () => {
  const id = themeSel.value;
  document.documentElement.toggleAttribute('data-mixer-theme', id !== 'default');
  if (id !== 'default') document.documentElement.dataset.mixerTheme = id;
  localStorage.setItem(THEME_KEY, id);
  // Anything that has to know whether it is drawing on paper or on slate reads this,
  // and it can only be read after the attribute is on the element.
  measureSurface();
};
const refreshThemeColours = () => {
  if (!track) return;
  // Track colours are inline because the same lane colour is shared by the rack,
  // arrangement, piano roll and step grid. Rebuild those views after a theme switch
  // so the inline values follow the new finite palette immediately.
  buildRack();
  buildArrangement();
};
applyTheme();
themeSel.onchange = () => {
  applyTheme();
  refreshThemeColours();
  toast(`Set ${themeSel.selectedOptions[0].textContent} theme`);
};

// The arrangement's note language is a desk preference beside Theme. It is deliberately
// not part of a song: changing how a pattern is seen must never dirty or rewrite music.
const noteVisualSel = $('notevisual');
for (const [id, label] of NOTE_VISUALS) {
  const option = document.createElement('option');
  option.value = id; option.textContent = label;
  noteVisualSel.append(option);
}
noteVisualSel.value = noteVisualMode;
const noteAnimationInput = $('noteanimation');
noteAnimationInput.checked = noteAnimation;

function applyNoteVisualPreferences({ render = true } = {}) {
  const arrange = $('arrange');
  if (arrange) {
    arrange.dataset.noteVisual = noteVisualMode;
    arrange.dataset.noteAnimation = noteAnimation ? 'on' : 'off';
  }
  localStorage.setItem(NOTE_VISUAL_KEY, noteVisualMode);
  localStorage.setItem(NOTE_ANIMATION_KEY, noteAnimation ? 'on' : 'off');
  if (render && track) buildArrangement();
}

applyNoteVisualPreferences({ render: false });
noteVisualSel.onchange = () => {
  noteVisualMode = noteVisualSel.value;
  applyNoteVisualPreferences();
  toast(`Showing ${noteVisualSel.selectedOptions[0].textContent}`);
};
noteAnimationInput.onchange = () => {
  noteAnimation = noteAnimationInput.checked;
  applyNoteVisualPreferences({ render: false });
  toast(noteAnimation ? 'Note playback accents on' : 'Note playback accents off');
};

// How far behind the graph the speakers actually are, beyond what the browser owns
// up to. songBeat() subtracts ctx.outputLatency already; Bluetooth, an interface
// with its own buffer, or a device that simply reports zero are what this is for.
// Remembered per machine, because that is what it is a property of.
// About three frames: the attack ramp on a note plus the trip from a rAF callback to
// the glass. Set by eye against a kick, and it is a default rather than a constant —
// a different screen or a different device wants a different number.
const PH_KEY = 'mash-mixer-playhead-ms';
const PH_DEFAULT = 50;
const storedPh = localStorage.getItem(PH_KEY);
let phOffset = storedPh == null || storedPh === '' ? PH_DEFAULT : (Number(storedPh) || 0);
const phInput = $('phoffset');
phInput.value = String(phOffset);

function setPhOffset(ms) {
  phOffset = clamp(Math.round(ms), -300, 300);
  phInput.value = String(phOffset);
  localStorage.setItem(PH_KEY, String(phOffset));
}
phInput.oninput = () => {
  // An empty box is someone part-way through typing a number, not a request for
  // zero. Storing 0 there quietly parks the line fifty milliseconds behind the
  // music with nothing on screen to say why — and it is remembered, so it stays
  // wrong across reloads.
  if (phInput.value.trim() === '') return;
  setPhOffset(Number(phInput.value) || 0);
};
phInput.onblur = () => { phInput.value = String(phOffset); };

// Tempo you can drag — half speed to hear what a reverb is really doing, or up ten to
// check the kick still fits, and then KEEP it if it was right.
//
// It used to be audition-only, on the reasoning that the bpm belongs to the song
// rather than to its mix and a desk should not quietly rewrite the composition. The
// first half of that is true and the conclusion was wrong: a tempo you drag and lose
// is a decision the desk cannot make. It is saved on the ARRANGEMENT instead, which
// is exactly the seam that already exists for this — the song stays written at the
// tempo it was written at, and the arrangement says what it is played at, the same way
// `order` overrides the bank's own order. So the drag is an ordinary song edit: ⌘Z
// undoes it, the dot on the hamburger notices it, Save writes it, the game plays it,
// and deleting the entry puts the composed tempo back.
//
// Click the readout to do exactly that.
const deskTempo = () => arrFor(trackId)?.bpm ?? track?.bank?.bpm ?? 120;
/** The tempo the song is WRITTEN at — what the arrangement's tempo is measured against. */
const composedTempo = () => track?.bank?.bpm ?? 120;
function showTempo() {
  const el = $('bpm');
  const bpm = Math.round(deskTempo());
  const own = bpm === Math.round(composedTempo());
  el.textContent = String(bpm);
  el.classList.toggle('tweaked', !own);
  el.parentElement.title = own
    ? 'Drag to change the tempo this song plays at — saved with the song'
    : `Played at ${bpm} bpm, written at ${Math.round(composedTempo())}`
      + ` — click to go back to that. Saved with the song.`;
}
/**
 * Put the tempo in force onto the engine, the echo and the readout.
 *
 * Audio.bpm is set here rather than left to the bank: a stopped desk has no live bank
 * for `setArrangement` to swap, and the keyboard and the note auditions still have to
 * play at the tempo the readout is showing.
 */
function pushTempo() {
  const bpm = deskTempo();
  Audio.bpm = bpm;
  Audio.setDelay({});                 // the echo is tempo-synced, so it follows
  Audio.mixer?.retune(bpm);           // and so is every division-based insert
  showTempo();
}
function setDeskTempo(v) {
  const bpm = clamp(Math.round(v), 40, 220);
  if (bpm === Math.round(deskTempo())) return;
  // Deliberately NOT through `applyArrangementEdit`. That path re-pushes the whole mix
  // at the engine and rebuilds every row of the bar grid, which is right for an edit
  // that moves a bar and wrong forty times during one drag: a tempo moves no bars and
  // no lanes. What it does need is what every arrangement edit needs — an undo step,
  // the draft, the engine, the screen — so those four are here rather than borrowed.
  //
  // One step per drag rather than one per pixel: pushUndo coalesces on the tag.
  pushUndo('bpm');
  // Null when the drag lands back on the composed tempo, so the entry goes away
  // rather than restating what the bank already says — see entryOf. Built against the
  // song's OWN bank, like every other entry — see editBank.
  const entry = entryOf(editBank(),
    setTempo(arrDraftOf(), bpm === Math.round(composedTempo()) ? null : bpm));
  arrDraft[trackId] = entry;
  localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
  Audio.setArrangement(entry);
  pushTempo();
  buildTimeline();                    // the clock and the song length move with it
  updateStatus();                     // and the dot that says the file has not heard it
}
dragNumber($('bpm'), {
  value: deskTempo,
  set: setDeskTempo,
  range: 80, step: 1,
  onClick: () => {
    if (Math.round(deskTempo()) === Math.round(composedTempo())) return;
    setDeskTempo(composedTempo());
    toast(`Back to ${Math.round(composedTempo())} bpm — the tempo this song is written at`);
  },
});

// ---- on-screen keyboard -----------------------------------------------------
//
// Play the selected channel. Everything else on this desk asks what a song already
// sounds like; this asks what a channel sounds like, which is the question you have
// while you are choosing its voice, dialling its filter or listening to what an
// effect did to it — and the only way to answer it before was to run the song and
// wait for the part to come round.
//
// The note is played by the sequencer, through the engine's own previewNote: the
// channel's voice, its note length, its gain, and its strip with everything on it.
// So a muted channel is silent here too, and a channel goes quiet while another is
// soloed. That is the desk being honest rather than the keyboard being broken — the
// title bar says which, in amber, when it happens.
//
// Three ways in, one seam: the drawn keys, the computer keyboard, and a MIDI port all
// end at the same one-note call. A melodic channel gets keys; a drum channel gets the
// song's kit as pads, because two octaves that all play the same kick is a piano
// pretending to be a drum machine.

// Held, not looked up — the same reason `voiceEditEl` is. Docked into the preset
// library this element is MOVED into that window, and the library rebuilds itself on
// every keystroke in its search box: for the moment between the rebuild emptying the
// old slots and the desk parking it into the new ones, the keyboard is detached, and
// `getElementById` does not find a detached element. A lookup there comes back null and
// takes the sequencer's own tick down with it.
const oskEl = $('osk');
const OSK_POS_KEY = 'mash-mixer-osk-pos';

// ---- the key the keyboard is in ---------------------------------------------
//
// A filter over a chromatic keyboard, not a re-lettering of it: the keys stay where a
// piano puts them, the ones outside the key are dimmed, and the bench's figures land on
// the ones inside. Remembered, because it is a preference about how you play rather
// than a property of any song — see SCALES.
//
// Out-of-scale keys still SOUND. A guide that greys the wrong notes helps; one that
// refuses them is an instrument arguing with you, and the accidental you wanted is
// always the one it would have refused.
const OSK_SCALE_KEY = 'mash-mixer-osk-scale';
let oskScaleRoot = 0;
let oskScaleId = 'chromatic';
try {
  const saved = JSON.parse(localStorage.getItem(OSK_SCALE_KEY) || 'null');
  if (saved && SCALE_BY_ID[saved.id]) { oskScaleId = saved.id; oskScaleRoot = saved.root | 0; }
} catch { /* the default key is C chromatic, which is no key at all */ }

/** What the keyboard is set to — `{ root, steps }`, or null when it is chromatic. */
function oskScale() {
  const steps = SCALE_BY_ID[oskScaleId]?.steps;
  return steps ? { root: oskScaleRoot, steps } : null;
}

function setOskScale({ root, id }) {
  if (root != null) oskScaleRoot = ((root % 12) + 12) % 12;
  if (id != null && SCALE_BY_ID[id]) oskScaleId = id;
  localStorage.setItem(OSK_SCALE_KEY, JSON.stringify({ root: oskScaleRoot, id: oskScaleId }));
  if (oskShown()) buildOsk();
  voiceLibrary.refresh();          // the bench's readout is in this key too
}
// How many octaves a PIANO draws here — three, plus the octave above's C so it ends on
// one. It is what the computer keyboard reaches: two full octaves of letters and the
// start of a third, see QWERTY_SEMIS, so the board on screen and the board under your
// fingers are the same instrument and the letters stop at the edge of it rather than a
// third of the way along.
//
// It is not the span in a KEY. A scale gets the same key at the same size and as many of
// them as the space holds — see oskKeyPlan — so three octaves of white keys is what sets
// how big a key is, and a pentatonic drawn with that key reaches four and a bit.
const OSK_OCTAVES = 3;
// The piano's own count, which is the reference every board is drawn against.
const OSK_KEYS = 7 * OSK_OCTAVES + 1;
// The FLOATING board's key, in pixels. Out on the desk there is no band to divide, so
// this is the size rather than the result of one — and the ratio the docked board's black
// keys keep, since it is the only place the two widths are stated together.
//
// 39, not 26. It is the whole of how big the mini keyboard is: three octaves is the span
// wherever it is drawn (see OSK_OCTAVES), so a wider key is a wider window, and at 26 it
// was a keyboard you aimed a mouse at rather than one you played.
const KEY_W = 39;                        // white key width, px
const BLACK_W = 26;
// A black key as a fraction of a white one. The layout is built in units of a key rather
// than in pixels — see buildOskKeys — so this, not BLACK_W, is what it positions with.
const BLACK_UNIT = BLACK_W / KEY_W;
// ...and how tall each is AT that width. Not four independent numbers: a key is a shape,
// and these four are it. Every board scales the set by whatever its own key width came
// out at — see buildOskKeys — so the docked one in a wide band and the floating one in
// its window are the same instrument at two sizes rather than two keyboards.
const KEY_H = 129;
const BLACK_H = 81;
const WHITE_SEMIS = [0, 2, 4, 5, 7, 9, 11];
/** Black key semitone -> the white key of its octave it sits after. */
const BLACK_SEMIS = [[1, 0], [3, 1], [6, 3], [8, 4], [10, 5]];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// The computer keyboard laid out the way every DAW lays it out: a PAIR of rows per
// octave, whites on the row you rest on and blacks on the row above, where a piano has
// them. The bottom pair is the lower octave — Z X C V B N M with S D G H J over it — and
// the QWERTY pair is the one above, Q W E R T Y U with 2 3 5 6 7 over that. Two hands,
// two octaves, and the shape under your fingers is the shape on the screen.
//
// It was one row before — A W S E D… — which is a piano's two rows folded onto a
// keyboard's two rows once. That reaches sixteen semitones and then stops in the middle
// of an octave, so anything wider than a fifth and a bit meant the octave buttons.
//
// The third octave gets what is left of the rows, which is C up to G — `[ = ]` carry on
// past P exactly where the pattern puts them, F on the white key at the end of the row
// and F# on the number key above the gap it leaves. `[` and `]` nudge the playhead when
// the keyboard is not catching; while it is, they are notes, which is the same bargain M
// S R B L already made.
//
// A keyboard is two pairs of rows and a bit, and G is where the bit runs out. The notes
// past it are still drawn, still clickable, and still reachable by shifting the octave —
// see setOskOctave.
const QWERTY_SEMIS = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  q: 12, 2: 13, w: 14, 3: 15, e: 16, r: 17, 5: 18, t: 19, 6: 20, y: 21, 7: 22, u: 23,
  i: 24, 9: 25, o: 26, 0: 27, p: 28, '[': 29, '=': 30, ']': 31,
};
/**
 * Unlabelled seconds — a key that plays a note some other key already draws.
 *
 * The bottom row ends on B and the note you want next is a C, which lives on the row
 * above: a run up the octave has to leave the row it started on at the last step. `,` is
 * that C without the jump — it is where your hand already is, one key past M.
 *
 * Not drawn on the keyboard, and deliberately. Q is what that note is called here; a key
 * wearing two letters is a keyboard asking you which one you meant.
 */
const QWERTY_ALIASES = { ',': 12 };
const SEMI_QWERTY = Object.fromEntries(Object.entries(QWERTY_SEMIS).map(([k, s]) => [s, k]));
// The kit under the same hand: the home row, one letter per pad, left to right.
const PAD_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
// In a key the keys are all one kind and so are the letters: one per degree, straight
// across. The piano's paired rows exist to mirror black keys and white ones and in a key
// there are none to mirror — so these are whole rows, taken bottom upwards for the same
// reason the piano's are: low notes under the low row.
//
// Three rows, because three octaves of a scale is more degrees than one row has letters
// for. It was the home row alone, which ran out ten keys in and left the rest of the
// board unlabelled — a keyboard that stops telling you what plays it half way along.
const SCALE_KEYS = [
  'z', 'x', 'c', 'v', 'b', 'n', 'm',
  'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';',
  'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
];
/**
 * General MIDI's drum notes, for the pads.
 *
 * Every drum machine and every pad controller sends these, so a kick pad plays the
 * kick rather than whichever pad happens to be third from the left. A note this does
 * not name falls back to position, which is what an ordinary keyboard sends.
 */
const GM_DRUMS = {
  35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'clap', 40: 'snare',
  42: 'hats', 44: 'hats', 46: 'ohats', 49: 'crash', 51: 'crash', 57: 'crash',
};

let oskOct = 3;
let oskLane = null;                      // the lane the keys on screen were built for
let oskBenchId = null;                   // ...or the library preset, if the bench has one
let oskCatch = false;                    // is the computer keyboard playing it?
const oskHeld = new Set();               // held computer keys, so auto-repeat is one note
// Preview notes that are still sounding, keyed by the same `src` as recordOff —
// `k:a` for the computer A key, `m:60` for MIDI note 60. On note-off the engine
// triggers the synth's release envelope instead of letting a fixed sequencer
// length cut it off.
const previewHeld = new Map();           // src → { laneKey, freq }
const oskHeldVisuals = new Map();        // src → the key or pad it is holding lit

function oskHoldVisual(src, el) {
  if (!src || !el) return;
  const previous = oskHeldVisuals.get(src);
  if (previous && previous !== el) {
    oskHeldVisuals.delete(src);
    if (![...oskHeldVisuals.values()].includes(previous)) previous.classList.remove('held');
  }
  oskHeldVisuals.set(src, el);
  el.classList.add('held');
}

function oskReleaseVisual(src) {
  const el = oskHeldVisuals.get(src);
  if (!el) return;
  oskHeldVisuals.delete(src);
  if (![...oskHeldVisuals.values()].includes(el)) el.classList.remove('held');
}

function clearOskHeldVisuals() {
  for (const el of oskHeldVisuals.values()) el.classList.remove('held');
  oskHeldVisuals.clear();
}

/**
 * ---- recording -------------------------------------------------------------------
 *
 * The keyboard has played a channel for a while; this is the switch that makes it
 * WRITE. It sits here rather than beside the transport because it is a property of the
 * input: which channel the notes go to, which octave the keys are in and whether the
 * computer keys are yours are all decisions taken in the keyboard's own title bar, and
 * where the notes land is the last of them.
 *
 * Armed is not recording. Arming while the song is stopped is legal and is the count-in
 * you get for nothing — capture begins the instant you hit space, and there is no click
 * track in this engine to count you in with anyway. Looping two bars is a better one:
 * you hear the bar before your entry on every pass.
 *
 * `recOpen` maps a SOURCE key to the take's token, so a note-off can find the note-on
 * it belongs to. Three inputs, three namespaces, because a MIDI note 60 and the letter
 * `c` and pointer 3 are three different fingers and may be down at once:
 *
 *   k:z    a computer key            m:60   a MIDI note number
 *   p:3    a pointer on a key or pad
 */
let recArmed = false;
let recTake = null;
let recGrid = 1;                         // sixteenths. The format has nothing finer.
let recLastBeat = -1;
let recLastHeard = 0;
let recChord = null;                     // the note that anchors the current cluster
let recSessionNotes = 0;                 // everything played since arming, for the completion toast
const recSessionLanes = new Set();       // ...and which channels it went to, for the toast
let recChordWarned = false;              // the monophonic warning, once per take
let recUndoPushed = false;                // one undo snapshot for the whole take
let recLiveDirty = false;                 // beat commits waiting for final persistence/redraw
const recOpen = new Map();

const recording = () => recArmed && playing;

const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12);
const midiName = (m) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const oskShown = () => oskEl.classList.contains('show');
/** Master and the send returns are not played by anything — they are where things go. */
const oskPlayable = (key) => !!key && !key.startsWith('__');

/**
 * Which octave to open a channel on: the one its own lowest note is in.
 *
 * A bass keyboard that opens at middle C is two octaves of notes the part never
 * plays, and a twinkle that opens at C1 is silence you have to go looking for the
 * cause of. The song already knows where the part lives.
 */
function laneOctave(key) {
  const b = viewBank();
  let low = null;
  const scan = (block) => {
    const arr = block && block[key];
    if (!Array.isArray(arr)) return;
    for (const v of arr) {
      for (const f of Array.isArray(v) ? v : [v]) {
        if (typeof f === 'number' && f > 0 && (low == null || f < low)) low = f;
      }
    }
  };
  scan(b);
  for (const sec of b?.sections || []) scan(sec);
  // A percussion lane holds booleans and a silent one holds nothing: both land here,
  // and the middle of the keyboard is as good an answer as there is.
  if (low == null) return clampOskOctave(3);
  return clampOskOctave(Math.floor(Math.round(12 * Math.log2(low / 440) + 69) / 12) - 1);
}

/**
 * The preset the keyboard should play instead of a channel, if any.
 *
 * While the library is open it owns the keys. That is the point of it being open: you
 * are working on a preset, not on a channel, and the sound you want under your fingers
 * is the one whose parameters are in front of you. It reverts to the selected channel
 * the moment the library closes. See tools/mixer-voice-library.js.
 */
const oskBench = () => voiceLibrary.picked;

// ---- recording: capture, buffer, flush ---------------------------------------------

/**
 * The region a take is being played into: the armed loop, or the whole song.
 *
 * It is what a note rounds INSIDE. A pickup played thirty milliseconds before the
 * loop's downbeat has to come round to the top of the loop rather than falling off the
 * end of it, which is the one place recording needs to know that a loop is armed.
 */
function recRegion() {
  const { totalSteps } = songShape();
  if (loopOn && locA != null && locB != null) {
    const start = Math.min(locA, locB);
    const end = Math.max(locA, locB);
    return { from: start, span: end - start };
  }
  return { from: 0, span: totalSteps };
}

/** The take, made on first use. Reading is the desk's business; the buffer is not. */
function ensureTake() {
  if (recTake) return recTake;
  recTake = createTake({
    // Through the delta chain and then the bank, against the bank as it is WRITTEN —
    // the read half of the write this will go out through. `viewBank()` here would
    // seed an overdub off the ARRANGED song and quietly drop the previous edit; see
    // the note over `editBank`.
    read: (bar, key) => readBarLane(editBank(), arrDraftOf(), bar, key),
    resizable: rollResizable,
    // Against the bank as it is WRITTEN, and read fresh each time: changing a channel's
    // preset mid-take changes whether that channel can hold a chord.
    stacks: (lane) => polyLane(editBank(), lane),
  });
  return recTake;
}

/**
 * One played note, on its way into the song.
 *
 * Called from the same two functions that sound it, so all three inputs are recorded by
 * one hook. Everything that decides WHERE is here; everything that decides WHAT is in
 * tools/lib/note-recorder.js and the roll's own note semantics underneath it.
 */
function recordNote(laneKey, midi, freq, src) {
  if (!recording() || !laneKey || !track) return;
  const heard = heardStepNow();
  if (heard == null) return;
  const { from, span } = recRegion();
  // The first note of a cluster decides the step for the rest of it, or a chord whose
  // notes land either side of a rounding boundary comes out as a note plus a dyad a
  // step later. See `chordAnchor`.
  const picked = chordAnchor(recChord, performance.now(),
    quantiseStep(heard, { grid: recGrid, from, span }));
  recChord = picked.anchor;
  const step = picked.step;
  const bar = barOfStep(step);
  const inBar = stepInBar(step);
  // A monophonic lane holds ONE frequency per step, so a chord played into one keeps
  // only its last note — not a bug to be fixed but the shape of the bank. Said out
  // loud, once per take, because silently keeping one note of three is indistinguishable
  // from the recorder dropping them.
  if (!polyLane(editBank(), laneKey) && laneKind(laneKey) !== 'perc' && !recChordWarned) {
    const held = recTake?.entries().find((e) => e.bar === bar && e.lane === laneKey);
    if (held && held.notes16[inBar] != null) {
      recChordWarned = true;
      // Only the gesture lanes and the two word lanes reach this now, and for each of
      // them a step is not a pitch: a sweep is the start of a shape, `vox` picks a word.
      // Naming that is more use than "one note at a time", which invites the fair
      // question of why, given you can hear yourself play two.
      toast(`${targetLabel(laneKey)} plays one shape per step rather than notes, so it`
        + ' cannot hold a chord', 6000);
    }
  }
  const token = ensureTake().add({ bar, lane: laneKey, step: inBar, midi, freq });
  if (!token) return;
  recSessionNotes += 1;
  // Remembered against the source so the note-off can find it, and against the step it
  // went down on so the length can be measured from there rather than from the wall
  // clock — a tempo drag mid-take would otherwise change what a held key meant.
  // Everything the note-off needs, and everything needed to put this note back into a
  // FRESH take if a flush lands while the key is still down — see `carryHeld`. `at` is
  // the original press either way, so the length is measured from where the note really
  // started rather than from wherever the last flush happened to be.
  markRecordedVisual(laneKey, bar, inBar, true);
  if (src) recOpen.set(src, { token, at: heard, bar, lane: laneKey, step: inBar, midi, freq });
}

/**
 * Put the notes that are still HELD back into the take a flush just emptied.
 *
 * The bug this exists for, and it is worth writing down because the cause was a speed-up
 * rather than an edit to any of this: a flush clears the take, and clearing the take
 * throws away the open-note tokens with it. A note-off arriving afterwards has nothing to
 * attach a length to, so it writes none and the note keeps the roll's one-step default.
 *
 * That was nearly invisible while the flush was on the bar line — two seconds, and most
 * notes are released inside the bar they were played in. Making the flush four times
 * faster made it near-universal: at 500ms almost every note worth calling held spans a
 * boundary, and every length silently became a sixteenth.
 *
 * So the held notes are re-added to the new take and their tokens repointed. Re-adding is
 * safe and cheap: the note has just been written, so the fresh seed already contains it,
 * `noteCell` puts the same frequency back on the same step, and `noteLength` carries over
 * whatever length was there. Nothing about the recorded note changes — only the take's
 * ability to still be told how long it turned out to be.
 */
function carryHeld() {
  if (!recTake || !recOpen.size) return;
  for (const [src, held] of recOpen) {
    const token = recTake.add({
      bar: held.bar, lane: held.lane, step: held.step, midi: held.midi, freq: held.freq,
    });
    // Not through `recordNote`: this is the same note, not a second one, so it must not
    // count again — and re-seeding is what makes the length reachable, not a new press.
    if (token) recOpen.set(src, { ...held, token });
    else recOpen.delete(src);
  }
}

/** That note came up. Nothing to do at all unless something measured a length. */
function recordOff(src) {
  const held = src && recOpen.get(src);
  if (!held) return;
  recOpen.delete(src);
  if (!recTake) return;
  const heard = heardStepNow();
  if (heard == null) return;
  const { span } = recRegion();
  recTake.close(held.token, heldLength(held.at, heard, { grid: recGrid, span }));
  markRecordedVisual(held.lane, held.bar, held.step, false);
}

/** Finish every kind of preview input, not just its recording token. */
function releasePreview(src) {
  const held = previewHeld.get(src);
  if (!held) return;
  Audio.releasePreviewNote(held.laneKey, held.freq);
  previewHeld.delete(src);
}

function oskRelease(src) {
  recordOff(src);
  releasePreview(src);
  oskReleaseVisual(src);
}

function releaseOskSources(prefix) {
  const sources = new Set([
    ...recOpen.keys(), ...previewHeld.keys(), ...oskHeldVisuals.keys(),
  ]);
  for (const src of sources) if (src.startsWith(prefix)) oskRelease(src);
}

/**
 * Hand the take to the song, as one arrangement edit per buffered beat.
 *
 * This is the bar grid's `commit()` with the selection replaced by the take, and for
 * the same reasons: each bar is written on its own, and each write is CHAINED onto the
 * draft the last one returned, so forking one bar cannot lose another's edit.
 *
 * `writeBarNotesShared`, not `writeBarNotes`. Recording into a loop is changing the
 * PATTERN: plumber plays section 0 for four bars, and a note forked into bar 1 alone
 * would come back every fourth pass — which reads as dropped notes rather than as an
 * edit. Shared is what makes a two-bar loop behave the way the ear expects.
 *
 * Beat commits deliberately skip the expensive desk redraw, synchronous localStorage
 * write and loop re-arm. Those are presentation/save work, not audio work; doing all
 * three every 500ms starves the sequencer while somebody is playing into it. The live
 * arrangement still receives the note at the beat, and the final take boundary does
 * the one redraw and persistence pass.
 */
function flushTake(reason) {
  const live = reason === 'beat';
  if (!recTake?.count()) return false;
  const eb = editBank();
  let d = arrDraftOf();
  const entries = recTake.entries();
  for (const { bar, lane } of entries) recSessionLanes.add(lane);
  // Cleared BEFORE the apply, not after: `applyArrangementEdit` can refuse an edit and
  // undo it, and a take still sitting in the buffer would be written again on the next
  // beat and refused again, for ever.
  //
  // `recOpen` is NOT cleared. A key that is still down has not finished being a note, and
  // dropping it here is what made every held note come out a sixteenth long.
  recTake.clear();
  for (const { bar, lane, notes16, lengths16 } of entries) {
    d = writeBarNotesShared(eb, d, bar, lane, notes16, lengths16);
  }
  // ALWAYS silent. The summary belongs to the take ending, not to a write — and those
  // are not the same moment: by the time you disarm, the last beat has usually already
  // taken the buffer, so a toast hung off the final write fires only if you happened to
  // stop within half a second of playing. `endTake` announces instead.
  //
  // Four writes a bar is four times the notice anyway, and a toast twice a second is not
  // notice, it is weather.
  //
  // One snapshot covers the whole take. Beat commits can be separated by more than the
  // ordinary 700ms gesture coalescing window, so do not rely on the generic tag alone.
  const committed = applyArrangementEdit(d, null, {
    undo: !recUndoPushed,
    undoTag: 'record',
    // The loop has not moved — note recording changes lane data, not the loop region.
    atStep: loopOn ? loopAnchor : Audio.step,
    render: !live,
    persist: !live,
    rearmLoop: !live,
  });
  if (!committed) return false;
  recUndoPushed = true;
  recLiveDirty = live;
  // After the write, so the re-seeded notes read a draft that already holds them.
  carryHeld();
  if (!live) {
    stepSeq.refresh();
    pianoRoll.refresh();
  }
  return true;
}

/** Finish a take whose beat commits already reached the live engine. */
function finalizeLiveTake() {
  if (!recLiveDirty) return;
  localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
  buildTimeline();
  buildArrangement();
  stepSeq.refresh();
  pianoRoll.refresh();
  updateStatus();
  recLiveDirty = false;
}

/**
 * Drop what has not been written yet. Part of what ⎋ means while recording — the panic
 * takes this with it, so the take ends where the sound did.
 *
 * Note what this is NOT: it is not "throw the take away". The take is written every beat,
 * so by the time you reach for Escape almost all of it is already in the song and the
 * buffer holds at most half a second of playing. Undoing the rest is ⌘Z's job, and the
 * toast says so rather than letting Escape claim more than it does.
 *
 * That was a fair description when the flush was on the bar line and a whole bar could be
 * in flight. It stopped being one when the flush got four times faster, which is the kind
 * of thing a speed-up quietly breaks.
 */
function discardTake() {
  const n = recTake?.count() || 0;
  recTake?.clear();
  recOpen.clear();
  // The session totals go too, or `endTake` announces a take that was just abandoned.
  recSessionNotes = 0;
  recSessionLanes.clear();
  recUndoPushed = false;
  return n;
}

/**
 * Close every key that is still down, flush, and say what was recorded.
 *
 * Called when the take is ending rather than merely crossing a beat. A note held when the
 * transport stops has a real length — the time between the press and the stop — and
 * dropping it would make the last note of every take the only one with no phrasing on it.
 *
 * The summary lives here rather than on the final write, because the final write usually
 * is not the final anything: a beat flush has almost always emptied the buffer already,
 * so a toast hung off it fired only when you stopped inside half a second of playing.
 * Announced from the session totals instead, which are true whenever this is called.
 *
 * `announce: false` for undo, which flushes only so that ⌘Z has the take to remove — and
 * "Recorded 6 notes" a moment before taking them away is a lie about what just happened.
 */
function endTake(reason, { announce = true } = {}) {
  if (recTake) for (const src of [...recOpen.keys()]) oskRelease(src);
  flushTake(reason);
  finalizeLiveTake();
  if (announce && recSessionNotes > 0) {
    const lanes = [...recSessionLanes].map(targetLabel).join(', ');
    toast(`Recorded ${recSessionNotes} note${recSessionNotes === 1 ? '' : 's'}`
      + `${lanes ? ` — ${lanes}` : ''} — ⌘Z to undo, Save to keep it`, 5000);
  }
  recSessionNotes = 0;
  recSessionLanes.clear();
  recUndoPushed = false;
}

/**
 * The BEAT is the commit boundary.
 *
 * It was the bar line, and the bar line is too slow to play against: a note does not
 * appear in the roll until the take is written, so at 120bpm you could play something
 * and watch two seconds of nothing before it turned up. Long enough to think the
 * recorder had missed it and play it again.
 *
 * A beat is four times sooner — 500ms at 120bpm — and costs nothing, because the undo
 * steps coalesce (see `flushTake`) and the intermediate writes are silent. The whole
 * take is still one ⌘Z.
 *
 * Everything buffered goes, including the beat just left. Holding back "the beat under
 * the playhead" is the tempting mistake: in a one-bar loop the playhead comes back round
 * to it, and the buffer would never flush at all. Flushing twice is harmless — the next
 * entry re-seeds from a draft that already holds the earlier notes.
 */
function recordFollow(heardStep) {
  const beat = Math.floor(heardStep / 4);
  if (!recording()) { recLastBeat = beat; recLastHeard = heardStep; return; }
  // Either a new beat, or time went backwards — which is the loop coming round, and on
  // a short loop it is the only signal there is.
  if (beat !== recLastBeat || heardStep < recLastHeard) flushTake('beat');
  recLastBeat = beat;
  recLastHeard = heardStep;
}

/**
 * Arm, or stop.
 *
 * Arming OPENS the keyboard if it is closed, which is what lets the gate below stay in
 * place. The computer keys cannot be un-gated — the desk's letters are its shortcuts,
 * and `oskCatch` is the negotiated hand-over — and MIDI could be, safely, but should
 * not: a note-on writing into a song with no keyboard on screen, no channel name in
 * front of you and no armed lamp anywhere is a song changing for reasons you cannot
 * see. Since arming opens the keyboard, the gate costs the user nothing.
 */
function setRecord(on) {
  if (on === recArmed) return;
  recArmed = on;
  if (on) {
    // The keyboard is NOT opened any more. MIDI reaches the song without it, and the
    // arm lives in the header where you can see it whatever is shut — so a window is
    // something you open to play with a mouse, not a tax on arming. Only the computer
    // keys still need it, and `oskCatch` is its own switch.
    const heard = heardStepNow();
    recLastBeat = heard == null ? -1 : Math.floor(heard / 4);
    recLastHeard = heard ?? 0;
    recSessionNotes = 0;
    recSessionLanes.clear();
    recUndoPushed = false;
    recLiveDirty = false;
    recChord = null;
    recChordWarned = false;
    // An imported .mid has no desk marker, so Save is off on it — see `writable`. The
    // take will play, and localStorage will keep it between refreshes, but it can never
    // reach the file. Better said once, on arming, than found out afterwards.
    if (track && track.writable === false) {
      toast('Recording, but this song came from a .mid and cannot be saved', 5000);
    } else if (!oskPlayable(selectedLane)) {
      toast('Select a channel first — that is where the notes would go');
    } else {
      toast(playing
        ? `Recording into ${targetLabel(selectedLane)} — ⇧R to stop, ⎋ to stop everything`
        : `Armed on ${targetLabel(selectedLane)} — recording starts when the song does`);
    }
  } else {
    endTake('disarm');
  }
  syncRecordUi();
}

/** Two states, and they have to look different: armed is not yet recording. */
function syncRecordUi() {
  // Both buttons, because there are two now: one in the header that is always reachable,
  // one in the keyboard's title bar beside the inputs it decides the fate of. Two
  // controls, one fact — so neither is the source of truth and both are told.
  for (const btn of [oskEl.querySelector('.oskrec'), $('recbtn')]) {
    if (!btn) continue;
    btn.classList.toggle('on', recArmed);
    btn.classList.toggle('live', recording());
  }
  $('midibtn')?.classList.toggle('on', midiOn);
  oskEl.classList.toggle('recording', recording());
  $('playhead').classList.toggle('recording', recording());
}

/**
 * Sound one key. The engine does the rest — see AudioSys.previewNote.
 *
 * `record` is how a GESTURE says it is not a note. A drag across the keys is a glide
 * and fires as fast as pointermove does; recording it would put sixteen semitones in a
 * bar every time somebody went looking for the note they wanted. So the pointer records
 * on the way DOWN and never on the way across, and `src` is the finger it came from, so
 * a note-off can find the note-on it belongs to.
 */
function oskPlay(midi, { record = true, src = null } = {}) {
  const bench = oskBench();
  // On the bench a drum IS tuned by the key: a percussion lane's `noteKey` is what
  // soloBank writes the pressed frequency into, and a preset kick you can play up and
  // down is how you find out whether its pitch envelope holds together. That is the
  // opposite of `oskHit` below, and deliberately so — there the kick belongs to a song.
  //
  // It is also why recording is unreachable from here: a preset on the bench has no
  // channel, and the lane its note goes down is an implementation detail of hearing a
  // sound with no strip on it. There is no lane for a take to be written to.
  if (bench) {
    const freq = midiFreq(midi);
    // Only Tone-pool synths sustain — GameSynth, noise and drum are one-shots
    // whose full envelope is scheduled at note-on and cannot be note-off'd.
    const bv = VOICES[bench];
    if (src && bv && bv.kind === 'tone' && bv.synth !== 'GameSynth' && bv.synth !== 'AdditiveSynth') {
      previewHeld.set(src, { laneKey: benchLane(bv), freq });
    }
    benchPlay(Audio, bench, freq, { bpm: deskTempo() });
    return;
  }
  if (!oskPlayable(selectedLane)) return;
  const freq = midiFreq(midi);
  if (src) {
    const lv = voiceOf(engineBank(), selectedLane);
    if (lv && lv.kind === 'tone' && lv.synth !== 'GameSynth' && lv.synth !== 'AdditiveSynth') {
      previewHeld.set(src, { laneKey: selectedLane, freq });
    }
  }
  lanePreview(selectedLane, freq);
  if (record) recordNote(selectedLane, midi, freq, src);
}

// ---- when a CHANNEL preview is allowed to sound ------------------------------
//
// The same rule the bench has, for the other half of the keyboard.
//
// `previewNote` schedules at `ctx.currentTime + 0.02`, and the audio clock advances in
// blocks — several calls inside one block read the same `currentTime` and therefore ask
// for the same instant. One note at a time that never happens; a SWEEP across the keys
// fires as fast as pointermove does, and the notes land on a voice pool two slots deep
// where Tone requires each slot's times to be non-decreasing. Two at one instant is a
// thrown assert rather than a glide.
//
// So the desk hands out times rather than letting each key ask for one: the time you
// asked for, or the earliest still legal, whichever is later. A millisecond apart is
// inaudible in a glide, and it is all the assert wants.
//
// Keyed by LANE. The pool is per (lane, voice, echo), and a lane plays one voice at a
// time — changing the voice builds a new pool with an empty timeline, and the mark
// resetting with it is exactly right.
const PREVIEW_GAP = 0.001;
let previewLastAt = 0;
let previewLastLane = null;

function lanePreview(laneKey, freq) {
  const ctx = Audio.ctx;
  if (!ctx) return;
  const now = ctx.currentTime;
  if (laneKey !== previewLastLane) { previewLastLane = laneKey; previewLastAt = 0; }
  const t = Math.max(now + 0.02, previewLastAt + PREVIEW_GAP);
  previewLastAt = t;
  Audio.previewNote(laneKey, freq, { bank: engineBank(), at: t - now });
}

/**
 * Sound one drum, at its own pitch.
 *
 * No frequency, deliberately: a percussion lane carries the note it is struck at as a
 * bank key, and the answer to "what does this kick sound like" is the kick the song
 * plays, not a kick tuned to whatever key happened to be under the finger.
 */
function oskHit(laneKey, { record = true, src = null } = {}) {
  if (!oskPlayable(laneKey)) return;
  // Through the same gate as the keys. A drag across the pads is a ROLL — the gesture
  // most likely to ask for two hits on one drum inside a single audio block.
  lanePreview(laneKey, null);
  // A roll is a real musical gesture, unlike a glide, and one day it should be
  // recordable. Not today: it arrives as pointermove and would need its own rate limit
  // to be a figure rather than a smear, and that is a decision about drumming rather
  // than about recording. See `oskPlay` on the `record` flag.
  if (record) recordNote(laneKey, null, null, src);
}

/** The channel, and what it is played by — the two things a preview is asking about. */
function oskTitle() {
  // Named as the library rather than as a lane, because it is not one. The bench lane
  // the note actually goes down is an implementation detail of hearing a preset with no
  // channel — putting `bass` in the title bar would claim the bass strip is involved,
  // and the whole point of the bench is that no strip is.
  const bench = oskBench();
  if (bench) return `Library · ${VOICES[bench]?.label || bench}`;
  if (!oskPlayable(selectedLane)) return 'Select a channel';
  const seam = seamFor(selectedLane);
  const voice = seam && VOICES[engineBank()?.[seam.voiceKey]];
  return `${targetLabel(selectedLane)} · ${voice ? voice.label : 'Engine voice'}`;
}

/**
 * Why a key might make no sound. Worth saying: everything the keyboard plays goes
 * through the channel strip, so the desk's own mute and solo silence it exactly as
 * they silence the song, and a keyboard that has gone quiet for a reason you set
 * yourself two minutes ago otherwise reads as a broken keyboard.
 */
function oskWhy() {
  // Nothing to say on the bench: it has no strip, so there is no mute, no solo and no
  // fader that could be the reason — which is most of why the bench exists.
  if (oskBench()) return null;
  if (!oskPlayable(selectedLane)) return 'Nothing to play';
  // On a kit every pad is its own channel, so mute is a pad's business, not the
  // window's — it is drawn on the pad instead.
  if (!oskIsKit() && Audio.mixer?.lane(selectedLane)?.state?.mute) return 'Muted';
  if (soloed.size && !soloed.has(selectedLane) && !oskIsKit()) return 'Not the soloed channel';
  if (soloedAux.size) return 'A send is soloed';
  return null;
}

function oskFlash(el) {
  if (!el) return;
  el.classList.add('lit');
  setTimeout(() => el.classList.remove('lit'), 130);
}

const oskKeyEl = (midi) => oskEl.querySelector(`.oskkey[data-midi="${midi}"]`);

function buildOsk() {
  const el = oskEl;
  // What the ends of the range ARE moves with the board — a key with a high root reaches
  // further above its base C than a chromatic one, and docking changes how many keys
  // there are to reach with. So the octave is held to them here, where every rebuild
  // passes, rather than only where it is set.
  oskOct = clampOskOctave(oskOct);
  el.textContent = '';
  el.classList.toggle('catching', oskCatch);
  oskLane = selectedLane;
  oskBenchId = oskBench();

  // The title bar is also the handle: a window you move by its name is the one thing
  // every floating panel has ever done, and it leaves the keys free to be keys.
  const head = document.createElement('div');
  head.className = 'oskhead';
  const title = document.createElement('span');
  title.className = 'osktitle';
  title.textContent = oskTitle();
  title.title = oskIsKit()
    ? 'Click a pad to hear that drum through its own channel — drag across them for a roll'
    : 'Click the keys to hear this channel — drag across them to glide';
  // Not a caption under the keyboard, which is a line of text you read once and then
  // never again: a mark in the title bar, only when there is something to say.
  const warn = document.createElement('span');
  warn.className = 'oskwarn';
  const why = oskWhy();
  warn.textContent = why || '';
  warn.hidden = !why;
  const sp = document.createElement('span');
  sp.className = 'sp';
  const catchBtn = document.createElement('button');
  catchBtn.className = 'oskcatch';
  // `Keyboard`, not `catch keys`. It is what the button turns on — the computer
  // keyboard as an instrument — and every other control here is named for the thing
  // rather than for the mechanism behind it.
  catchBtn.textContent = 'Keyboard';
  catchBtn.classList.toggle('on', oskCatch);
  catchBtn.title = 'Play from the computer keyboard. Z X C V B N M is the lower octave '
    + 'with its black keys on S D G H J, and Q W E R T Y U the one above with 2 3 5 6 7 '
    + 'over it, carrying on through I O P and [ = ]. − and + shift the whole board, and '
    + ', is the C above M for a run that ends where your hand already is.'
    + '\n\nWhile this is on, the desk’s own shortcuts on those keys — M S R B L'
    + ' and [ ] for the playhead — are yours to play with instead.';
  catchBtn.onclick = () => setOskCatch(!oskCatch);
  const midiBtn = document.createElement('button');
  midiBtn.className = 'oskmidi';
  midiBtn.textContent = 'MIDI';
  midiBtn.classList.toggle('on', midiOn);
  const ins = midiOn ? midiInputs().map((i) => i.name) : [];
  midiBtn.title = midiOn
    ? (ins.length ? `Playing from ${ins.join(', ')} — click to stop listening`
      : 'Listening, but nothing is plugged in yet')
    : 'Play this channel from a MIDI keyboard. Recording captures the notes and how '
      + 'long you hold them; the level is the channel’s own, as the song plays it.';
  midiBtn.onclick = () => setMidi(!midiOn);
  // Where the notes GO. It sits between the two inputs and the close button because
  // that is the order you decide things in: which channel this is, whether the computer
  // keys are yours, whether MIDI is listening — and then whether any of it is kept.
  const recBtn = document.createElement('button');
  recBtn.className = 'oskrec';
  recBtn.textContent = 'Record';
  recBtn.classList.toggle('on', recArmed);
  recBtn.classList.toggle('live', recording());
  recBtn.title = 'Play notes INTO this channel. Everything you play is quantised to '
    + 'sixteenths — a bank holds sixteen steps to the bar and nothing between them — and '
    + 'written into the bars the loop is playing, everywhere that part repeats.'
    + '\n\nHow long you hold a key becomes the note’s length. Recording only ADDS notes; '
    + 'taking one out is the piano roll’s job.'
    + '\n\nA bar’s worth of playing is one ⌘Z. ⎋ stops everything and drops whatever has '
    + 'not been written yet. ⇧R from anywhere.';
  recBtn.onclick = () => setRecord(!recArmed);
  const close = document.createElement('button');
  // Folded rather than closed while it is part of the library's workspace — same
  // reasoning as the editor's there. Out on the desk it is a window, and closing a
  // window is closing it.
  //
  // Two different acts, so two different marks. A ✕ means gone, and using it for
  // something that folds away and comes back is the button lying about what it does —
  // you hesitate over a ✕ in a panel you have work in. A chevron pointing DOWN, the way
  // this band collapses, says put-away and says which way.
  //
  // Closing gets the desk's standard mark — see `.popclose`. It was an SVG glyph here
  // and a 19px ✕ on the preset library and an 11px `×` on the step sequencer, which is
  // three controls wearing one job: a close button you have to identify on each panel
  // is a close button you look for. Folding keeps its own mark, because it is a
  // different act.
  const folds = !!voiceLibrary.slots && oskEl.classList.contains('docked');
  close.className = folds ? 'oskclose oskfold' : 'oskclose popclose';
  close.title = folds ? 'Hide the keyboard — the bar below brings it back' : 'Close the keyboard';
  if (folds) close.append(foldIcon('down')); else close.textContent = '✕';
  close.onclick = () => (folds ? voiceLibrary.collapse('keys', true) : showOsk(false));
  head.append(title, warn, sp, midiBtn, catchBtn, recBtn, close);

  const ctl = document.createElement('div');
  ctl.className = 'oskctl';
  // Lit whenever the channel sounds, whatever it sounds — the one readout that means
  // the same thing on a piano and on a kit.
  //
  // At the END of the two source buttons, in the title bar, in every layout. Anything
  // that sounds the channel lights it — MIDI, the computer keyboard, or the song playing
  // through it — so sitting in FRONT of MIDI it read as MIDI's own lamp, and away at the
  // right-hand end of the control row it was a lamp belonging to nothing. After Keyboard
  // it closes the group it is the readout for, and it is in the same place whether the
  // keyboard is floating, docked, or drawing a kit's pads.
  const pulse = document.createElement('span');
  pulse.className = 'oskpulse';
  pulse.title = 'The channel is sounding';
  head.insertBefore(pulse, close);

  // A drum channel is not played by a keyboard, it is played by pads — and by the
  // whole KIT's pads, not one channel's. A kick has one sound and one pitch: two
  // octaves of keys that all play it is a piano pretending, where the row of drums
  // the song actually has is an instrument you can play a beat on. Every pad goes
  // through its own channel strip, so this is the song's kit, mixed as it is mixed.
  if (oskIsKit()) {
    // No octave to shift and no range to state, so there is no control row at all.
    el.append(head, buildOskPads());
  } else {
    // ONE row, wherever it is. The name, the octave, the range, the key and the two
    // source buttons all lead left to right across a single band: what this is, where it
    // is, what it plays in, and what plays it.
    //
    // Docked was already this. Floating kept the two-band version it started as — a title
    // bar with a control row under it — which is two things to scan where there is width
    // for one, and made the same keyboard a different panel depending on where it was
    // sitting. `ctl` survives as the box the octave and scale controls are BUILT in; it
    // is never appended, only emptied into the head.
    const keys = buildOskKeys(ctl);
    // In front of MIDI rather than after it: left to right the row reads what this is,
    // where it is, and then what you can do to it.
    for (const child of [...ctl.children]) head.insertBefore(child, midiBtn);
    el.append(head, keys);
    // Only now is there a window to measure — see fillFloatingKeys.
    fillFloatingKeys(head, keys);
  }
  wireOskDrag(el, head);
  // The head has just been replaced, so the lamp state has to be put back onto the new
  // button — a rebuild mid-take is an octave change or a channel change, not the take
  // ending.
  syncRecordUi();
}

/**
 * The drum lanes this song has, in desk order — the kit, as it was assembled.
 *
 * Guarded, because the keyboard can now be built before there is a song to build it
 * from: the preset library switches it on as it opens, which can land in the moment
 * between the page starting and a track being resolved. `viewBank` has nothing to
 * return then, and `deskLanes` reads `.sections` off it without asking.
 */
const oskKitLanes = () => {
  const bank = viewBank();
  if (!bank) return [];
  return deskLanes(bank, 1).filter((l) => PERCUSSION_LANES.includes(baseLane(l.key)));
};
// Pads are the SONG's kit — one pad per drum channel it has. The bench has no kit and
// no channels: it is one preset, and the thing you want to do to a drum preset you are
// shaping is play it up and down to hear its pitch envelope. So the bench always gets
// keys, drum preset or not.
const oskIsKit = () => !oskBench() && oskPlayable(selectedLane)
  && PERCUSSION_LANES.includes(baseLane(selectedLane));

function buildOskPads() {
  const pads = document.createElement('div');
  pads.className = 'oskpads';
  const kit = oskKitLanes();
  for (let i = 0; i < kit.length; i++) {
    const { key, label } = kit[i];
    const pad = document.createElement('div');
    pad.className = 'oskpad';
    pad.dataset.lane = key;
    pad.classList.toggle('sel', key === selectedLane);
    // Its own channel, its own mute: a pad you can hit and hear nothing from is the
    // one thing a kit must not do quietly.
    pad.classList.toggle('muted', !!Audio.mixer?.lane(key)?.state?.mute);
    const name = document.createElement('span');
    name.className = 'oskpadname';
    name.textContent = label;
    const letter = document.createElement('span');
    letter.className = 'oskletter';
    letter.textContent = (PAD_KEYS[i] || '').toUpperCase();
    pad.append(letter, name);
    const seam = seamFor(key);
    const voice = seam && VOICES[engineBank()?.[seam.voiceKey]];
    pad.title = `Play ${label} — ${voice ? voice.label : 'the engine’s own drum'}, through its own channel`;
    pads.append(pad);
  }
  pads.addEventListener('pointerdown', (ev) => {
    const pad = ev.target.closest('.oskpad');
    if (!pad) return;
    ev.preventDefault();
    try { pads.setPointerCapture(ev.pointerId); } catch { /* not a real pointer */ }
    const src = `p:${ev.pointerId}`;
    oskHit(pad.dataset.lane, { src });
    oskHoldVisual(src, pad);
    oskFlash(pad);
  });
  // A drag across the pads is a roll, the same gesture a glide is on the keys — and
  // like a glide it is not recorded. See `oskHit`.
  pads.addEventListener('pointermove', (ev) => {
    if (!ev.buttons) return;
    const pad = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.oskpad');
    const src = `p:${ev.pointerId}`;
    if (!pad || oskHeldVisuals.get(src) === pad
      || pad.classList.contains('lit') || pad.classList.contains('held')) return;
    oskReleaseVisual(src);
    oskHit(pad.dataset.lane, { record: false });
    oskHoldVisual(src, pad);
    oskFlash(pad);
  });
  // A pad has no length to measure, but its preview still needs an explicit release;
  // the shared helper also lets go of any recorder token without leaking one per hit.
  for (const type of ['pointerup', 'pointercancel']) {
    pads.addEventListener(type, (ev) => oskRelease(`p:${ev.pointerId}`));
  }
  return pads;
}

/**
 * Put a built row of keys at a width.
 *
 * A key is a SHAPE, and the shape is the one the floating board has — see KEY_H. The
 * heights used to be CSS, one pair of numbers for the floating board and another for the
 * docked one, which meant the docked keys were whatever proportion its band width
 * happened to make them: the same 132px key was a stub at 49 across and about right at
 * 39. Deriving every other measurement from the width — the black keys, both heights — is
 * the only way a keyboard that sizes itself to a band still looks like a keyboard in
 * every band.
 */
function sizeOskKeys(keys, width) {
  const scale = width / KEY_W;            // everything else is this key, to proportion
  keys.style.width = `${(Number(keys.dataset.count) || 0) * width}px`;
  keys.style.setProperty('--oskwhiteh', `${KEY_H * scale}px`);
  keys.style.setProperty('--oskblackh', `${BLACK_H * scale}px`);
  for (const k of keys.children) {
    k.style.left = `${Number(k.dataset.at) * width}px`;
    k.style.width = `${Number(k.dataset.wide) * width}px`;
  }
}

/**
 * Measure the floating window, and give it the keys that fit in it.
 *
 * Docked, the band states its width and `oskKeyPlan` divides it. Floating, the width is
 * the title bar's — a window is as wide as the widest thing in it — and the keys cannot
 * know it until they are in the document with it. So the row is built at the count the
 * plan can reach on its own, measured here, and built once more if the answer moved.
 *
 * Kept in `oskFloatRoom` rather than being applied to the keys directly, because the
 * count is the answer to more than one question: `oskBoard` reads the same plan to work
 * out how far the board reaches, and a row with more keys on it than the plan admits to
 * would let the octave buttons walk off the top of the range.
 */
const OSK_GUTTER = 10;                   // `.oskkeys` margin, per side — see the CSS
function fillFloatingKeys(head, keys) {
  if (oskEl.classList.contains('docked')) return;
  // The head's box IS the window's content width — it is a block in a shrink-to-fit
  // panel. Zero while the keyboard is hidden, which is nothing to fit to.
  const room = head.getBoundingClientRect().width - (OSK_GUTTER + OSK_CHASSIS) * 2;
  if (!(room > 0) || Math.abs(room - oskFloatRoom) < 0.5) return;
  oskFloatRoom = room;
  // More keys is further up the keyboard, and the octave was held to the range the
  // narrower board could reach — see clampOskOctave. Start again rather than patch it:
  // the second pass measures the same width and stops there.
  const oct = clampOskOctave(oskOct);
  if (oct !== oskOct) { oskOct = oct; buildOsk(); return; }
  // Replaced whole rather than compared first: the measurement can move the count, the
  // width or neither, and rebuilding one row is cheaper than working out which.
  const row = oskKeyRow();
  keys.replaceWith(row.keys);
  head.querySelector('.oskrange').textContent = row.label;
  // The board can have grown wider than the screen has room for to the right of where the
  // window sits. `oskPlace` is what keeps a window on it, and it otherwise only runs when
  // the window is moved or first opened.
  const x = parseFloat(oskEl.style.left);
  const y = parseFloat(oskEl.style.top);
  if (Number.isFinite(x) && Number.isFinite(y)) oskPlace(x, y);
}

function buildOskKeys(ctl) {
  // `−` and `+`, not `◀` and `▶`. An octave is a quantity you take some away from and
  // add some to, and the arrows read as "seek" — the transport's own job. They are also
  // the keystrokes now, which is only sayable because they are the keystrokes: an arrow
  // on a button cannot tell you to press anything.
  const down = document.createElement('button');
  down.textContent = '−';
  down.className = 'oskdown';
  down.onclick = () => setOskOctave(oskOct - 1);
  const up = document.createElement('button');
  up.textContent = '+';
  up.className = 'oskup';
  up.onclick = () => setOskOctave(oskOct + 1);
  // Dimmed at the ends of the instrument rather than removed or disabled: the pair is a
  // readout of where you are in the range as much as it is a control, and one that
  // vanishes is a row whose buttons move under your hand. Disabling them would take the
  // tooltip with it, which is the half of this that says WHY the button stopped.
  const { lo, hi } = oskOctaveRange();
  down.classList.toggle('atend', oskOct <= lo);
  up.classList.toggle('atend', oskOct >= hi);
  down.title = oskOct <= lo
    ? `As low as the keyboard goes — ${midiName(OSK_LOW_MIDI)} is the bottom of the range`
    : 'An octave down ( the − key, while Keyboard is on )';
  up.title = oskOct >= hi
    ? `As high as the keyboard goes — ${midiName(OSK_HIGH_MIDI)} is the top of the range`
    : 'An octave up ( the = key, while Keyboard is on )';
  const oct = document.createElement('span');
  oct.className = 'oskoct';
  oct.textContent = `C${oskOct}`;
  const range = document.createElement('span');
  range.className = 'oskrange';

  // ---- the key to play in.
  //
  // Two controls, because they are two questions — which note is home, and what kind of
  // scale sits on it — and one combined list would be sixty entries saying twelve times
  // five. Together they dim the keys outside the key and put the bench's figures inside
  // it. See SCALES.
  const scaleWrap = document.createElement('span');
  scaleWrap.className = 'oskscale';
  const scaleK = document.createElement('span');
  scaleK.className = 'oskscalek';
  scaleK.textContent = 'Scale';
  const rootSel = document.createElement('select');
  rootSel.className = 'fxsel oskroot';
  for (let i = 0; i < 12; i++) {
    const o = document.createElement('option');
    o.value = String(i); o.textContent = PITCH_CLASSES[i];
    if (i === oskScaleRoot) o.selected = true;
    rootSel.append(o);
  }
  rootSel.title = 'Which note is home';
  rootSel.onchange = () => setOskScale({ root: Number(rootSel.value) });
  const kindSel = document.createElement('select');
  kindSel.className = 'fxsel oskscalekind';
  for (const s of SCALES) {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = s.label;
    if (s.id === oskScaleId) o.selected = true;
    kindSel.append(o);
  }
  kindSel.title = 'Notes outside the key are dimmed — they still play, because the'
    + ' accidental you wanted is always the one a keyboard would have refused.'
    + '\n\nThe bench’s figures land inside it: a triad in Minor comes out minor.';
  kindSel.onchange = () => setOskScale({ id: kindSel.value });
  // The root means nothing without a scale to sit on, and offering it there is offering
  // a control that cannot do anything.
  rootSel.disabled = oskScaleId === 'chromatic';
  scaleWrap.append(scaleK, rootSel, kindSel);

  ctl.append(down, oct, up, range, scaleWrap);

  const row = oskKeyRow();
  range.textContent = row.label;
  return row.keys;
}

/**
 * The keys themselves, and the reading of what they span.
 *
 * Its own function because it gets built twice on a floating board: once at the count the
 * plan can work out on its own, and again once the window has been measured and the plan
 * knows how many keys the window actually holds. See fillFloatingKeys.
 */
function oskKeyRow() {
  const keys = document.createElement('div');
  keys.className = 'oskkeys';
  let label = '';
  // How many keys there are and how wide each one is — the space's answer, with the
  // instrument's own ends taken off it. See oskBoard.
  const plan = oskBoard();
  const base = (oskOct + 1) * 12;
  keys.dataset.count = String(plan.count);
  // Remembered so `fitDockedKeys` can tell whether the band has moved since — a rebuild
  // re-docks, and re-docking asks it again.
  oskDrawnFor = plan.fills ? oskRoom() : -1;

  const sc = oskScale();
  // Laid out in UNITS OF A KEY — `at` is how many keys along it starts, `wide` how many
  // it covers — with `sizeOskKeys` the only place a key becomes pixels. Two callers ask
  // for the same row at two widths: the plan's, and then whatever the frame turned out
  // to be once the head could be measured (see fillFloatingKeys). A row that exists only
  // in pixels cannot be asked the second question without being built again.
  const addKey = (cls, semi, at, wide, letter) => {
    const k = document.createElement('div');
    k.className = `oskkey ${cls}`;
    k.dataset.midi = String(base + semi);
    k.dataset.at = String(at);
    k.dataset.wide = String(wide);
    const name = document.createElement('span');
    name.className = 'oskname';
    // Only the C's are named. Every white key labelled is fifteen readings where you
    // needed one: you find a note by counting from the nearest C, so the C's are the
    // landmarks and the rest is the noise you count through. The octave is in the
    // number, which is the part that was actually hard to see.
    name.textContent = (base + semi) % 12 === 0 ? midiName(base + semi) : '';
    const l = document.createElement('span');
    l.className = 'oskletter';
    l.textContent = (letter || '').toUpperCase();
    k.append(l, name);
    keys.append(k);
    return k;
  };

  if (sc) {
    // ---- in a key: only the notes of it, all the same key.
    //
    // Not a piano with the wrong notes greyed out. A scale has five or seven notes and
    // a piano has twelve, so the black keys in a key are gaps — and a row of uniform
    // keys with nothing between them is the whole point: every key belongs, so you can
    // play it without reading it. GarageBand's scale mode, and for the same reason.
    //
    // The trade is real and worth naming: the notes outside the key are not on the
    // keyboard at all now, where before they were dimmed and still playable. That is
    // what choosing a key MEANS here — chromatic is one item up the list and gives the
    // piano back.
    // Exactly as many degrees as the band holds, counted up from the root — the RANGE
    // is what gives when the width changes, not the size of the keys.
    const offset = (((sc.root - (base % 12)) % 12) + 12) % 12;
    const notes = [];
    for (let i = 0; notes.length < plan.count; i++) {
      notes.push(Math.floor(i / sc.steps.length) * 12 + offset + sc.steps[i % sc.steps.length]);
      if (i > 512) break;                // a step list is never empty, but never loop forever
    }
    label = `${midiName(base + notes[0])} – ${midiName(base + notes[notes.length - 1])}`;
    notes.forEach((semi, i) => {
      const k = addKey('white scalekey', semi, i, 1, SCALE_KEYS[i]);
      // The ROOT is the landmark here, and it is the only one. C is where a piano's
      // octaves visibly start, which is why it is the mark in chromatic — but in A minor
      // pentatonic there is no C to count from, and labelling both leaves two competing
      // answers to "where am I" on a keyboard that has no black keys to tell them apart.
      const isTonic = ((base + semi - sc.root) % 12 + 12) % 12 === 0;
      k.querySelector('.oskname').textContent = isTonic ? midiName(base + semi) : '';
      k.classList.toggle('tonic', isTonic);
    });
  } else {
    const whites = plan.count;
    for (let i = 0; i < whites; i++) {
      const semi = Math.floor(i / 7) * 12 + WHITE_SEMIS[i % 7];
      addKey('white', semi, i, 1, SEMI_QWERTY[semi]);
    }
    label = `${midiName(base)} – `
      + `${midiName(base + Math.floor((whites - 1) / 7) * 12 + WHITE_SEMIS[(whites - 1) % 7])}`;
    // After the whites, so they draw over them without a z-index to maintain. Only the
    // ones that fall inside the drawn whites: the board can now end part way through an
    // octave, exactly as a real one does, and a black key past the last white would hang
    // off the end with nothing under it.
    for (let o = 0; o * 7 < whites; o++) {
      for (const [semi, after] of BLACK_SEMIS) {
        const at = o * 7 + after + 1;
        if (at >= whites) continue;
        addKey('black', o * 12 + semi, at - BLACK_UNIT / 2, BLACK_UNIT, SEMI_QWERTY[o * 12 + semi]);
      }
    }
  }

  sizeOskKeys(keys, plan.width);

  // One listener on the container rather than one per key, so a drag across the
  // keyboard glides — which is how you find the note you are after.
  keys.addEventListener('pointerdown', (ev) => {
    const k = ev.target.closest('.oskkey');
    if (!k) return;
    ev.preventDefault();
    // Captured so a glide off the end of the keyboard still ends the gesture here.
    try { keys.setPointerCapture(ev.pointerId); } catch { /* not a real pointer */ }
    const src = `p:${ev.pointerId}`;
    oskPlay(Number(k.dataset.midi), { src });
    oskHoldVisual(src, k);
    oskFlash(k);
  });
  keys.addEventListener('pointermove', (ev) => {
    if (!ev.buttons) return;
    const k = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.oskkey');
    const src = `p:${ev.pointerId}`;
    if (!k || oskHeldVisuals.get(src) === k
      || k.classList.contains('lit') || k.classList.contains('held')) return;
    // A glide is one gesture looking for one note, not a run of notes to keep.
    releasePreview(src);
    oskReleaseVisual(src);
    oskPlay(Number(k.dataset.midi), { record: false, src });
    oskHoldVisual(src, k);
    oskFlash(k);
  });
  // Lifting the finger is where a clicked note gets its length. `pointercancel` too:
  // the gesture ending some other way is still the key coming up, and a note left open
  // would take the length of everything played after it.
  for (const type of ['pointerup', 'pointercancel']) {
    keys.addEventListener(type, (ev) => oskRelease(`p:${ev.pointerId}`));
  }

  return { keys, label };
}

/** The title bar moves the window. Everything it does is in its own tooltips. */
function wireOskDrag(el, head) {
  head.addEventListener('pointerdown', (ev) => {
    // Docked there is no window to move — it is a band in the library's workspace, and
    // `#osk.docked .oskhead` already says so with `cursor: default`. Dragging it would
    // also be the only thing on the desk that moved a `position: static` node.
    if (el.classList.contains('docked')) return;
    // A control in the title bar is a control, not a grab handle. `button` alone was
    // enough while the head held nothing else; docked it also holds the two scale
    // dropdowns, and `preventDefault` on a select's pointerdown is exactly what stops
    // the list from opening — so the key and the scale could only be changed on the
    // floating keyboard, which is a control that silently does nothing where it lives.
    if (ev.target.closest('button, select, input')) return;
    ev.preventDefault();
    const r = el.getBoundingClientRect();
    const dx = ev.clientX - r.left;
    const dy = ev.clientY - r.top;
    const move = (e) => oskPlace(e.clientX - dx, e.clientY - dy);
    const stop = () => {
      head.removeEventListener('pointermove', move);
      head.classList.remove('dragging');
    };
    head.classList.add('dragging');
    try { head.setPointerCapture(ev.pointerId); } catch { /* not a real pointer */ }
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', stop, { once: true });
    head.addEventListener('pointercancel', stop, { once: true });
  });
}

/** Move the window, and keep it on the screen — including after a resize. */
function oskPlace(x, y) {
  const el = oskEl;
  const r = el.getBoundingClientRect();
  const left = clamp(x, 4, Math.max(4, innerWidth - r.width - 4));
  const top = clamp(y, 4, Math.max(4, innerHeight - r.height - 4));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  localStorage.setItem(OSK_POS_KEY, JSON.stringify({ x: left, y: top }));
}

// The ends of the instrument: A0 and C8, a grand piano's own. Past them in either
// direction is not a register anything plays — a sub-bass rumble the desk cannot even
// meter and a whistle above the top of the treble staff — and every voice in the rack is
// tuned for the span between them. The keyboard shifts by whole octaves, so this is a
// limit on the OCTAVE the board sits at rather than on each key: the whole span it draws
// has to land inside them.
const OSK_LOW_MIDI = 21;                 // A0
const OSK_HIGH_MIDI = 108;               // C8

/**
 * The board as it will actually be drawn: how many keys, how wide, and what they span.
 *
 * One answer to a question the layout and the octave buttons both ask, and they have to
 * agree on it. `oskKeyPlan` says how many keys the SPACE holds; this is where the piano's
 * own ends have their say, and the two are not the same number.
 *
 * Where they part is a sparse key in a wide window. Thirty-five pentatonic degrees is
 * nearly seven octaves — more than A0 to C8 holds — so there is no octave to sit at that
 * puts both ends inside the range, and the clamp, asked to satisfy two limits that cannot
 * both be met, honoured the bottom one and drew up to F#8. The keys past the end come off
 * instead: a board that stops at the top of the instrument, which is what a keyboard with
 * eighty-eight keys does too.
 *
 * `at(i)` is the i-th key in semitones above the base C — the same walk both branches of
 * `oskKeyRow` make, written once so the range cannot be worked out from a different
 * keyboard than the one on screen. `base` is always a C, so the offset from it up to the
 * root IS the root.
 */
function oskBoard() {
  const sc = oskScale();
  const plan = oskKeyPlan(sc ? sc.steps.length : 7);
  const at = sc
    ? (i) => Math.floor(i / sc.steps.length) * 12 + sc.root + sc.steps[i % sc.steps.length]
    : (i) => Math.floor(i / 7) * 12 + WHITE_SEMIS[i % 7];
  const low = at(0);
  // The lowest octave this board may sit at is fixed by its bottom key, so the highest
  // note it could ever reach is measured from there — and any key past that is a key the
  // instrument does not have.
  const lo = Math.ceil((OSK_LOW_MIDI - low) / 12) - 1;
  const ceiling = OSK_HIGH_MIDI - (lo + 1) * 12;
  let count = plan.count;
  while (count > 1 && at(count - 1) > ceiling) count--;
  return { count, width: plan.width, fills: plan.fills, lo, low, high: at(count - 1) };
}

/** Which octaves the board may sit at and still draw inside A0 – C8. */
function oskOctaveRange() {
  const { lo, high } = oskBoard();
  // Never crossed: `oskBoard` has already taken off any key that would make it so.
  return { lo, hi: Math.max(lo, Math.floor((OSK_HIGH_MIDI - high) / 12) - 1) };
}

function clampOskOctave(n) {
  const { lo, hi } = oskOctaveRange();
  return clamp(n, lo, hi);
}

function setOskOctave(n) {
  oskOct = clampOskOctave(n);
  if (oskShown()) buildOsk();
}

function setOskCatch(on) {
  if (!on) releaseOskSources('k:');
  oskCatch = !!on && oskShown();
  oskHeld.clear();
  if (oskShown()) buildOsk();
}

/** The title follows the channel; the keys only get rebuilt if the channel moved. */
function refreshOsk() {
  if (!oskShown()) return;
  // Arriving on the bench, or leaving it, changes what the keys ARE — a kit channel
  // draws pads and the bench never does — so it counts as a move exactly as changing
  // channel does. Relabelling alone would leave a row of the song's drum pads sitting
  // under a title bar naming a preset none of them play.
  if (oskLane !== selectedLane || oskBenchId !== oskBench()) {
    const bench = oskBench();
    // The bench opens where the preset was measured: A2, which lives in octave 2. A
    // keyboard that opened at middle C would put the note the level was taken at two
    // octaves below the lowest key.
    if (bench) oskOct = clampOskOctave(2);
    else if (oskPlayable(selectedLane) && !oskIsKit()) oskOct = laneOctave(selectedLane);
    buildOsk();
    return;
  }
  const el = oskEl;
  const t = el.querySelector('.osktitle');
  if (t) t.textContent = oskTitle();
  const warn = el.querySelector('.oskwarn');
  const why = oskWhy();
  if (warn) { warn.textContent = why || ''; warn.hidden = !why; }
  for (const pad of el.querySelectorAll('.oskpad')) {
    pad.classList.toggle('muted', !!Audio.mixer?.lane(pad.dataset.lane)?.state?.mute);
  }
}

function showOsk(on) {
  const el = oskEl;
  el.classList.toggle('show', on);
  $('oskbtn').classList.toggle('on', on);
  if (!on) {
    releaseOskSources('p:');
    releaseOskSources('k:');
    clearOskHeldVisuals();
    oskCatch = false; oskHeld.clear(); el.classList.remove('docked');
    // Closing the keyboard no longer disarms. It used to, because the arm lived in here
    // and a recorder running behind a shut window was a song changing invisibly — but
    // the arm is in the header now and stays lit, so closing a window you were not
    // playing with is not a reason to end a take. Any keys still HELD are closed, since
    // their note-off is going with the window.
    syncRecordUi();
    rememberSongLayout();
    return;
  }
  if (oskBench()) oskOct = clampOskOctave(2);   // where A2 lives — see refreshOsk
  else if (oskPlayable(selectedLane) && oskLane !== selectedLane) oskOct = laneOctave(selectedLane);
  buildOsk();
  // Along the bottom of the library while that is open, rather than floating over it.
  // Positioning is the floating window's business and is skipped entirely when docked —
  // a `position: fixed` left/top on a node inside a flex row is a node somewhere else.
  if (voiceLibrary.slots) { dockIntoLibrary(); rememberSongLayout(); return; }
  let pos = null;
  try { pos = JSON.parse(localStorage.getItem(OSK_POS_KEY) || 'null'); } catch { pos = null; }
  const r = el.getBoundingClientRect();
  // First open: bottom right, above the footer, where it covers the least of the rack.
  oskPlace(pos?.x ?? innerWidth - r.width - 24, pos?.y ?? innerHeight - r.height - 54);
  rememberSongLayout();
}

/**
 * A computer key, while the keyboard is catching them. Returns true when it was one
 * of ours, which is what tells the desk's own shortcuts to keep their hands off.
 */
function oskTypedKey(e) {
  if (!oskCatch || !oskShown()) return false;
  // Nothing the keyboard plays needs Shift, so the whole shifted alphabet stays the
  // desk's — which is the only reason ⇧R can arm recording while your hands are on the
  // notes. Without this, `r` is a semitone and the desk never sees the shortcut.
  if (e.shiftKey) return false;
  const key = e.key.toLowerCase();
  // Escape is the panic now, and the keyboard does not claim it. It used to mean the
  // biggest thing there was to back out of — the take while one was running, key-catching
  // otherwise — but an emergency cut that stops working whenever this window is up is not
  // one you can rely on, and both of the old meanings are inside the panic anyway: it
  // stops the transport, disarms the take and drops what has not been written. Handing
  // the letters back is what the ⌨ button in the title bar is for.
  if (key === 'escape') return false;
  // A kit is one row of pads, so the home row is all it needs and Z/X have nothing
  // to shift. Everything else on the keyboard falls back to the desk.
  if (oskIsKit()) {
    const i = PAD_KEYS.indexOf(key);
    if (i === -1) return false;
    const pad = oskEl.querySelectorAll('.oskpad')[i];
    if (!pad) return false;
    if (e.repeat || oskHeld.has(key)) return true;
    oskHeld.add(key);
    const src = `k:${key}`;
    oskHit(pad.dataset.lane, { src });
    oskHoldVisual(src, pad);
    oskFlash(pad);
    return true;
  }
  // The octave, on the two keys drawn on the buttons: `−` and `+`, literally. `=` used
  // to do the up as well, unshifted, which is the better keystroke — but it is the third
  // octave's F# now, and a note that also jumped the board out from under the hand
  // playing it is not a note you could use. Z and X went the same way, to C and D.
  if (key === '-' || key === '_') { setOskOctave(oskOct - 1); return true; }
  if (key === '+') { setOskOctave(oskOct + 1); return true; }
  // In a key the letters run straight across the degrees drawn on screen, so the lookup
  // is the keyboard itself rather than a semitone table — there is no fixed mapping from
  // a letter to a note when which notes exist depends on the scale.
  if (oskScale()) {
    const i = SCALE_KEYS.indexOf(key);
    if (i === -1) return false;
    const k = oskEl.querySelectorAll('.oskkey')[i];
    if (!k) return false;
    if (e.repeat || oskHeld.has(key)) return true;
    oskHeld.add(key);
    const src = `k:${key}`;
    oskPlay(Number(k.dataset.midi), { src });
    oskHoldVisual(src, k);
    oskFlash(k);
    return true;
  }
  const semi = QWERTY_SEMIS[key] ?? QWERTY_ALIASES[key];
  if (semi == null) return false;
  // Auto-repeat is the operating system, not you playing the note again.
  if (e.repeat || oskHeld.has(key)) return true;
  oskHeld.add(key);
  const midi = (oskOct + 1) * 12 + semi;
  const src = `k:${key}`;
  const k = oskKeyEl(midi);
  oskPlay(midi, { src });
  oskHoldVisual(src, k);
  oskFlash(k);
  return true;
}

/**
 * Light what the channel is playing, while it plays it.
 *
 * The other half of a keyboard on a mixing desk: pressing a key asks what a channel
 * sounds like, and watching it asks what the channel is DOING — which notes the part
 * is actually made of, where in the octave it sits, whether the twinkle you cannot
 * pick out of the mix is playing at all — live, and on the thing you are about to
 * play yourself.
 *
 * Driven from the desk's own playhead rather than from the sequencer, so it lands
 * with the ear: `heardStep` has already had the scheduler's lookahead and the
 * playhead offset taken out of it. Null means nothing is playing.
 */
let oskStep = -1;
let oskBlockCache = { bank: null, list: null };
function oskFollow(heardStep) {
  if (!oskShown()) return;
  const step = heardStep == null ? -1 : Math.floor(heardStep);
  if (step === oskStep) return;
  oskStep = step;
  const el = oskEl;
  for (const k of el.querySelectorAll('.sung')) k.classList.remove('sung');
  for (const b of el.querySelectorAll('.offscreen')) b.classList.remove('offscreen');
  el.querySelector('.oskpulse')?.classList.remove('on');
  // Nothing to follow on the bench. These keys are playing a library preset, not a
  // channel, so lighting them from the song's selected lane would be the keyboard
  // reporting on a part none of them can sound.
  if (step < 0 || oskBench() || !oskPlayable(selectedLane)) return;
  const b = viewBank();
  if (oskBlockCache.bank !== b) oskBlockCache = { bank: b, list: songBlocks(b, 1) };
  const list = oskBlockCache.list;
  if (!list.length) return;
  // The song's form, resolved: a section is a partial bank spread over the whole, so
  // the notes under the playhead are the block's, not the top-level bank's.
  const block = list[Math.floor(step / 32) % list.length];
  if (!block) return;
  // The whole kit lights, not just the selected pad: watching a beat go past is the
  // point of having the drums in one row.
  if (oskIsKit()) {
    for (const pad of el.querySelectorAll('.oskpad')) {
      if (!block[pad.dataset.lane]?.[step % 32]) continue;
      pad.classList.add('sung');
      el.querySelector('.oskpulse')?.classList.add('on');
    }
    return;
  }
  const value = block[selectedLane] && block[selectedLane][step % 32];
  if (!value) return;
  el.querySelector('.oskpulse')?.classList.add('on');
  const base = (oskOct + 1) * 12;
  for (const f of Array.isArray(value) ? value : [value]) {
    if (typeof f !== 'number' || !(f > 0)) continue;
    const midi = Math.round(12 * Math.log2(f / 440) + 69);
    const k = oskKeyEl(midi);
    // A note the keyboard cannot show lights the octave button that would reach it,
    // which is both "there is more up there" and which way to go for it.
    if (k) k.classList.add('sung');
    else el.querySelector(midi < base ? '.oskdown' : '.oskup')?.classList.add('offscreen');
  }
}

/**
 * A real keyboard, over Web MIDI.
 *
 * The same seam the on-screen keys and the computer keyboard use, with a third caller
 * on it — a note-on becomes `oskPlay` or a pad hit and nothing else changes, which is
 * the whole reason previewNote takes a note rather than a gesture.
 *
 * Note-OFF is ignored, and that is not laziness: a preview is a fixed length, the
 * channel's own, because the note length is a property of the part the way its gain
 * and its voice are. Holding a key longer would need the rack to sustain, which the
 * hand-written voices cannot do at all. Velocity is ignored for the same reason —
 * the level is the lane's, and a preview at half of it is a preview of a mix
 * decision nobody made. Both are worth revisiting the day the desk plays notes INTO
 * a song rather than only out of one.
 */
let midiAccess = null;
let midiOn = false;

function midiInputs() {
  return midiAccess ? [...midiAccess.inputs.values()] : [];
}

function onMidiMessage(e) {
  const [status, note, vel] = e.data;
  const kind = status & 0xf0;
  // A note-off is either an actual 0x80 or a note-on at velocity zero, which is how
  // most keyboards send one. It was discarded outright until recording existed to have
  // a use for it; now it is the only thing that knows how long a note was.
  if (kind === 0x80 || (kind === 0x90 && !vel)) {
    oskRelease(`m:${note}`);
    return;
  }
  if (kind !== 0x90) return;
  // No `oskShown()` any more. A MIDI keyboard is a real instrument sitting in front of
  // you: your eyes are on your hands or on the roll filling up, not on a drawn keyboard,
  // and requiring a window you are not looking at is a window in the way. What the gate
  // was protecting against — a song changing for reasons you cannot see — is better
  // served by the arm being in the header, where it is visible whatever else is shut.
  //
  // The computer keys are a different case and keep their gate: the desk's letters are
  // its shortcuts, and `oskCatch` is the negotiated hand-over. See `oskTypedKey`.
  if (!oskPlayable(selectedLane)) return;
  if (oskIsKit()) {
    // Off the song's kit rather than off the drawn pads, so a drum arrives whether or
    // not the keyboard is open. The pads are one view of this list, not the list.
    const kit = oskKitLanes();
    if (!kit.length) return;
    const named = GM_DRUMS[note];
    const lane = (kit.find((l) => baseLane(l.key) === named) || kit[note % kit.length]).key;
    const src = `m:${note}`;
    const pad = oskEl.querySelector(`.oskpad[data-lane="${CSS.escape(lane)}"]`);
    oskHit(lane, { src });
    oskHoldVisual(src, pad);
    oskFlash(pad);
    return;
  }
  const src = `m:${note}`;
  oskPlay(note, { src });
  if (!oskShown()) return;
  const k = oskKeyEl(note);
  // A note off the end of the keyboard still sounds — it is a real instrument's note,
  // not a click on a drawn key — so the arrow lights rather than nothing happening.
  if (k) { oskHoldVisual(src, k); oskFlash(k); }
  else oskEl.querySelector(note < (oskOct + 1) * 12 ? '.oskdown' : '.oskup')?.classList.add('offscreen');
}

function attachMidi() {
  for (const input of midiInputs()) input.onmidimessage = onMidiMessage;
}

async function setMidi(on, { announce = true } = {}) {
  if (!on) {
    for (const input of midiInputs()) input.onmidimessage = null;
    midiOn = false;
    localStorage.removeItem(MIDI_LS_KEY);
    // Anything still held loses its note-off with the port, so close it here rather than
    // leaving the note open to take the length of whatever is played next.
    releaseOskSources('m:');
    $('midibtn')?.classList.toggle('on', false);
    if (announce) toast('MIDI off');
    if (oskShown()) buildOsk();
    return;
  }
  if (!navigator.requestMIDIAccess) {
    toast('This browser has no Web MIDI — Chrome and Edge do');
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
  } catch {
    toast('MIDI was refused — allow it for this site and try again');
    return;
  }
  midiOn = true;
  localStorage.setItem(MIDI_LS_KEY, '1');
  attachMidi();
  // A keyboard plugged in after the desk was opened is the ordinary case, not the
  // exception: the browser hands over the ports it has, and the rest arrive later.
  midiAccess.onstatechange = () => { if (midiOn) { attachMidi(); if (oskShown()) refreshOsk(); } };
  const names = midiInputs().map((i) => i.name);
  toast(names.length ? `MIDI in: ${names.join(', ')}` : 'MIDI on — nothing plugged in yet');
  $('midibtn')?.classList.toggle('on', true);
  if (oskShown()) buildOsk();
}

addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  oskHeld.delete(key);
  // The same event, now also carrying a length. It already existed to stop auto-repeat
  // being heard as a run of notes, which is the same fact about the key from the other
  // side: this is when it came up.
  oskRelease(`k:${key}`);
});
addEventListener('resize', () => {
  if (!oskShown()) return;
  // Docked it has no position to keep — it has a width to re-fit instead.
  if (oskEl.classList.contains('docked')) { fitDockedKeys(); return; }
  oskPlace(parseFloat(oskEl.style.left) || 0, parseFloat(oskEl.style.top) || 0);
});

// ---- wiring ----------------------------------------------------------------
// Loading a song is a thing you do a few times an hour, so it does not need a
// control sitting open on the header; what you DO need at all times is which song
// you are on, and that reads better in the footer where it has room for its name.
const SONG_GROUPS = [
  ['Themes', 'theme'],
  ['Cabinets', 'cabinet'],
  ['Shop auditions', 'audition'],
  ['Scratch songs', 'scratch'],
  ['MIDI imports', 'imported'],
  // Last, and deliberately: one per style pack, written by tools/style-auditions.js so
  // a pack's opening sounds can be heard and swapped rather than read off a list. They
  // are development scaffolding, so they sort under the material rather than over it.
  ['Style auditions', 'styleAudition'],
].filter(([, group]) => (typeof __MASH_STATIC_MIXER__ === 'undefined')
  || group === 'scratch' || group === 'imported');

// In the static deployed mixer there is no server, so anything that fetches or
// posts to one cannot work. Hide those buttons rather than leaving them to answer
// every click with an error toast.
if (typeof __MASH_STATIC_MIXER__ !== 'undefined') {
  for (const id of ['save', 'revert', 'history', 'renderwav', 'auditionwav', 'midi', 'importmidi']) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
}

const RECENT_KEY = 'mash-mixer-recent-songs';
const RECENT_LIMIT = 5;

function recentSongIds() {
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { ids = []; }
  if (!Array.isArray(ids)) ids = [];
  return ids.filter((id, i) => i < RECENT_LIMIT && resolveTrack(id));
}

function rememberRecent(id) {
  if (!id) return;
  const ids = [id, ...recentSongIds().filter((x) => x !== id)].slice(0, RECENT_LIMIT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
}

function forgetRecent(id) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentSongIds().filter((x) => x !== id)));
}

function selectSong(id) {
  peakSeen = 0;
  loadTrack(id);
  $('nowsong').textContent = track.title;
  localStorage.setItem(SONG_KEY, id);
  rememberRecent(id);
  if ($('navdrawer')?.classList.contains('show')) renderSongBrowser();
}

function songButton(t, { recent = false } = {}) {
  const b = document.createElement('button');
  b.className = `drawer-song${t.id === trackId ? ' on' : ''}`;
  const name = document.createElement('span'); name.className = 'songname'; name.textContent = t.title;
  const id = document.createElement('span'); id.className = 'songid'; id.textContent = t.id;
  b.append(name, id);
  b.title = `${t.title} — ${t.id}` + (recent ? ' · recently opened' : '');
  b.onclick = () => { closeMenu(); selectSong(t.id); toast(`Loaded ${t.title}`); };
  return b;
}

function renderSongBrowser() {
  const tracks = listTracks();
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const query = ($('songsearch').value || '').trim().toLowerCase();
  const matches = (t) => !query || `${t.title} ${t.id}`.toLowerCase().includes(query);
  const recent = $('recent');
  recent.textContent = '';
  const recentTracks = recentSongIds().map((id) => byId.get(id)).filter(Boolean).filter(matches);
  if (recentTracks.length) {
    const h = document.createElement('div'); h.className = 'drawersectionhead'; h.textContent = 'Recently opened';
    recent.append(h, ...recentTracks.map((t) => songButton(t, { recent: true })));
  }

  const list = $('songlist');
  list.textContent = '';
  let any = false;
  for (const [title, group] of SONG_GROUPS) {
    const rows = tracks.filter((t) => t.group === group && matches(t));
    if (!rows.length) continue;
    any = true;
    const section = document.createElement('div');
    section.className = `drawergroup${query ? '' : ' collapsed'}`;
    const h = document.createElement('button');
    h.className = 'drawergrouptoggle'; h.type = 'button';
    h.setAttribute('aria-expanded', String(!!query));
    const label = document.createElement('span'); label.textContent = title;
    const count = document.createElement('span'); count.className = 'groupcount'; count.textContent = rows.length;
    h.append(label, count);
    h.onclick = (ev) => {
      ev.stopPropagation();
      const collapsed = section.classList.toggle('collapsed');
      h.setAttribute('aria-expanded', String(!collapsed));
    };
    section.append(h, ...rows.map((t) => songButton(t)));
    list.append(section);
  }
  if (!any) {
    const empty = document.createElement('div'); empty.className = 'drawerempty';
    empty.textContent = query ? 'No songs match that search.' : 'No songs available.';
    list.append(empty);
  }
}

$('songsearch').oninput = renderSongBrowser;

// What the New Song dialog was last asked for, minus the title. Everything else in it
// is a working preference — you are usually making eight-bar boom-bap sketches all
// afternoon — while the name is the one field that has to be different every time.
const NEW_SONG_KEY = 'mash-mixer-new-song';
let newSongPrefs = {};
try { newSongPrefs = JSON.parse(localStorage.getItem(NEW_SONG_KEY) || '{}') || {}; }
catch { newSongPrefs = {}; }

async function createNewSong() {
  closeMenu();
  // Prefilled with a name nobody in the drawer is using, so the field can just be
  // accepted. The server picks its own if this is cleared.
  const suggested = randomSongName({ taken: listTracks().map((t) => t.title) });
  const prefs = {
    template: 'full-band', style: 'auto', bars: 8, bpm: 120, styleTempo: true, ...newSongPrefs,
  };
  const sel = (value, want) => (value === want ? ' selected' : '');
  const answered = ask('Create a scratch song',
    `<label class="askfield">Title<input id="newsongtitle" type="text" spellcheck="false" value="${escapeHtml(suggested)}"></label>`
    // Template first, because it decides what the rest of the dialog is even for: a
    // Blank song has no style and no tempo of its own to inherit.
    + '<label class="askfield">Template<select id="newsongtemplate">'
    + `<option value="full-band"${sel(prefs.template, 'full-band')}>Full Song</option>`
    + `<option value="beat"${sel(prefs.template, 'beat')}>Beats Only</option>`
    + `<option value="blank"${sel(prefs.template, 'blank')}>Blank</option>`
    + '</select></label>'
    + '<label class="askfield" id="newsongstylefield">Style<select id="newsongstyle">'
    + `<option value="auto"${sel(prefs.style, 'auto')}>Auto</option>`
    + SONG_STYLES.map((s) => `<option value="${s.id}"${sel(prefs.style, s.id)}>${escapeHtml(s.label)} · ${s.bpm} BPM</option>`).join('')
    + '</select></label>'
    + '<label class="askfield">Tempo<input id="newsongbpm" type="number" min="40" max="220" step="1"></label>'
    + `<label class="askcheck" id="newsongtempofield"><input id="newsongstyletempo" type="checkbox"${prefs.styleTempo ? ' checked' : ''}>Use the template’s own tempo</label>`
    + `<label class="askfield">Bars<input id="newsongbars" type="number" min="1" max="64" step="1" value="${prefs.bars}"></label>`,
    'Create');
  const title = $('newsongtitle');
  title.focus(); title.select();
  const templateSelect = $('newsongtemplate');
  const styleSelect = $('newsongstyle');
  const styleField = $('newsongstylefield');
  const tempoField = $('newsongtempofield');
  const styleTempo = $('newsongstyletempo');
  const bpmField = $('newsongbpm');
  // The tempo box is either yours to type in or the template's to report. Left as an
  // empty box with a placeholder, it was a field that looked unanswered and a number
  // you could not see; disabled and filled in, it says what you are about to get.
  //
  // Your own tempo is remembered separately from the template's. Reading it back out
  // of the box would mean that glancing at Boom Bap's 88 and then switching to Blank
  // silently made 88 your number.
  let manual = Number(prefs.bpm) || 120;
  bpmField.oninput = () => { if (!bpmField.disabled) manual = Number(bpmField.value) || manual; };
  const paint = () => {
    const blank = templateSelect.value === 'blank';
    styleField.hidden = blank;
    tempoField.hidden = blank;
    const chosen = SONG_STYLES.find((s) => s.id === styleSelect.value);
    const fromTemplate = !blank && styleTempo.checked;
    bpmField.disabled = fromTemplate;
    if (!fromTemplate) bpmField.value = String(manual);
    // Auto has no tempo to show until the seed has picked a style, so it says so
    // rather than showing a number that is not the one it will use.
    else if (chosen) bpmField.value = String(chosen.bpm);
    else { bpmField.value = ''; bpmField.placeholder = 'chosen with the style'; }
  };
  templateSelect.onchange = paint;
  styleSelect.onchange = paint;
  styleTempo.onchange = paint;
  paint();
  if (!await answered) { $('navbtn').focus(); return; }
  const blank = templateSelect.value === 'blank';
  const payload = {
    title: title.value,
    // Null means "the tempo this style is written at" — the server resolves it once it
    // knows which style the seed picked, which is the only place that can.
    bpm: !blank && styleTempo.checked ? null : manual,
    bars: Number($('newsongbars').value),
    template: templateSelect.value,
    style: blank ? 'auto' : styleSelect.value,
  };
  newSongPrefs = {
    template: payload.template,
    style: styleSelect.value,
    bars: payload.bars,
    bpm: manual,
    styleTempo: styleTempo.checked,
  };
  localStorage.setItem(NEW_SONG_KEY, JSON.stringify(newSongPrefs));
  let res;
  try {
    res = await fetch('/new-song', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // No server — generate the song right here in the browser. It will not
    // survive a reload (there is no file to read it back from), but the
    // tester can play with it for the session.
    try {
      const seed = Math.floor(Math.random() * 0xffffffff);
      const plan = newSongPlan({ ...payload, seed });
      // A scratch id that nothing in the track list is already using.
      let id = slugForClient(plan.spec.title);
      const taken = new Set(listTracks().map((t) => t.id));
      for (let n = 2; taken.has(id); n++) id = `${slugForClient(plan.spec.title)}-${n}`;
      const track = {
        id,
        bank: plan.bank,
        title: plan.spec.title,
        slug: id,
        group: 'scratch',
        writable: false,            // no server → nothing to save back to
      };
      registerTrack(track);
      saved[id] = null;
      savedArr[id] = null;
      selectSong(id);
      if (playing) setPlaying(true, 0);
      toast(`Created ${track.title} — ${plan.style.label}, ${plan.key}, ${plan.spec.bpm} BPM`
        + ' · stays until you reload', 5000);
    } catch (err) {
      await tell('Could not create the song', escapeHtml(err.message || err));
    }
    return;
  }
  const text = await res.text();
  if (!res.ok) { await tell('Could not create the song', escapeHtml(text)); return; }
  const out = JSON.parse(text);
  registerTrack(out.track);
  saved[out.track.id] = null;
  savedArr[out.track.id] = null;
  selectSong(out.track.id);
  if (playing) setPlaying(true, 0);
  // What it came out as, because with Auto the style is the interesting part of the
  // answer and the alternative is guessing it from the sound.
  toast(`Created ${out.track.title} — ${out.style}, ${out.key}, ${out.bpm} BPM`);
}

$('newsong').onclick = createNewSong;

async function deleteScratchSong() {
  if (!isDeskSong(track) || track?.writable !== true) return;
  closeMenu();
  const id = trackId;
  const title = track.title;
  const ok = await ask(`Delete ${escapeHtml(title)}?`,
    `<b>This cannot be undone.</b><br>`
    + `It removes <b>src/data/imported/${escapeHtml(id)}.js</b> and its saved desk history.`
    + `<br><br>Any unsaved browser draft for this scratch song is discarded too.`, 'Delete');
  if (!ok) { toast('Delete cancelled'); return; }
  let res;
  try {
    res = await fetch('/delete-song', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {
    await tell('Could not delete the song', 'The mixer server did not answer.');
    return;
  }
  if (!res.ok) {
    const body = await res.text();
    await tell('Could not delete the song', res.status === 404
      ? 'This mixer is running older code. Restart <b>npm run mixer</b> and try again.'
      : escapeHtml(body));
    return;
  }
  const fallback = listTracks().find((t) => t.id !== id);
  unregisterTrack(id);
  delete draft[id];
  delete saved[id];
  delete arrDraft[id];
  delete savedArr[id];
  delete songLayouts[id];
  forgetRecent(id);
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
  saveSongLayouts();
  undoStack.length = 0;
  lastEditTag = null;
  if (fallback) selectSong(fallback.id);
  renderSongBrowser();
  toast(`${title} deleted`);
}

$('deletesong').onclick = deleteScratchSong;

// Where playback last began, so Stop has somewhere to go back to. Pause holds where
// it is; Stop returns to the start of the take. That pair is the reason there are
// four buttons instead of one that changes its mind.
let startedAt = 0;

function releaseHeldPreviews() {
  for (const held of previewHeld.values()) {
    Audio.releasePreviewNote(held.laneKey, held.freq);
  }
  previewHeld.clear();
  clearOskHeldVisuals();
  oskHeld.clear();
}

/** Stop every live note and scheduled sound without changing the MIDI switch. */
function silenceAll() {
  releaseHeldPreviews();
  // Stop closes MIDI-held recording tokens too, but leaves the MIDI ports attached.
  releaseOskSources('m:');
  voiceLibrary.stopPattern();
  if (recArmed) setRecord(false);
  if (playing) setPlaying(false);
  else if (Audio.bank) Audio.setBank(null);
  Audio.panic();
  if (oskShown()) {
    oskStep = -1;
    refreshOsk();
  }
}

/**
 * The emergency cut, on ⎋: no held input or scheduled sound survives it.
 *
 * It was a red button in the header as well, which is one control too many for what it
 * does — Stop already silences everything you can hear, and the part panic adds on top
 * (dropping and re-attaching MIDI, so a note-off that never arrived cannot leave a key
 * down) is worth a key you can hit without aiming a mouse at it. Bound in the desk's
 * keyboard handler, where every other context has already had its refusal.
 */
function panicAll() {
  const restoreMidi = midiOn;
  setMidi(false, { announce: false });
  silenceAll();
  if (restoreMidi) setMidi(true, { announce: false });
  toast(restoreMidi
    ? 'PANIC — all sound silenced and MIDI restored'
    : 'PANIC — all sound silenced and MIDI off');
}

/** Start or stop the transport, optionally from a given step.
 *  When `fromStep` is 0 and loop is on with locators set, the loop is armed
 *  WITHOUT jumping — the song plays from the start and begins looping only
 *  when it reaches the locator region naturally. */
function setPlaying(on, fromStep = null) {
  // Before `playing` changes, so `recording()` is still true and the take can measure
  // the keys that are still down against the position the music actually stopped at.
  // The transport stopping is the take ending; the arm stays on, so hitting play again
  // carries straight on recording.
  if (!on && recArmed) endTake('stopped');
  playing = on;
  $('play').classList.toggle('on', playing);
  $('pause').disabled = !playing;
  // The bench's play button says whether it would join the song or start beside it, and
  // that answer changes here. Told rather than left to the next repaint: the library
  // does not repaint on transport, so it would have gone on offering the wrong one.
  voiceLibrary.syncChanged();
  peakSeen = 0;
  if (playing) {
    // Resume where the playhead was parked, not back at the top.
    const at = fromStep != null ? fromStep : parkedAt;
    startedAt = at;
    Audio.setBank(track.bank, mixFor(trackId), arrFor(trackId));
    applyToEngine(mixFor(trackId));
    Audio.step = at;
    // "Play from start" with loop on: arm the selected loop region but don't jump
    // the playhead into it — let the song play from 0 and naturally enter the loop.
    if (fromStep === 0 && loopOn && currentLoopBounds()) {
      applyLoopNoJump();
    } else {
      applyLoop(at);
    }
    // The beat the take starts on, so the first boundary the playhead crosses is a real
    // crossing rather than a flush measured against a stale `-1`.
    recLastBeat = Math.floor((at % Math.max(1, songShape().totalSteps)) / 4);
    recLastHeard = at;
  } else {
    // Exactly where the playhead is, so Play carries on from here; the loop region
    // still snaps to the bar that contains it.
    const { totalSteps } = songShape();
    parkedAt = ((Audio.step % totalSteps) + totalSteps) % totalSteps;
    Audio.setLoop();
    Audio.setBank(null);
    // setBank(null) is the game's "no song" state: applyMix zeroes every send and
    // clears the dry taps, and with no entry to read it never puts them back, so
    // pruneAuxes then unhooks the returns. Harmless in the game, which only reaches
    // that state on the way out of a song — but the desk sits in it every time you
    // pause, and the sends came back only when something re-applied the mix, which
    // made them look like they needed an A/B to wake up. The engine should always
    // carry the mix you are looking at, playing or not.
    applyToEngine(mixFor(trackId));
    flushSelectionEditors();
  }
  // Armed and recording look different, and which one this is has just changed.
  syncRecordUi();
}
$('play').onclick = () => { if (!playing) setPlaying(true); };
$('pause').onclick = () => { if (playing) setPlaying(false); };
$('stop').onclick = () => {
  const at = startedAt;
  silenceAll();
  jumpTo(at, { immediate: true });
  toast(`Stopped at bar ${Math.floor(at / 16) + 1}`);
};
$('playstart').onclick = () => { jumpTo(0, { start: true }); };
$('clearsolo').onclick = clearAllSolo;
$('oskbtn').onclick = () => showOsk(!oskShown());
// The header's pair. Same two functions the keyboard's own buttons call, so there is one
// switch behind each and nothing to keep in step by hand.
$('midibtn').onclick = () => setMidi(!midiOn);
$('recbtn').onclick = () => setRecord(!recArmed);
// One button each, because they are two panels and either can be up without the other.
// The roll's also has the Notes chip in the region it lives in; the grid has no region, so
// the toolbar is the only place it could go.
$('seqbtn').onclick = () => showStepSeq(!stepSeq.isOpen());
$('rollbtn').onclick = () => showPianoRoll($('notes').classList.contains('collapsed'));
$('pause').disabled = true;

// Lives on the master's pinned card, not in the toolbar: it is a property of the
// master strip, and the toolbar is for what you touch WHILE mixing.
function setLimiter(on) {
  editMix((m) => { m.limiter = on; });
  Audio.mixer?.setLimiter(on);
  buildRack();
}

// Hold to hear what is on disk, release to come back to the draft.
const abDown = () => { if (abHeld) return; abHeld = true; $('ab').classList.add('on'); applyToEngine(saved[trackId] || emptyMix()); };
const abUp = () => { if (!abHeld) return; abHeld = false; $('ab').classList.remove('on'); applyToEngine(mixFor(trackId)); };
$('ab').addEventListener('mousedown', abDown);
$('ab').addEventListener('mouseup', abUp);
$('ab').addEventListener('mouseleave', abUp);

/**
 * What src/data/mix.js holds RIGHT NOW, into `saved`.
 *
 * `saved` starts as the copy of the file this page was bundled with and is replaced by
 * the file re-read after each of this desk's own saves — so it is exactly right until
 * something else writes the file: another tab, a hand edit, a git checkout under the
 * running server. Everything that means "what is on disk" reads `saved`: the dirty dot,
 * Save, A/B, and Revert. A stale one makes all four quietly lie, and Revert lie
 * loudest, because it is the one that throws your work away to agree with it.
 *
 * Best effort. An older server with no /mix route leaves the page's own copy in place,
 * which is what the desk did before this existed.
 */
async function refreshSaved() {
  try {
    const res = await fetch('/mix');
    if (!res.ok) throw new Error(String(res.status));
    const { mix, arrangements } = await res.json();
    if (mix && typeof mix === 'object') saved = mix;
    if (arrangements && typeof arrangements === 'object') savedArr = arrangements;
  } catch { /* keep the copy we have — see above */ }
}

$('revert').onclick = async () => {
  // The file first, then the comparison. Reverting to a remembered version of the file
  // is how an afternoon's work goes back to a morning nobody asked for.
  await refreshSaved();
  if (!isDirty(trackId)) { toast('Nothing to discard — this song already matches its file'); return; }
  pushUndo(null);
  discardSongDraft(draft, arrDraft, trackId);
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
  // Through the whole song-state path, not buildRack alone: either draft may have
  // changed the lane list, bar count, timeline or notes the engine is playing.
  bankCache.sig = null;
  Audio.setArrangement(arrFor(trackId));
  pushTempo();                 // the tempo is on the arrangement, so it went back too
  buildTimeline();
  rebuildForShape();
  applyLoop(Audio.step);
  stepSeq.refresh();
  pianoRoll.refresh();
  updateStatus();
  toast(`Unsaved changes to ${track.title} discarded — ⌘Z to undo`);
};



$('undo').onclick = undo;

// Keyboard shortcuts. Everything here is something you reach for repeatedly while
// balancing; anything you do once per session stays a button.
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // Never steal keys from a control the user is actually typing or dragging in.
  if (e.target.matches('input, select, textarea')) return;
  // The on-screen keyboard, while it is catching keys, gets first refusal on the
  // letters — it wants M, S, B and L for notes, and having them mute the channel
  // half way up a run is not a shortcut anyone asked for. Everything it does not
  // claim falls through, so space still plays the song and ⌘Z still undoes.
  if (oskTypedKey(e)) { e.preventDefault(); return; }
  // ⎋ is PANIC — what the red button in the header used to be. Everything that has a
  // smaller thing to back out of has already taken this key before it gets here: an open
  // dialog, menu or drawer, and a grid holding a selection. What is left is a desk with
  // nothing in front of it, where the only thing Escape could sensibly mean is "stop".
  //
  // The unwritten end of a take goes with it, which is what Escape meant while recording
  // when the on-screen keyboard was catching keys. Careful about what that claims: the
  // take is written every beat, so this drops the last half-second at most and ⌘Z is what
  // takes back the part already in the song.
  if (e.key === 'Escape') {
    e.preventDefault();
    const dropped = recArmed ? discardTake() : 0;
    panicAll();
    if (dropped) {
      toast(`PANIC — all sound silenced · ${dropped} unwritten note${dropped === 1 ? '' : 's'}`
        + ' dropped, ⌘Z for what was already recorded');
    }
    return;
  }
  const lanes = deskLanes(viewBank(), 1);
  const idx = lanes.findIndex((l) => l.key === selectedLane);
  const key = e.key.toLowerCase();

  if (e.code === 'Space') { e.preventDefault(); (playing ? $('pause') : $('play')).click(); return; }
  // ⇧R, and it has to be tested BEFORE the unshifted branches below: this handler
  // lowercases the key and does not look at Shift, so an `r` branch reached first would
  // reset the channel every time you tried to arm. Shifted rather than plain R because
  // plain R is the reset and has been for a long time — and because `oskTypedKey` now
  // declines everything shifted, arming works with your hands still on the notes.
  if (e.shiftKey && key === 'r') { e.preventDefault(); setRecord(!recArmed); return; }
  if (e.shiftKey) return;
  if (key === 'l') { $('looptoggle').click(); return; }
  if (key === 'g') { $('seqbtn').click(); return; }   // g for grid — the kit's window
  if (key === 'n') { $('rollbtn').click(); return; }  // n for notes — this channel's part
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    const { totalSteps } = songShape();
    const step = Audio.step + (e.key === 'ArrowRight' ? 16 : -16);
    Audio.setLoop();
    Audio.step = Math.max(0, step);
    Audio.nextTime = Audio.ctx.currentTime + 0.03;
    applyLoop(Audio.step);
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (!lanes.length) return;
    const next = idx === -1 ? 0 : (idx + (e.key === 'ArrowDown' ? 1 : -1) + lanes.length) % lanes.length;
    selectLane(lanes[next].key);
    return;
  }
  // Line up the playhead with the music, by eye, while the song runs. The number
  // this nudges is the only part of the playhead that cannot be computed: how long
  // a frame takes to reach the glass is a property of the screen, and a display that
  // holds two or three frames leaves the line trailing the kick with everything else
  // about it correct. Under the hand and against the music beats opening a menu,
  // typing a guess, and listening again.
  if (e.key === '[' || e.key === ']') {
    setPhOffset(phOffset + (e.key === ']' ? 10 : -10));
    toast(`Playhead ${phOffset > 0 ? '+' : ''}${phOffset}ms — ] if it still lags, [ if it runs ahead`);
    return;
  }
  if (!selectedLane) return;
  const strip = document.querySelector(`.strip[data-lane="${CSS.escape(selectedLane)}"]`);
  if (key === 'm') { strip?.querySelector('.mutebtn')?.click(); return; }
  if (key === 's') { strip?.querySelector('.solobtn')?.click(); return; }
  if (key === 'r') { resetTarget(selectedLane); return; }
  if (key === 'b') {                      // bypass every effect on the selected channel
    const list = effectsOf(selectedLane);
    if (!list.length) return;
    const anyOn = list.some((x) => !x.bypass);
    setEffects(selectedLane, list.map((x) => ({ ...x, bypass: anyOn })));
    toast(anyOn ? 'All effects bypassed' : 'All effects on');
  }
});

// The song as a WAV. The server renders it offline through the real engine with the
// mix currently on the desk — draft included, so you can hear a change before you
// decide to save it — and writes dist/<slug>-mix.wav at unity.
//
// It is a wait, not a click: the render is offline and the first one has to start
// the server's headless Chromium. Hence a toast that stays up until it is done, and
// a button that will not take a second job while the first is running. Everything
// else on the desk keeps working meanwhile; the render happens over there.
let rendering = false;
async function renderJob(btn, route, working, describe) {
  if (rendering) { toast('A render is already running'); return; }
  rendering = true;
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Rendering…';
  toast(working, 0);
  try {
    let res;
    try {
      res = await fetch(route, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trackId, mix: mixFor(trackId) }),
      });
    } catch { res = null; }
    if (!res || !res.ok) {
      // Same trap the MIDI button meets: a mixer left running from before this
      // route existed answers 404, and "render failed" is a poor way to say
      // "restart the tool".
      toast(res && res.status === 404
        ? `No ${route} route — this mixer is running older code, restart npm run mixer`
        : `Render failed${res ? ` (${res.status})` : ' — the mixer server is not answering'}`,
      6000);
      // Whatever the server has to say — a missing venv comes back this way, and it
      // comes with the two lines that fix it.
      if (res && res.status !== 404) await tell('That render did not finish', escapeHtml(await res.text()));
      return;
    }
    toast(describe(await res.json()), 8000);
  } finally {
    rendering = false;
    btn.disabled = false;
    btn.textContent = label;
  }
}

// Peak and LUFS both, because they answer different questions: peak says whether
// this render clipped, LUFS says whether it sits with the other thirty-three.
const measured = (info) => `${info.lufs.toFixed(1)} LUFS `
  + `(${info.toTarget >= 0 ? '+' : ''}${info.toTarget.toFixed(1)} dB to target) · `
  + `peak ${info.peakDb.toFixed(1)} dBFS${info.clipping ? ' · ** CLIPPING **' : ''}`;

$('renderwav').onclick = () => renderJob($('renderwav'), '/render',
  `Rendering ${track.title} — offline, slower than real time…`,
  (info) => `${info.file} · ${measured(info)}`);

// The same render, straight into tools/audition: a real AU plugin over this mix,
// its own GUI open, previewed before anything is kept. What the desk's effects
// cannot do — Ozone, Valhalla, a Waves shell — happens there, and Audition's OK
// writes its own WAV beside this one.
//
// The plugin window opens on the machine running the mixer, because that is the
// machine the plugins are installed on.
$('auditionwav').onclick = () => renderJob($('auditionwav'), '/audition',
  `Rendering ${track.title} for Audition — the plugin window follows…`,
  (info) => `Audition opening on ${info.file} · ${measured(info)}`);

// The notes, as MIDI. The server builds it from the same bank the desk is playing;
// tools/import-midi.js reads the format back into a bank if it comes home edited.
//
// Fetched rather than pointed at with a download link: a plain link happily saves
// whatever comes back, so a server running code older than this route turned its
// 404 into a file called midi.txt. Now it says what actually happened.
$('midi').onclick = async () => {
  // With the GM programs: naming each track's patch is most of what makes the file
  // useful when it lands in a DAW. The channel layout stays as it is — everything on
  // 1, drums on 10 — because Logic externalizes multi-channel files (silent tracks).
  // The chord lane's program must be polyphonic (see render-midi-bank.js).
  const url = `/midi?track=${encodeURIComponent(trackId)}&patches=1`;
  let res;
  try { res = await fetch(url); } catch { res = null; }
  if (!res || !res.ok || !/midi/.test(res.headers.get('content-type') || '')) {
    toast(res && res.status === 404
      ? 'No MIDI route — this mixer is running older code, restart npm run mixer'
      : `MIDI failed${res ? ` (${res.status})` : ''}`);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await res.blob());
  a.download = `${track.slug || trackId}.mid`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`${track.title} — ${a.download}`);
};

/**
 * This song's edits, as a JSON file you name.
 *
 * The desk's own safety nets all live where the accident does: the draft is in this
 * browser's localStorage, and .mix-history/ is beside the file a bad save overwrote.
 * Both are gone if the thing that went wrong was the browser, the folder, or a server
 * quietly running last week's code. This is the copy that is somewhere else.
 *
 * What it holds is the song AS THE DESK HAS IT — draft over file, which is what you
 * are listening to — rather than only the unsaved half. A backup that restores to
 * "whatever was on disk, plus the bits you had not saved" is not a copy of anything
 * that ever played. `unsaved` records which of the two it was, because that is the
 * fact you will want when you open the file in six weeks.
 *
 * Export only, and one song. See the note in mixer-shell.html: the import this used to
 * have pasted one song's balance onto whichever song happened to be on the desk, and a
 * mix means nothing away from the parts it was balanced against. The way back into a
 * song is "Open an earlier version…", which cannot address another one.
 */
$('exportjson').onclick = async () => {
  // Sortable, filename-safe, and no colons — Finder tolerates them, zip files do not.
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const suggested = `${track.slug || trackId}-${stamp}.json`;
  const answered = ask('Export this song’s edits',
    `<p>A copy of <b>${escapeHtml(track.title)}</b> exactly as the desk has it now —`
    + ' every fader, effect, added lane and painted step.</p>'
    + '<label class="askfield">File name'
    + `<input id="exportname" type="text" spellcheck="false" value="${escapeHtml(suggested)}"></label>`,
    'Export');
  // After `ask` has written the body, before it is awaited. The name is the question,
  // so the field takes the focus — and only the stem is selected, because the moment
  // anyone renames one of these it is the stem they are renaming.
  const field = $('askbody').querySelector('#exportname');
  field.focus();
  field.setSelectionRange(0, Math.max(0, suggested.length - '.json'.length));
  if (!await answered) return;

  let name = (field.value || '').trim().replace(/[/\\]+/g, '-');
  if (!name) name = suggested;
  if (!/\.json$/i.test(name)) name += '.json';

  const payload = {
    kind: 'mashenstein-song-edits',
    version: 1,
    song: trackId,
    title: track.title,
    exported: new Date().toISOString(),
    unsaved: isDirty(trackId),
    mix: JSON.parse(JSON.stringify(mixFor(trackId))),
    arrangement: JSON.parse(JSON.stringify(arrFor(trackId) ?? null)),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`],
    { type: 'application/json' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`${track.title} — ${name}${payload.unsaved ? ' (unsaved edits included)' : ''}`, 5000);
};

// MIDI in. The file goes to the server, which runs the same conversion the CLI does
// and writes a bank beside the hand-written ones; what comes back is the summary and
// the bank itself.
//
// The new song becomes a track and the desk switches to it here and now. It used to
// end at "written to a file, go and register it by hand", which is a strange thing
// for a desk to say — you imported a song because you wanted to hear it. The bank on
// disk is what makes it survive a reload; this is what makes it play.
//
// Importing the same filename again lands on the same track id, so a song that has
// been round the DAW comes back over itself rather than piling up copies.
$('importmidi').onclick = () => $('midifile').click();
$('midifile').onchange = async () => {
  const file = $('midifile').files[0];
  if (!file) return;
  $('midifile').value = '';
  toast(`Reading ${file.name}…`);
  const res = await fetch(`/import-midi?file=${encodeURIComponent(file.name)}`, {
    method: 'POST', body: await file.arrayBuffer(),
  });
  const body = await res.text();
  if (!res.ok) { await tell(`Could not import ${file.name}`, escapeHtml(body)); return; }
  const out = JSON.parse(body);
  if (!out.track) {                     // server older than this page
    await tell(`Imported ${file.name}`, `Written to <b>${out.file}</b>.<br>Restart <b>npm run mixer</b> to play it.`);
    return;
  }
  const replaced = !!resolveTrack(out.track.id);
  registerTrack(out.track);
  selectSong(out.track.id);
  if (playing) setPlaying(true, 0);     // straight into the new song, from the top

  const lanes = out.assignments.map((a) => `${a.name} → ${a.lane}`).join('\n  ');
  const notes = (out.moved ? `${out.moved} notes moved onto the sixteenth grid.\n` : '')
    + (out.foreignDrums.length ? `GM percussion outside our kit: ${out.foreignDrums.join(', ')}\n` : '');
  toast(`${replaced ? 'Replaced' : 'Imported'} ${out.track.title} — ${playing ? 'now playing' : 'loaded'}`);
  await tell(`Imported ${escapeHtml(file.name)}`,
    `<b>${out.bpm} bpm</b>, ${out.blocks} blocks → ${out.sections} sections, `
    + `written to <b>${escapeHtml(out.file)}</b>.<br><br>`
    + escapeHtml(lanes) + '<br><br>'
    + (notes ? `${escapeHtml(notes)}<br>` : '')
    + `The desk is on it now, under <b>imported</b> as ${escapeHtml(out.track.id)}`
    + `${replaced ? ' (it replaced the last import of that name)' : ''}.<br><br>`
    + 'Timbres, glissandi and per-section overrides are not in a MIDI file — set '
    + `those by hand in ${escapeHtml(out.file)}.`);
};


// There is no matching import. Pasting a mix in took a track entry — any song's — and
// made it the draft for whatever song happened to be on the desk, or took a whole file
// and made it the draft for every song at once. Both are the same mistake: a mix is a
// set of decisions about ONE song's parts, arrived at by listening to them, and it says
// nothing true about any other song. The way back into an earlier mix is Restore a
// previous save, which reads one song's entry — this song's — out of a snapshot.

/**
 * Write ONE song into the mix file — the song, singular, that the desk is on.
 *
 * That is how mixing goes: you work on a song, you finish with it, you commit it.
 * Sweeping up three others you happened to touch an hour ago is how a change nobody
 * remembers making ends up in a diff, and it takes one id rather than a list so that
 * there is no shape a caller can pass to save more than the song in front of them.
 *
 * Only that song goes over the wire. The desk used to post its whole idea of the
 * file — every song, as read when the page loaded — so a save from a tab that had
 * been open since this morning wrote this morning's copy of the other thirty-three
 * back over anything that had landed since. The merge happens on the server now,
 * against the file as it stands; what comes back is the file re-read, which is what
 * `saved` becomes.
 *
 * A song with no draft entry is sent as `null`, which means "take it out of the
 * file" — the shape Reset every channel leaves behind.
 */
/**
 * Freeze every non-engine voice a song uses into its own `voiceParams`, so library
 * preset edits never change the sound of a song that has been saved. A voice already
 * in `voiceParams` or already song-local is left alone — this only snapshots the ones
 * still pointing at the library.
 */
function freezeVoices(mix, trackId) {
  if (!mix || !mix.voice) return;
  const vp = mix.voiceParams || {};
  let changed = false;
  for (const [voiceKey, voiceId] of Object.entries(mix.voice)) {
    if (vp[voiceKey]) continue;                       // already frozen
    const lib = VOICES[voiceId];
    if (!lib || lib.kind === 'engine' || lib.songLocal) continue; // nothing to freeze
    vp[voiceKey] = JSON.parse(JSON.stringify(lib));
    changed = true;
  }
  if (changed) mix.voiceParams = vp;
}

async function saveMix(id) {
  const mixDirty = draft[id] != null && mixChanged(draft[id], saved[id]);
  const arrangementDirty = arrDirty(id);
  const patch = {};
  if (mixDirty) {
    patch.mix = JSON.parse(JSON.stringify(draft[id]));
    freezeVoices(patch.mix, id);
  }
  if (arrangementDirty) patch.arrangement = JSON.parse(JSON.stringify(arrDraft[id] ?? null));
  if (!Object.keys(patch).length) return true;
  const res = await fetch('/save', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, patch }, null, 2),
  });
  const text = await res.text();
  if (!res.ok) { await tell('That save did not go through', escapeHtml(text)); return false; }
  if (mixDirty) delete draft[id];
  // An older server answers 'ok' in plain text and has merged nothing; then the draft
  // we just wrote is the best account of the file we have. A current one sends the
  // file back, which is a better one.
  try {
    const body = JSON.parse(text);
    if (body && body.mix) saved = body.mix;
    else throw new Error('no mix');
    // Same for the arrangement layer. Clear only the half this request actually
    // wrote; an arrangement-only save must not discard a still-unsaved mix draft.
    if (body.arrangements) savedArr = body.arrangements;
    if (arrangementDirty) delete arrDraft[id];
  } catch {
    if (mixDirty) saved[id] = JSON.parse(JSON.stringify(patch.mix));
    if (arrangementDirty) { savedArr[id] = arrDraft[id] ?? null; delete arrDraft[id]; }
  }
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
  updateStatus();
  return true;
}

// ---- restore a previous save -------------------------------------------------
//
// Every write to src/data/mix.js copies the version it replaces into .mix-history/.
// This is the way back into one. It does NOT write anything: the snapshot is loaded
// into the draft, so it arrives as an ordinary unsaved edit — audible immediately,
// ⌘Z away from being undone, and only in the file once you Save it.

/** `2026-07-28 19:34:02` → `19:34, today` / `Mon 19:34` / the date, for older ones. */
function whenLabel(ms) {
  const then = new Date(ms);
  const now = new Date();
  const hm = `${String(then.getHours()).padStart(2, '0')}:${String(then.getMinutes()).padStart(2, '0')}`;
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate())
    - new Date(then.getFullYear(), then.getMonth(), then.getDate())) / 86400000);
  if (days === 0) return `${hm} today`;
  if (days === 1) return `${hm} yesterday`;
  if (days < 7) return `${hm} ${then.toLocaleDateString(undefined, { weekday: 'short' })}`;
  return `${hm} ${then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

/**
 * Put a snapshot's version of THE SONG ON THE DESK into its draft. Only ever that one.
 *
 * A snapshot is a byte copy of the whole file, so it holds every song — but a restore
 * takes one song's entry out of it and leaves the other thirty-three alone. There is
 * no "restore everything" and there is no way to point one song's settings at another:
 * the entry read here is always `mix[trackId]`, the song you are listening to, and the
 * song you are listening to is the only draft this writes.
 *
 * That is the whole rule this desk works by. A mix is balanced by ear against one
 * song's parts, so it means nothing on another song's — landing one on the wrong
 * track is not an edit you can hear your way out of, it is an evening gone.
 */
async function restoreFrom(file) {
  let mix, arrangements;
  try {
    const res = await fetch(`/history/${encodeURIComponent(file)}`);
    if (!res.ok) throw new Error(await res.text());
    ({ mix, arrangements } = await res.json());
  } catch (err) {
    toast(`Could not read that snapshot — ${err.message || err}`, 6000);
    return;
  }
  const entry = mix[trackId];
  const arrangement = arrangements?.[trackId] ?? null;
  const ok = await ask(`Put ${escapeHtml(track.title)} back to that version?`,
    (entry ? '' : `That version has nothing saved for this song, so this takes every `
      + 'channel back to its default.<br><br>')
    + (isDirty(trackId) ? 'The unsaved changes on it are replaced.<br><br>' : '')
    + 'Nothing is written until you <b>Save song</b> — until then the game plays what it plays now.',
    'Load it');
  if (!ok) { toast('Restore cancelled'); return; }
  pushUndo(null);
  // A song absent from either half carried no decisions there. Restore both halves:
  // a historical balance over today's added lanes or painted notes is not a version
  // that ever existed.
  restoreSongDraft(draft, arrDraft, trackId, entry, arrangement);
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  localStorage.setItem(ARRANGE_KEY, JSON.stringify(arrDraft));
  bankCache.sig = null;
  Audio.setArrangement(arrFor(trackId));
  pushTempo();                 // including the tempo that version was played at
  buildTimeline();
  rebuildForShape();
  applyLoop(Audio.step);
  stepSeq.refresh();
  pianoRoll.refresh();
  updateStatus();
  toast(`${track.title} restored from ${file} — unsaved, ⌘Z to undo`, 6000);
}

$('history').onclick = async (ev) => {
  ev.stopPropagation();
  const r = $('history').getBoundingClientRect();
  let snapshots = [];
  try {
    // This song's own saves, and no others. The server does the filtering, because it
    // is the side that named the files and knows how it slugged them.
    const res = await fetch(`/history?track=${encodeURIComponent(trackId)}`);
    if (!res.ok) throw new Error(String(res.status));
    ({ snapshots } = await res.json());
  } catch {
    toast('No /history route — this mixer is running older code, restart npm run mixer', 6000);
    return;
  }
  closeMenu();
  if (!snapshots.length) {
    toast(`No previous saves of ${track.title} yet — one is kept every time you save it`, 5000);
    return;
  }
  // Headed with the song, because it is the only song these can touch — see restoreFrom.
  // Every entry is a save of THIS song, so the list is times: the moments this mix
  // changed, newest first. A save of some other song moved nothing here, and an entry
  // for it would be a choice that does nothing you would recognise.
  openMenu(r.left, r.bottom + 4, `Put ${track.title} back to…`, snapshots.slice(0, 20).map((s) => ({
    label: whenLabel(s.at),
    run: () => restoreFrom(s.file),
  })));
};

/**
 * Ask something, in the desk rather than in the browser.
 *
 * `confirm()` opens a system panel headed with the PORT you happen to be on
 * — "127.0.0.1:8010 says" — which reads like the page has done something wrong, and
 * cannot say anything in bold. This is the same question asked by the tool asking it.
 *
 * Returns a promise for true/false. Enter confirms, Escape cancels, and clicking the
 * backdrop cancels, because the safe answer is always "no".
 */
// The dialog body is HTML — that is what lets a filename be bold — so anything
// arriving from a server or a file has to be escaped on the way in. Newlines become
// breaks, because these are messages that were written as lines.
const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\n/g, '<br>');

/** Say something, in the desk. The `alert()` half of ask(). */
const tell = (title, body) => ask(title, body, 'OK', { cancel: false });

function ask(title, body, okLabel = 'Save song', { cancel = true } = {}) {
  return new Promise((resolve) => {
    $('asktitle').textContent = title;
    $('askbody').innerHTML = body;
    $('askok').textContent = okLabel;
    // With nothing to cancel it is a statement, not a question: one button, and
    // Escape closes it like any other.
    $('askcancel').hidden = !cancel;
    $('ask').classList.add('show');
    $('askok').focus();
    const done = (answer) => {
      $('ask').classList.remove('show');
      $('askok').onclick = null;
      $('askcancel').onclick = null;
      $('ask').onpointerdown = null;
      removeEventListener('keydown', onKey, true);
      resolve(answer);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(true); }
    };
    $('askok').onclick = () => done(true);
    $('askcancel').onclick = () => done(false);
    // The backdrop only — a click inside the box is not an answer.
    $('ask').onpointerdown = (e) => { if (e.target === $('ask')) done(false); };
    addEventListener('keydown', onKey, true);
  });
}

$('save').onclick = async () => {
  // Shut the drawer before the dialog, not after it: confirm() blocks, and the menu
  // would otherwise sit open behind it for as long as you took to read it.
  closeMenu();
  if (!isDirty(trackId)) { toast(`${track.title} already matches the file`); return; }
  // Only this song. What the other songs are holding is their business — the desk
  // saves one song at a time, so listing them was answering a question nobody asked
  // in the moment they were trying to answer a different one.
  const ok = await ask(
    `Save ${track.title}?`,
    isDeskSong(track)
      ? `<b>This ${track.group === 'styleAudition' ? 'style audition' : 'scratch song'} stays `
        + `outside the game catalogue.</b><br>`
        + `Writes <b>src/data/imported/${trackId}.js</b>. The version it replaces is kept, `
        + `so you can go back to it.`
      : `<b>The game will play it from now on.</b><br>`
        + `Writes <b>src/data/songs/${trackId}.js</b>. The version it replaces is kept, `
        + `so you can go back to it.`,
  );
  if (!ok) { toast('Save cancelled'); return; }
  // saveMix ran updateStatus, which is what turns the dot off and the menu item to
  // "saved" — the toast is the part that says it out loud.
  if (await saveMix(trackId)) toast(`${track.title} saved`);
};

// There is no "save every changed song". One Save, for the song you are on, named in
// the dialog — a sweep that wrote several songs at once wrote most of them from memory
// rather than from listening, and a mix nobody was listening to is a mix nobody
// checked. The other songs' drafts keep until you are on them; Save says so.

$('resetsong').onclick = () => {
  pushUndo(null);
  // The song's SHAPE survives a reset of its channels. "Reset every channel" is about
  // levels, and a duplicated track thrown away by a button that promised to move
  // faders is a track you have to build again. Delete is how a track goes.
  const cur = mixFor(trackId);
  draft[trackId] = {
    master: 0, masterPan: 0, limiter: false, lanes: {},
    ...(cur.layers?.length ? { layers: JSON.parse(JSON.stringify(cur.layers)) } : {}),
    ...(cur.off?.length ? { off: [...cur.off] } : {}),
    // A layer with no voice makes no sound at all, so its voice is not a channel
    // setting to clear — it is the lane. Only the layers' voices are kept.
    ...(cur.layers?.length && cur.voice ? { voice: Object.fromEntries(
      cur.layers.map((l) => [seamFor(l.key).voiceKey, cur.voice[seamFor(l.key).voiceKey]])
        .filter(([, v]) => v),
    ) } : {}),
  };
  if (draft[trackId].voice && !Object.keys(draft[trackId].voice).length) delete draft[trackId].voice;
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  rebuildForShape(); updateStatus();
  toast(`Every channel in ${track.title} reset — ⌘Z to undo`);
};

// Web Audio needs a gesture before it will make a sound. Refresh the authoritative
// per-file state first so a scratch song opened from the previous session starts with
// its saved mix/arrangement rather than the empty defaults in MIX.
buildMasterToolbar();
$('start').onclick = async () => {
  Audio.ensure();
  $('gate').remove();
  await refreshSaved();
  // In the static deployed mixer, if the desk would open on an authored game song,
  // auto-create a blank scratch song instead so the tester lands on their own content.
  if (typeof __MASH_STATIC_MIXER__ !== 'undefined') {
    const resolved = resolveTrack(trackId);
    if (!resolved || (resolved.group !== 'scratch' && resolved.group !== 'imported')) {
      try {
        const seed = Math.floor(Math.random() * 0xffffffff);
        const plan = newSongPlan({ template: 'blank', title: 'Untitled', bars: 8, bpm: 120, style: 'auto', seed });
        let id = slugForClient(plan.spec.title);
        const taken = new Set(listTracks().map((t) => t.id));
        for (let n = 2; taken.has(id); n++) id = `${slugForClient(plan.spec.title)}-${n}`;
        const track = {
          id,
          bank: plan.bank,
          title: plan.spec.title,
          slug: id,
          group: 'scratch',
          writable: false,            // no server → nothing to save back to
        };
        registerTrack(track);
        saved[id] = null;
        savedArr[id] = null;
        trackId = id;
      } catch (err) {
        // If auto-create fails, fall through to whatever trackId we already have.
      }
    }
  }
  selectSong(trackId);
  // If MIDI was on last session, turn it back on now (needs a user gesture).
  if (localStorage.getItem(MIDI_LS_KEY)) setMidi(true, { announce: false });
  // If the preset library was open last session, open it again.
  if (localStorage.getItem('mash-mixer-library-open')) openPresetLibrary();
  tick();
};
