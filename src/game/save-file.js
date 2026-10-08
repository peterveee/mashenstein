// SETTINGS > IMPORT / EXPORT: the whole save as one .bak file. 8 Oct 2026.
//
// EXPORT writes all three shifts, the settings and every Lab song into a file;
// IMPORT reads one back on a new install or another device, after a screen that
// says what is in the file and what it is about to replace, and then a second
// that asks ARE YOU REALLY SURE with the cursor on NO (Peter, 8 Oct 2026): an
// import throws away everything on the device, so it takes two deliberate
// answers, and the safe one is where the cursor starts both times.
//
// The file format and its checks live with the save (save.js packSaveFile /
// readSaveFile); this is only the screen and the trip through the browser.
//
// WHY EXPORT AND IMPORT ACT INSIDE THE BROWSER EVENT. The game reads its input
// once a frame, after the tap that caused it has finished. A browser opens a
// file picker or a share sheet only DURING a tap or a key press, and iOS is
// strict about it: a picker asked for one frame later simply never appears. So
// those two buttons listen to the DOM themselves (attach) and act from inside
// the pointerup or keydown, while the frame loop moves the cursor exactly as it
// does on every other screen. A pad has no such event; its press is acted on
// from the frame loop, which a desktop browser allows for a download.
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { clientToLogical } from '../engine/renderer.js';
import { readSaveFile, SAVE_FILE_EXT, SAVE_FILE_MAX_BYTES } from '../engine/save.js';
import { portraitMenuActive } from '../engine/portrait-menu.js';
import { PanelScreen, PANEL } from './panel-screen.js';

const TITLE = 'IMPORT / EXPORT';
// The two buttons that must act inside the browser event (see the top).
const IN_EVENT = new Set(['EXPORT', 'IMPORT']);
// Long enough to read SAVE IMPORTED, short enough not to feel like a hang.
const RESTART_SEC = 1.0;

// ---- the copy, written once --------------------------------------------------
const READY_HEADLINE = 'TAKE YOUR GAME WITH YOU';
// "Backup file" is the name; the extension is said once, where the file is made.
const READY_STEPS = [
  `EXPORT PUTS YOUR PROGRESS, SETTINGS AND EVERY LAB SONG IN ONE BACKUP FILE (WITH A ${SAVE_FILE_EXT.toUpperCase()} EXTENSION).`,
  'IMPORT LOADS A BACKUP FILE INTO A NEW INSTALL OR ANOTHER DEVICE.',
];
const READY_WHY = 'DELETING THE GAME DELETES ITS SAVE. KEEP A BACKUP FILE SOMEWHERE SAFE.';
// A phone exports through the share sheet, which offers a dozen places to send a
// file and does not say which one keeps it.
const PHONE_HOW = 'ON A PHONE, CHOOSE SAVE TO FILES WHEN THE SHARE SHEET OPENS.';
const CONFIRM_WARNING = 'IT REPLACES THE PROGRESS, SETTINGS AND EVERY LAB SONG ON THIS DEVICE.'
  + ' THIS CANNOT BE UNDONE.';
const CONFIRM_HOW = 'THE GAME RESTARTS TO LOAD IT.';
const SURE_WARNING = 'THE PROGRESS, SETTINGS AND LAB SONGS ON THIS DEVICE WILL BE GONE FOR GOOD.';
const SURE_HOW = 'IF YOU MIGHT WANT THEM BACK, CHOOSE NO AND EXPORT THEM FIRST.';

const NOTICE_COLOR = { ok: '#48c848', bad: '#d84828', info: '#8a8a98' };
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "NO SHIFTS", "1 SHIFT", "3 SHIFTS". */
export function countOf(n, noun) {
  if (!n) return `NO ${noun}S`;
  return `${n} ${noun}${n === 1 ? '' : 'S'}`;
}

const pad2 = (n) => String(n).padStart(2, '0');

