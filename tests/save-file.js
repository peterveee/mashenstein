// SETTINGS > IMPORT / EXPORT: the whole save to a .mash file and back.
//
// Two things matter here. The file must carry everything a player would mourn —
// three shifts, settings, every Lab song — and nothing that belongs to the
// device it came from. And EXPORT and IMPORT must act INSIDE the browser's own
// tap or key event: iOS opens a share sheet or a file picker for no one else,
// and the game's frame loop always runs after the event has finished.
import { installDom } from './dom-stub.js';
const dom = installDom();

const { Input } = await import('../src/engine/input.js');
const { Audio } = await import('../src/engine/audio.js');
const { Save, readSaveFile, defaultSettings } = await import('../src/engine/save.js');
const { SaveFileState, exportFileName, exportedLabel, countOf } = await import('../src/game/save-file.js');
const { SettingsState } = await import('../src/game/menus.js');
const { clientToLogical } = await import('../src/engine/renderer.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

Audio.sfx = () => {};
Input.init();

const NOW = new Date(2026, 9, 8, 14, 32);
const recipe = (n) => ({ v: 3, n, name: `SONG ${n}`, mode: 'simple', notes: [[0, 1]], style: 'house', mood: 'up', seed: n, bpm: 124 });

// ---- the file ----------------------------------------------------------------

const source = new Save();
source.load();
source.newSlot(0, 1);
source.slot.coins = 4321;
source.slot.campaign.cleared.plumber = true;
source.newSlot(2, 2);
source.settings.volumes.music = 0.3;
source.settings.audioSyncMs = 180;
source.settings.renderDensityByBackend = { webgl: 1.5, '2d': 'native' };
source.data.bangers = { draft: { style: 'house' }, kept: [recipe(1), recipe(2), recipe(3)], next: 4 };

const text = source.exportFile(NOW);
const parsed = JSON.parse(text);
assert(parsed.mashenstein === 'MASHENSTEIN SAVE' && parsed.format === 1,
  'the file names itself, so a stray JSON file can be refused by name');
assert(parsed.save.slots[0].coins === 4321 && parsed.save.slots[0].campaign.cleared.plumber
  && parsed.save.slots[1] === null && !!parsed.save.slots[2],
  'every shift is in it, empty ones included');
assert(parsed.save.settings.volumes.music === 0.3 && parsed.save.settings.audioSyncMs === 180,
  'the settings are in it');
assert(parsed.save.bangers.kept.length === 3 && parsed.save.bangers.kept[2].name === 'SONG 3',
  'every Lab song is in it');
assert(!('renderDensityByBackend' in parsed.save.settings) && !('renderDensityVersion' in parsed.save.settings),
  'what the render density learned about THIS device stays behind');
assert(source.settings.renderDensityByBackend.webgl === 1.5,
  'and exporting does not strip it from the live save');

const read = readSaveFile(text);
assert(read.shifts === 2 && read.labSongs === 3, 'reading a file counts what is in it before anything is replaced');
assert(read.exportedAt && read.exportedAt.getTime() === NOW.getTime(), 'and knows when it was made');
assert(exportedLabel(NOW) === '8 OCT 2026, 14:32', 'the date reads as a date');
assert(exportFileName(NOW) === 'mashenstein-2026-10-08-1432.mash', 'the file name sorts by date and ends .mash');
assert(countOf(0, 'SHIFT') === 'NO SHIFTS' && countOf(1, 'LAB SONG') === '1 LAB SONG' && countOf(3, 'SHIFT') === '3 SHIFTS',
  'counts read as English');

const refuses = (t, re, msg) => {
  let err = null;
  try { readSaveFile(t); } catch (e) { err = e; }
  assert(err && re.test(err.message), `${msg} (${err ? err.message : 'accepted'})`);
};
refuses('not json at all', /NOT A MASHENSTEIN SAVE/, 'a file that is not JSON is refused by name');
refuses(JSON.stringify({ name: 'package', version: '1.0.0' }), /NOT A MASHENSTEIN SAVE/, 'so is somebody else\'s JSON');
refuses(JSON.stringify({ ...parsed, format: 2 }), /NEWER VERSION/, 'a file from a newer game says so, rather than being half-read');
refuses(JSON.stringify({ ...parsed, save: { ...parsed.save, version: 3 } }), /NEWER VERSION/, 'as does a newer save inside it');
refuses(JSON.stringify({ ...parsed, save: { ...parsed.save, slots: [null] } }), /DAMAGED/, 'a file with the wrong shape is damaged, not empty');
const bare = readSaveFile(JSON.stringify(source.exportData()));
assert(bare.shifts === 2 && bare.exportedAt === null,
  'the bare localStorage blob is accepted too, with no export date to show');

// Importing keeps what this device measured for itself.
const target = new Save();
target.load();
target.settings.renderDensityByBackend = { webgl: 0.75, '2d': 1 };
target.importData(read.save);
assert(target.data.slots[0].coins === 4321 && target.data.bangers.kept.length === 3 && target.settings.audioSyncMs === 180,
  'an import carries the shifts, the settings and the Lab songs across');
assert(target.settings.renderDensityByBackend.webgl === 0.75 && target.settings.renderDensityByBackend['2d'] === 1,
  'but the receiving device keeps its own render density');
assert(JSON.parse(dom.store['mashenstein.v2']).slots[0].coins === 4321, 'and it is written to storage at once');
const reloaded = new Save().load();
assert(reloaded.data.bangers.kept.length === 3 && reloaded.data.slots[0].campaign.cleared.plumber,
  'so the restart after an import loads it');

// ---- the screen --------------------------------------------------------------

// The fake browser records whether it was called while an event was being
// dispatched, which is the whole point of the screen's design.
let inEvent = false;
const sent = [];
const picks = [];
const files = {
  send(t, name) { sent.push({ t, name, inEvent }); return Promise.resolve('shared'); },
  pick(onFile) { picks.push({ onFile, inEvent }); },
};
const fire = (key, ev) => { inEvent = true; try { dom.fire(key, ev); } finally { inEvent = false; } };

// A logical point back to the client coordinates a real pointer would carry.
const o = clientToLogical(0, 0);
const u = clientToLogical(100, 100);
const toClient = (x, y) => ({ clientX: (x - o.x) * 100 / (u.x - o.x), clientY: (y - o.y) * 100 / (u.y - o.y) });
const centre = (b) => toClient(b.x + b.w / 2, b.y + b.h / 2);
let pid = 10;
const frame = (state, dt = 1 / 60) => { state.update(dt); };
const tap = (state, label) => {
  const box = state.boxes.find((b) => b.label === label);
  const ev = { ...centre(box), pointerId: ++pid, pointerType: 'touch', button: 0, preventDefault() {} };
  fire('canvas:pointerdown', ev);
  frame(state);
  fire('canvas:pointerup', ev);
  frame(state);
};
const key = (state, code) => {
  fire('win:keydown', { code, repeat: false, preventDefault() {} });
  frame(state);
  fire('win:keyup', { code, preventDefault() {} });
  frame(state);
};
const flush = () => new Promise((r) => setTimeout(r, 0));

let restarted = 0;
let left = 0;
delete dom.store['mashenstein.v2']; // a fresh install, not the one imported into above
const save = new Save();
save.load();
save.newSlot(1, 1);
save.data.bangers = { kept: [recipe(1)] };
const screen = new SaveFileState({ save, onDone: () => { left++; }, onRestart: () => { restarted++; }, files, now: () => NOW });
screen.enter();
frame(screen);
assert(screen.boxes.map((b) => b.label).join() === 'EXPORT,IMPORT,BACK', 'the screen offers EXPORT, IMPORT and BACK');
assert(screen.deviceSummary() === '1 SHIFT, 1 LAB SONG', 'and says what this device holds now');

key(screen, 'Enter');
assert(sent.length === 1 && sent[0].inEvent,
  'ENTER on EXPORT hands the file over inside the key press, where the browser allows it');
assert(sent[0].name === 'mashenstein-2026-10-08-1432.mash' && readSaveFile(sent[0].t).shifts === 1,
  'and the file is this save');
await flush();
assert(screen.notice?.tone === 'ok' && /SENT/.test(screen.notice.text), 'a sent file is confirmed on screen');

tap(screen, 'EXPORT');
assert(sent.length === 2 && sent[1].inEvent, 'tapping the selected EXPORT sends it from inside the lift');
await flush();

tap(screen, 'IMPORT');
assert(picks.length === 0 && screen.boxes[screen.idx].label === 'IMPORT',
  'a first tap on IMPORT only selects it, like every other button in the game');
tap(screen, 'IMPORT');
assert(picks.length === 1 && picks[0].inEvent, 'the second tap opens the file picker, inside the lift');

// A damaged file is refused on this screen and nothing changes.
const fileOf = (t) => ({ size: t.length, text: () => Promise.resolve(t) });
await picks[0].onFile(fileOf('{"mashenstein":"MASHENSTEIN SAVE","format":1,"save":{"version":2}}'));
assert(screen.phase === 'ready' && /DAMAGED/.test(screen.notice?.text || ''), 'a damaged file is refused with a reason');
assert(save.data.slots[1] && !save.data.slots[0], 'and the save is untouched');
await picks[0].onFile({ size: 50 * 1024 * 1024, text: () => Promise.resolve('') });
assert(/TOO BIG/.test(screen.notice?.text || ''), 'a file far too big to be a save is not even read');

// A good file goes to the confirm screen first; CANCEL is where the cursor lands.
await picks[0].onFile(fileOf(text));
frame(screen);
assert(screen.phase === 'confirm' && screen.boxes[screen.idx].label === 'CANCEL',
  'a good file asks first, with the cursor on CANCEL');
assert(screen.panelLines(false).some((l) => /2 SHIFTS, 3 LAB SONGS/.test(l.text))
  && screen.panelLines(false).some((l) => /EXPORTED 8 OCT 2026/.test(l.text)),
  'and says what is in the file and when it was made');
key(screen, 'Enter');
assert(screen.phase === 'ready' && save.data.slots[1] && !save.data.slots[0] && restarted === 0,
  'CANCEL replaces nothing');

tap(screen, 'IMPORT');
await picks[picks.length - 1].onFile(fileOf(text));
frame(screen);
key(screen, 'ArrowRight');
assert(screen.boxes[screen.idx].label === 'REPLACE', 'the cursor reaches REPLACE');
key(screen, 'Enter');
assert(screen.phase === 'restarting' && save.data.slots[0]?.coins === 4321 && save.data.bangers.kept.length === 3,
  'REPLACE imports the file');
assert(restarted === 0, 'the game shows SAVE IMPORTED before it restarts');
for (let i = 0; i < 70; i++) frame(screen);
assert(restarted === 1, 'and then restarts, once, so every part of the game reads the new save');

// Every phase draws in landscape.
const ctx = document.createElement('canvas').getContext('2d');
const drawn = new SaveFileState({ save, onDone: () => {}, onRestart: () => {}, files, now: () => NOW });
drawn.enter();
drawn.draw(ctx);
drawn.pending = read; drawn.phase = 'confirm'; drawn.layout(); drawn.draw(ctx);
drawn.phase = 'restarting'; drawn.layout(); drawn.draw(ctx);
assert(true, 'every phase renders');
drawn.exit();

// BACK leaves; leaving lets go of the browser events.
const back = new SaveFileState({ save, onDone: () => { left++; }, onRestart: () => {}, files, now: () => NOW });
back.enter();
frame(back);
key(back, 'Escape');
assert(left === 1, 'ESC leaves the screen');
back.exit();
screen.exit();
const before = sent.length;
fire('win:keydown', { code: 'Enter', repeat: false, preventDefault() {} });
assert(sent.length === before, 'a screen that has been left no longer acts on key presses');

// ---- the settings row --------------------------------------------------------

const settings = new SettingsState({ save: { settings: defaultSettings(), persist() {} }, onDone: () => {}, onSaveFile: () => {} });
settings.enter();
const labels = settings.options().map((o) => o.label);
assert(labels.indexOf('IMPORT / EXPORT') === labels.indexOf('RESET TO DEFAULTS') - 1,
  'SETTINGS has an IMPORT / EXPORT row, just above RESET TO DEFAULTS');
assert(settings.visibleRows === settings.listCount(), 'and every landscape setting still fits on the page');

if (failed) process.exit(1);
