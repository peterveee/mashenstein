import { readFileSync } from 'node:fs';
import { createUndoHistory } from '../tools/mixer-undo.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (condition, msg) => (condition ? ok(msg) : fail(msg));

let value = 0;
const history = createUndoHistory({
  capture: () => ({ value }),
  restore: (snapshot) => { value = snapshot.value; },
});

history.reset();
value = 1;
history.touch();
assert(history.canUndo(), 'a single edit becomes undoable');
assert(history.undo() && value === 0, 'undo restores the state before a click');
assert(!history.canUndo(), 'the consumed edit is removed from the undo stack');

history.reset();
history.begin();
value = 1; history.touch();
value = 2; history.touch();
value = 3; history.touch();
history.end();
assert(history.undo() && value === 0, 'a continuous drag is one undo step');
assert(!history.canUndo(), 'intermediate drag frames are not separate undo steps');

history.reset();
history.begin();
history.touch();
history.end();
assert(!history.canUndo(), 'a gesture that changes nothing creates no undo step');

// Switching preset is a reset: what was undoable on the old sound must not be reachable
// from the new one, or ⌘Z steps a preset you are no longer looking at backwards.
history.reset();
value = 1; history.touch();
history.reset();
assert(!history.canUndo(), 'reset drops the history of the preset that was open');
value = 9;
assert(!history.undo() && value === 9, 'undo after a reset changes nothing');

// A blank panel captures null, and neither capture nor restore may throw on it.
let blankValue = null;
const blankHistory = createUndoHistory({
  capture: () => (blankValue == null ? null : { value: blankValue }),
  restore: (snapshot) => { if (snapshot) blankValue = snapshot.value; },
});
blankHistory.reset();
blankHistory.touch();
assert(!blankHistory.canUndo(), 'a blank panel has nothing to undo');

const fullSource = readFileSync(new URL('../tools/mixer-synth-full.js', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../tools/mixer-voice-editor.js', import.meta.url), 'utf8');
assert(fullSource.includes('sfundo') && fullSource.includes('Ctrl/Cmd+Z')
  && fullSource.includes('kit.undo()'),
  'Advanced Patch exposes an Undo button and keyboard shortcut');
// `beginGesture`/`endGesture` ARE the shared history's begin/end, with the level
// estimate's hold folded in — see `scheduleEstimate`. The window's controls must reach
// the history through those and not through a second transaction of their own.
assert(editorSource.includes('beginUndo: beginGesture')
  && editorSource.includes('endUndo: endGesture')
  && /const beginGesture = \(\) => \{ gesturing = true; undoHistory\.begin\(\); \};/
    .test(editorSource)
  && editorSource.includes('undo: undoEdit'),
  'the Advanced window uses the shared editor history');

// The one thing a held control must not do is re-level the preset while it is still
// being held: a pot sitting against its stop stops changing, the debounce fires into the
// middle of the gesture, and the next note arrives at a loudness nobody asked for.
assert(/if \(gesturing\) \{ estimateDeferred = true; return; \}/.test(editorSource),
  'the level estimate waits for the hand to come off the control');
assert(fullSource.includes('kit.beginUndo()') && fullSource.includes('kit.endUndo()'),
  'the Advanced window’s fader brackets its drag too');

// The desk's own ⌘Z is a whole-mix undo, and a song-local preset edit reaches it through
// `voiceParams`. One keypress must not step both stacks, so the window's key handler has
// to CAPTURE — its listener goes on at open(), long after the desk's — and stop there.
assert(/addEventListener\('keydown', onKeyDown, true\)/.test(fullSource)
  && /removeEventListener\('keydown', onKeyDown, true\)/.test(fullSource),
  'the Advanced window takes ⌘Z in the capture phase, ahead of the desk');
assert(fullSource.includes('ev.stopImmediatePropagation()'),
  'an undo in the Advanced window never reaches the desk’s mix undo');

// An editor undo writes the reverted preset into the song's mix, but must NOT leave a
// desk undo step behind it — two entries for a change that netted zero, the second of
// which re-applies the edit.
const entrySource = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
assert(editorSource.includes('onEdit(state.id, asSongPreset(state.voice), { undo: false })'),
  'the editor’s undo writes the mix without pushing a desk undo step');
assert(/function writeSongVoice\(id, preset, \{ undo = true \} = \{\}\)/.test(entrySource)
  && /`voiceparams:\$\{key\}`, \{ undo \}\)/.test(entrySource),
  'and writeSongVoice carries that through to editMix');

// The history belongs to the preset. All three ways off a preset drop it.
for (const [fn, marker] of [['open', 'build({ keepScroll: false })'], ['blank', 'onBlank()'],
  ['forget', 'function forget()']]) {
  const at = editorSource.indexOf(marker);
  const window_ = editorSource.slice(Math.max(0, at - 900), at + 900);
  assert(at > 0 && window_.includes('undoHistory.reset()'),
    `${fn}() clears the undo history`);
}

if (failed) {
  console.log(`\nMIXER UNDO: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nMIXER UNDO: PASSED');