/** "8 OCT 2026, 14:32", in the player's own time zone. */
export function exportedLabel(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** mashenstein-2026-10-08-1432.bak — sorts by date, and two exports a day apart never collide. */
export function exportFileName(d) {
  return `mashenstein-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    + `-${pad2(d.getHours())}${pad2(d.getMinutes())}${SAVE_FILE_EXT}`;
}

/**
 * The browser's half: handing a file to the player and asking them for one.
 * Both must be called from inside a tap or key press (see the top). Kept as one
 * object so a test can swap it for a fake.
 */
export const browserFiles = {
  /**
   * Resolves 'shared' or 'downloaded'; rejects with an AbortError when the
   * player closes the share sheet. A phone gets the share sheet — an installed
   * iPhone app has no downloads folder, and a download link there opens a dead
   * end with no way back to the game. Everything else gets a plain download.
   *
   * navigator.share is reached before the first await, so it is still inside
   * the gesture that called this.
   */
  send(bytes, name) {
    const type = 'application/octet-stream';
    const file = typeof File === 'function' ? new File([bytes], name, { type }) : null;
    if (Input.isTouchDevice() && file && navigator.canShare?.({ files: [file] })) {
      return navigator.share({ files: [file], title: name }).then(() => 'shared');
    }
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return Promise.resolve('downloaded');
  },
  /**
   * Open the file picker; `onFile` gets the File the player chose. There is no
   * `accept` filter on purpose: iOS does not know a .bak file's type and greys
   * out every file it cannot match, which would make the save unpickable. The
   * contents are checked instead (readSaveFile).
   */
  pick(onFile) {
    let input = document.getElementById('mash-save-file');
    if (!input) {
      input = document.createElement('input');
      input.id = 'mash-save-file';
      input.type = 'file';
      input.style.display = 'none';
      // In the document, not detached: older iOS ignores click() on an input
      // that is not in the page.
      document.body.appendChild(input);
    }
    input.onchange = () => {
      const file = input.files?.[0];
      input.value = ''; // so choosing the same file twice still fires change
      if (file) onFile(file);
    };
    input.click();
  },
};

export class SaveFileState extends PanelScreen {
  static portraitMode = 'frame';

  /**
   * `onRestart` reloads the game after an import (main.js), so every module
   * reads the new save from the top rather than this screen trying to reach
   * each one's cache. `files` is browserFiles unless a test passes its own.
   */
  constructor({ save, onDone, onRestart, files = browserFiles, now = () => new Date() }) {
    super();
    this.save = save;
    this.onDone = onDone;
    this.onRestart = onRestart;
    this.files = files;
    this.now = now;
  }

  enter() {
    this.phase = 'ready';
    this.idx = 0;
    this.notice = null;
    this.pending = null;   // the file read for IMPORT, awaiting REPLACE
    this.busy = false;     // a share sheet or a file read is in flight
    this.armed = null;     // the button a finger came down on, acted on at its lift
    this.keyed = false;    // this frame's confirm was already acted on by the keydown
    this.restartIn = 0;
    this.layout();
    Input.setMenuButtons();
    this.attach();
  }

  exit() {
    this.detach();
  }

  buttonRows() {
    if (this.phase === 'ready') return ['EXPORT', 'IMPORT', 'BACK'];
    if (this.phase === 'confirm') return ['CANCEL', 'REPLACE'];
    if (this.phase === 'sure') return ['NO', 'YES'];
    return [];
  }

  // ---- the browser events -----------------------------------------------------

  attach() {
    const surface = document.getElementById('chrome') || document.getElementById('game');
    // Each handler also checks `live`, so a screen that has been left can never
    // act on an event, whatever became of the removal.
    this.live = true;
    const down = (e) => { if (this.live) this.pointerDown(e); };
    const up = (e) => { if (this.live) this.pointerUp(e); };
    const cancel = () => { this.armed = null; };
    const key = (e) => { if (this.live) this.keyDown(e); };
    this.listeners = [
      [surface, 'pointerdown', down], [surface, 'pointerup', up],
      [surface, 'pointercancel', cancel], [window, 'keydown', key],
    ];
    for (const [target, type, fn] of this.listeners) target?.addEventListener(type, fn);
  }

  detach() {
    this.live = false;
    for (const [target, type, fn] of this.listeners || []) target?.removeEventListener?.(type, fn);
    this.listeners = [];
    this.armed = null;
  }

  /** The label a finger is on, if it is the selected EXPORT or IMPORT: tapping the selected button commits it. */
  pointerDown(e) {
    this.armed = null;
    if (Input.suspended || this.phase !== 'ready') return;
    const p = clientToLogical(e.clientX, e.clientY);
    const hit = this.hitButton(p.x, p.y);
    const label = this.boxes?.[hit]?.label;
    if (hit >= 0 && hit === this.idx && IN_EVENT.has(label)) this.armed = label;
  }

  /** The lift is what a browser counts as a tap, so this is where the button acts. */
  pointerUp(e) {
    const armed = this.armed;
    this.armed = null;
    if (!armed || Input.suspended || this.phase !== 'ready') return;
    const p = clientToLogical(e.clientX, e.clientY);
    if (this.boxes?.[this.hitButton(p.x, p.y)]?.label === armed) this.act(armed);
  }

  keyDown(e) {
    if (Input.suspended || e.repeat || this.phase !== 'ready') return;
    const action = Input.actionForKey(e.code);
    if (action !== 'confirm' && action !== 'jump') return;
    const label = this.boxes?.[this.idx]?.label;
    if (!IN_EVENT.has(label)) return;
    this.keyed = true;
    this.act(label);
  }

  // ---- the frame loop ---------------------------------------------------------

  update(dt) {
    this.layout();
    if (this.phase === 'restarting') {
      this.restartIn -= dt;
      if (this.restartIn <= 0 && !this.restarted) { this.restarted = true; this.onRestart?.(); }
      Input.endFrame();
      return;
    }
    if (Input.pressed('back')) {
      if (this.phase === 'confirm' || this.phase === 'sure') this.cancelImport();
      else { Audio.sfx('ui'); this.onDone(); }
      this.keyed = false;
      Input.endFrame();
      return;
    }
    this.updateButtons();
    this.keyed = false;
    Input.endFrame();
  }

  /**
   * `how` is 'pointer' or 'press' (PanelScreen.updateButtons). EXPORT and IMPORT
   * by finger or key were already acted on inside the event, so here they only
   * fall through for a pad, which has no event to act inside.
   */
  choose(row, how) {
    if (IN_EVENT.has(row)) {
      if (how === 'pointer' || this.keyed) return;
      this.act(row);
      return;
    }
    if (row === 'REPLACE') { this.askSure(); return; }
    if (row === 'YES') { this.replace(); return; }
    if (row === 'CANCEL' || row === 'NO') { this.cancelImport(); return; }
    Audio.sfx('ui');
    this.onDone();
  }

  act(row) {
    if (this.busy) return;
    if (row === 'EXPORT') this.exportSave();
    else if (row === 'IMPORT') this.pickFile();
  }

  // ---- EXPORT -----------------------------------------------------------------

  exportSave() {
    const now = this.now();
    const name = exportFileName(now);
    let sent;
    try {
      sent = this.files.send(this.save.exportFile(now), name);
    } catch (e) {
      this.say('bad', 'THIS DEVICE WOULD NOT EXPORT THE FILE.');
      Audio.sfx('uiBad');
      return;
    }
    this.busy = true;
    Promise.resolve(sent).then((how) => {
      this.busy = false;
      this.say('ok', how === 'shared'
        ? 'SAVE FILE SENT. KEEP IT SOMEWHERE SAFE.'
        : `DOWNLOADED ${name.toUpperCase()}`);
      Audio.sfx('uiConfirm');
    }, (e) => {
      this.busy = false;
      // Closing the share sheet is a choice, not a failure.
      if (e?.name === 'AbortError') this.say('info', 'EXPORT CANCELLED.');
      else { this.say('bad', 'THIS DEVICE WOULD NOT EXPORT THE FILE.'); Audio.sfx('uiBad'); }
    });
  }

  // ---- IMPORT -----------------------------------------------------------------

  pickFile() {
    this.notice = null;
    try {
      this.files.pick((file) => this.receive(file));
    } catch (e) {
      this.say('bad', 'THIS DEVICE WOULD NOT OPEN A FILE.');
      Audio.sfx('uiBad');
    }
  }

  /** The chosen file, read and checked. Nothing is replaced until REPLACE. */
  receive(file) {
    if (this.phase !== 'ready') return;
    if (file.size > SAVE_FILE_MAX_BYTES) {
      this.say('bad', 'THAT FILE IS FAR TOO BIG TO BE A SAVE.');
      Audio.sfx('uiBad');
      return;
    }
    this.busy = true;
    return file.arrayBuffer().then((bytes) => {
      this.busy = false;
      if (this.phase !== 'ready') return;
      try {
        this.pending = readSaveFile(bytes);
      } catch (e) {
        this.say('bad', e.message);
        Audio.sfx('uiBad');
        return;
      }
      this.notice = null;
      this.phase = 'confirm';
      this.idx = 0; // CANCEL: replacing everything is never one stray press away
      this.layout();
      Audio.sfx('uiBad');
    }, () => {
      this.busy = false;
      this.say('bad', 'THAT FILE COULD NOT BE READ.');
      Audio.sfx('uiBad');
    });
  }

  /** The second question. The cursor starts on NO, so a press made in a hurry keeps the device as it is. */
  askSure() {
    this.phase = 'sure';
    this.idx = 0;
    this.layout();
    Audio.sfx('uiBad');
  }

  cancelImport() {
    this.pending = null;
    this.phase = 'ready';
    this.idx = 1; // back on IMPORT, where the player left
    this.say('info', 'NOTHING WAS IMPORTED.');
    this.layout();
    Audio.sfx('ui');
  }

  replace() {
    try {
      this.save.importData(this.pending.save);
    } catch (e) {
      this.pending = null;
      this.phase = 'ready';
      this.idx = 1;
      this.say('bad', /DEVICE/.test(e.message) ? e.message : 'THAT SAVE FILE IS DAMAGED AND CANNOT BE READ.');
      this.layout();
      Audio.sfx('uiBad');
      return;
    }
    this.pending = null;
    this.phase = 'restarting';
    this.restartIn = RESTART_SEC;
    this.restarted = false;
    this.layout();
    Audio.sfx('uiConfirm');
  }

  say(tone, text) { this.notice = { tone, text }; }

  // ---- drawing ----------------------------------------------------------------

  /** What is on this device right now: what EXPORT would write, and what IMPORT would replace. */
  deviceSummary() {
    const data = this.save.data || {};
    const shifts = (data.slots || []).filter(Boolean).length;
    const songs = Array.isArray(data.bangers?.kept) ? data.bangers.kept.length : 0;
    return `${countOf(shifts, 'SHIFT')}, ${countOf(songs, 'LAB SONG')}`;
  }

  panelLines(portrait) {
    const S = portrait ? PANEL.portrait : PANEL.landscape;
    const out = [];
    const push = (text, color, size, lead = 0, style = 'ui') => out.push({ text, color, size, style, lead });
    const para = (text, color, size, lead) => out.push(...this.paragraph(text, color, size, lead, portrait));

    if (this.phase === 'ready') {
      push(READY_HEADLINE, '#f6d33c', S.head);
      for (const step of READY_STEPS) para(step, '#c8c8d8', S.step, S.gap);
      para(READY_WHY, '#8a8a98', S.why, S.gap);
      if (Input.isTouchDevice()) para(PHONE_HOW, '#8a8a98', S.why, 0);
    } else if (this.phase === 'confirm') {
      const f = this.pending;
      push('IMPORT THIS SAVE?', '#f6d33c', S.head);
      push(f.exportedAt ? `EXPORTED ${exportedLabel(f.exportedAt)}` : 'EXPORT DATE UNKNOWN', '#c8c8d8', S.step, S.gap);
      push(`${countOf(f.shifts, 'SHIFT')}, ${countOf(f.labSongs, 'LAB SONG')}`, '#48e0c8', S.step);
      para(CONFIRM_WARNING, '#d84828', S.why, S.gap);
      para(CONFIRM_HOW, '#8a8a98', S.why, S.gap);
    } else if (this.phase === 'sure') {
      push('ARE YOU REALLY SURE?', '#d84828', S.head);
      para(SURE_WARNING, '#c8c8d8', S.step, S.gap);
      para(SURE_HOW, '#8a8a98', S.why, S.gap);
    } else {
      push('SAVE IMPORTED', '#48c848', S.head);
      push('RESTARTING...', '#8a8a98', S.step, S.gap);
    }
    return out;
  }

  /**
   * THE READOUT above the buttons: what this device holds now. On the confirm
   * screen it is the other half of the comparison — the file's contents above,
   * what they replace here.
   */
  statusLines(portrait) {
    const S = portrait ? PANEL.portrait : PANEL.landscape;
    if (this.phase === 'restarting') return [];
    const out = [
      { text: 'ON THIS DEVICE NOW', color: '#5a5a68', size: S.status, style: 'ui', lead: 0 },
      { text: this.deviceSummary(), color: '#48e0c8', size: S.status, style: 'ui', lead: 0 },
    ];
    if (this.notice) {
      out.push(...this.paragraph(this.notice.text, NOTICE_COLOR[this.notice.tone], S.notice, S.gap, portrait));
    }
    return out;
  }

  draw(ctx) {
    const portrait = portraitMenuActive();
    const titleMid = this.drawFrame(ctx, TITLE);
    this.drawPanel(ctx, portrait, titleMid);
  }
}
