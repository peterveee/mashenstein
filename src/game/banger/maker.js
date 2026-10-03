// MAKE A BANGER, in the game — the screen. 3 Oct 2026.
//
// Reached from THE LAB's NEW BANGER button, and titled NEW BANGER (Peter, 3 Oct 2026). A two-bar piano roll (riff.js), a STYLE
// and a MOOD, and BRING TO LIFE: the desk's generator writes a whole song from those (make.js), it is kept
// (store.js), and the jukebox opens again with it playing.
//
// SIMPLE and ADVANCED (riff.js) are two grids over one riff: ADVANCED is remembered
// while SIMPLE shows it converted down, and comes back as it was unless SIMPLE has been
// written in since. ZAP (Peter, 3 Oct 2026; it was SURPRISE ME) writes a random riff in
// whichever is showing.
//
// The grid loops while you edit, over a plain kick, hat and light clap at the riff's 120 BPM, so
// what you hear is what goes in. It runs its own clock through Audio.voiceSfx rather
// than loading a song: an edit is heard on the next pass of the loop, and nothing
// restarts under your finger.
//
// The jukebox owns where this screen goes next, so it hands in `onDone` (BACK) and
// `onMade(recipe, song)` (BRING TO LIFE); nothing here imports the jukebox.
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawMenuRow, MENU_ROW_HILITE, BACK_BUTTON_PLATE, textYForMid, textWidth } from '../../engine/sprites.js';
import {
  portraitMenuActive, portraitMenuSafeTop, portraitMenuSafeBottom, portraitMenuScale,
  portraitMenuText, portraitMenuTextCentered, portraitMenuFit,
} from '../../engine/portrait-menu.js';
import {
  RIFF_MODES, RIFF_BPM, modeOf, semitoneOf, rowName, isSharp, rowHz, semitoneHz, toggleNote, hasNotes,
  normaliseNotes, simplify, expand, sixteenths, luckyNotes,
} from './riff.js';
import { MAKER_STYLES, MAKER_MOODS, makeBanger, newSeed } from './make.js';
import { bangerState, saveDraft, keepBanger, reviseBanger } from './store.js';

const SIXTEENTH_S = 60 / RIFF_BPM / 4;
const LOOKAHEAD_S = 0.12;
// The grid's own preview sound, a different one each visit, drawn from GENTLE presets:
// soft attacks and little top end — felt and soft pianos, electric pianos, marimbas, a
// kalimba, a harp, a sine, a triangle, a breathy flute. No squares, bells, music boxes,
// FM or bright plucks, which were harsh to edit over, and nothing on MRDR-3, which a
// phone pays for (Peter, 3 Oct 2026). Only this screen hears it: the song plays the
// style's hook sound (make.js hookSoundFor).
export const RIFF_VOICES = Object.freeze([
  'simpleTriangle', 'toneSine', 'softKeys', 'tngrSoftPiano', 'wndrFeltPiano', 'tngrFeltUpright', 'epiano',
  'rmndTineEP', 'tngrHollowKeys', 'marimba', 'tpMarimba', 'tpKalimba', 'harpPluck', 'tngrAirFlute',
]);
// The riff over the loop: about 6 dB down from full — at 1 it was far too loud over the
// kick and hat (Peter, 3 Oct 2026).
const RIFF_GAIN = 0.5;
// BRING TO LIFE was GENER8 (Peter, 3 Oct 2026: the IT'S ALIVE! angle — birth.js).
const BUTTONS = ['BACK', 'CLEAR', 'ZAP', 'BRING TO LIFE'];
const GENER8 = 3;
// Shares of the button row: BRING TO LIFE the widest, it is the one that matters.
const BUTTON_SHARES = [1.1, 0.9, 0.9, 1.9];
const MODE_IDS = ['simple', 'advanced'];

const C_BG = '#0b0b14';
const C_TEXT = '#c8c8d8';
const C_SEL = '#c9a0ff';
const C_NOTE = '#48e0c8';

// Each of the twelve notes has its own colour, round the wheel from A (the game's teal),
// so a tune reads as a shape of colours and an octave lands on the colour it left — the
// same colour for a note in either mode. The black-key rows sit darker, as on a keyboard.
const hueOf = (semi) => (172 + (semi % 12) * 30) % 360;
const noteColour = (mode, row) => `hsl(${hueOf(semitoneOf(mode, row))}, 78%, ${isSharp(mode, row) ? 58 : 64}%)`;
const cellColour = (mode, row, alpha) => `hsla(${hueOf(semitoneOf(mode, row))}, 55%, ${isSharp(mode, row) ? 30 : 55}%, ${alpha})`;
/** Rounded plates: near-pill on the short controls. */
const plateRadius = (h, portrait) => Math.min(h / 2, portrait ? 26 : 11);

export class BangerMakerState {
  static portraitMode = 'frame';

  // `random` picks the grid's preview sound for the visit; tests pass their own.
  // `from` is a kept song to edit (the club's pencil): the grid opens on its riff, style
  // and mood, and BRING TO LIFE remakes that song rather than adding one. The NEW BANGER
  // draft is left as it was.
  constructor({ onDone, onMade, from = null, random = Math.random }) {
    this.onDone = onDone;
    this.onMade = onMade;
    this.from = from;
    this.random = random;
  }

  enter() {
    const d = bangerState().draft;
    this.mode = d.mode;
    this.simple = normaliseNotes(d.simple, 'simple');
    this.advanced = normaliseNotes(d.advanced, 'advanced');
    this.simpleEdited = !!d.simpleEdited;
    // The style and mood it was left on (store.js has already checked they still exist).
    // What changes every visit is only the grid's preview sound — never last visit's
    // (Peter, 3 Oct 2026).
    this.style = d.style;
    this.mood = d.mood;
    if (this.from) {
      this.mode = this.from.mode;
      if (this.mode === 'simple') { this.simple = normaliseNotes(this.from.notes, 'simple'); this.simpleEdited = true; }
      else this.advanced = normaliseNotes(this.from.notes, 'advanced');
      this.style = this.from.style;
      this.mood = this.from.mood;
    }
    const voices = RIFF_VOICES.filter((id) => id !== BangerMakerState.lastVoice);
    this.riffVoice = voices[Math.floor(this.random() * voices.length)];
    BangerMakerState.lastVoice = this.riffVoice;
    const first = this.notes.findIndex((n) => n >= 0);
    this.focus = { area: 'grid', col: Math.max(0, first), row: first >= 0 ? this.rows - 1 - this.notes[first] : this.rows - 1, picker: 0, button: GENER8 };
    this.message = null;
    this.messageT = 0;
    this.chooser = null;       // the STYLE / MOOD chooser while it is open
    this.making = 0;
    this.loopT0 = null;
    this.scheduled = -1;
    this.playStep = -1;
    Audio.setBank(null);
    Input.setMenuButtons();
  }

  exit() { if (!this.from) saveDraft(this.draft()); }

  draft() {
    return { mode: this.mode, simple: this.simple, advanced: this.advanced, simpleEdited: this.simpleEdited, style: this.style, mood: this.mood };
  }

  /** The grid on show. */
  get notes() { return this.mode === 'simple' ? this.simple : this.advanced; }
  set notes(v) {
    if (this.mode === 'simple') { this.simple = normaliseNotes(v, 'simple'); this.simpleEdited = true; }
    else this.advanced = normaliseNotes(v, 'advanced');
  }
  get rows() { return modeOf(this.mode).semis.length; }
  get steps() { return modeOf(this.mode).steps; }

  setMode(id) {
    if (id === this.mode || !RIFF_MODES[id]) return;
    if (id === 'simple') { this.simple = simplify(this.advanced); this.simpleEdited = false; }
    else if (this.simpleEdited) this.advanced = expand(this.simple);
    const f = this.focus;
    const was = this.steps;
    this.mode = id;
    f.col = Math.min(this.steps - 1, Math.floor(f.col * this.steps / was));
    f.row = Math.min(this.rows - 1, f.row);
    Audio.sfx('ui');
  }

  // ------------------------------------------------------------------ layout
  layout() {
    const portrait = portraitMenuActive();
    const top = portrait ? portraitMenuSafeTop(28) : 6;
    const bottom = portrait ? portraitMenuSafeBottom(24) : H - 6;
    const titleH = portrait ? 70 : 24;
    const ctrlH = portrait ? 66 : 26;
    const gap = portrait ? 14 : 6;
    const x0 = 12;
    const width = W - 24;
    // The SIMPLE / ADVANCED switch, at the right of the title.
    const modeW = portrait ? 236 : 150;
    const modeH = portrait ? 46 : 18;
    const modeBox = { x: x0 + width - modeW, y: top + (titleH - modeH) / 2 - (portrait ? 6 : 2), w: modeW, h: modeH };
    // The note names stand in a column of their own, left of the grid.
    const labelW = portrait ? 44 : 24;
    // Portrait stacks the two pickers, so each can carry its longest label at the
    // portrait type size; landscape puts them side by side under the grid.
    const ctrlRows = portrait ? 3 : 2;
    const ctrlTop = bottom - ctrlRows * ctrlH - (ctrlRows - 1) * gap;
    const gridTop = top + titleH;
    const cellW = (width - labelW) / this.steps;
    // Portrait gives the grid everything between the title and the pickers: tall
    // squares are what a thumb wants.
    const cellH = (ctrlTop - gap - gridTop) / this.rows;
    const grid = { x: x0 + labelW, y: gridTop, w: width - labelW, h: cellH * this.rows, cellW, cellH, labelX: x0 };
    const half = (width - gap) / 2;
    const pickers = portrait
      ? [{ x: x0, y: ctrlTop, w: width, h: ctrlH }, { x: x0, y: ctrlTop + ctrlH + gap, w: width, h: ctrlH }]
      : [{ x: x0, y: ctrlTop, w: half, h: ctrlH }, { x: x0 + half + gap, y: ctrlTop, w: half, h: ctrlH }];
    const by = ctrlTop + (ctrlRows - 1) * (ctrlH + gap);
    const unit = (width - (BUTTONS.length - 1) * gap) / BUTTON_SHARES.reduce((a, b) => a + b, 0);
    const buttons = [];
    let bx = x0;
    for (const share of BUTTON_SHARES) { buttons.push({ x: bx, y: by, w: unit * share, h: ctrlH }); bx += unit * share + gap; }
    return { portrait, top, titleH, modeBox, grid, pickers, buttons };
  }

  // ------------------------------------------------------------------ the loop
  // Always counted in sixteenths, whichever grid is showing: the kick on the beat, the
  // hat on the off-beat eighths, the riff from the grid as sixteenths.
  tickLoop() {
    const ctx = Audio.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.loopT0 == null) { this.loopT0 = now + 0.1; this.scheduled = -1; }
    const { semis, len } = sixteenths(this.notes, this.mode);
    for (;;) {
      const next = this.scheduled + 1;
      const t = this.loopT0 + next * SIXTEENTH_S;
      if (t > now + LOOKAHEAD_S) break;
      // Fell well behind (a hidden tab, a long frame): pick the loop up from here
      // rather than firing a backlog of notes at once.
      if (t < now - 0.25) { this.loopT0 = now + 0.05 - next * SIXTEENTH_S; continue; }
      this.scheduled = next;
      const at = Math.max(0.005, t - now);
      const s16 = next % 32;
      // The kick on every beat, a light clap on two and four, the hat off the beat.
      if (s16 % 4 === 0) Audio.voiceSfx('kickMegamix', { gain: 0.45, at });
      else if (s16 % 4 === 2) Audio.voiceSfx('hatEngine', { gain: 0.3, at });
      if (s16 % 8 === 4) Audio.voiceSfx('ds808Clap', { gain: 0.2, at });
      if (semis[s16] >= 0) Audio.voiceSfx(this.riffVoice, { freq: semitoneHz(semis[s16]), seconds: len * SIXTEENTH_S * 0.9, gain: RIFF_GAIN, at });
    }
    const pos = Math.floor((now - this.loopT0) / SIXTEENTH_S);
    this.playStep = pos >= 0 ? Math.floor((pos % 32) * this.steps / 32) : -1;
  }

  // ------------------------------------------------------------------ actions
  toggle(col, visualRow) {
    const row = this.rows - 1 - visualRow;
    const wasOn = this.notes[col] === row;
    this.notes = toggleNote(this.notes, col, row, this.mode);
    if (!wasOn) Audio.voiceSfx(this.riffVoice, { freq: rowHz(this.mode, row), seconds: 0.2, gain: RIFF_GAIN });
    else Audio.sfx('ui');
  }

  cycle(picker, dir) {
    if (picker === 0) {
      const i = MAKER_STYLES.findIndex((s) => s.id === this.style);
      this.style = MAKER_STYLES[(i + dir + MAKER_STYLES.length) % MAKER_STYLES.length].id;
    } else {
      const i = MAKER_MOODS.findIndex((m) => m.id === this.mood);
      this.mood = MAKER_MOODS[(i + dir + MAKER_MOODS.length) % MAKER_MOODS.length].id;
    }
    Audio.sfx('ui');
  }

  say(text) { this.message = text; this.messageT = 2; }

  // ------------------------------------------------------------------ the chooser
  // A tap on the middle of STYLE or MOOD (or confirm on it) opens every choice at once, a
  // grid to tap, rather than stepping through twenty-odd moods one at a time (Peter, 3 Oct
  // 2026). The arrows at the ends still step. A tap outside, or back, closes it.
  openChooser(picker) {
    const items = picker === 0 ? MAKER_STYLES : MAKER_MOODS;
    const cur = picker === 0 ? this.style : this.mood;
    this.chooser = { picker, items, sel: Math.max(0, items.findIndex((it) => it.id === cur)) };
    Audio.sfx('ui');
  }

  choose(i) {
    const c = this.chooser;
    const it = c.items[i];
    if (it) { if (c.picker === 0) this.style = it.id; else this.mood = it.id; }
    this.chooser = null;
    Audio.sfx('uiConfirm');
  }

  chooserLayout(L) {
    const c = this.chooser;
    const n = c.items.length;
    const cols = L.portrait ? 2 : (n > 10 ? 4 : 2);
    const rows = Math.ceil(n / cols);
    const pad = L.portrait ? 14 : 6, gap = L.portrait ? 8 : 4, titleH = L.portrait ? 50 : 18;
    const panel = { x: 8, y: L.top, w: W - 16, h: (L.buttons[0].y + L.buttons[0].h) - L.top };
    const cw = (panel.w - pad * 2 - gap * (cols - 1)) / cols;
    const ch = Math.min(L.portrait ? 64 : 22, (panel.h - pad * 2 - titleH - gap * (rows - 1)) / rows);
    const cells = c.items.map((_, i) => ({
      x: panel.x + pad + (i % cols) * (cw + gap), y: panel.y + pad + titleH + Math.floor(i / cols) * (ch + gap), w: cw, h: ch,
    }));
    panel.h = Math.min(panel.h, pad * 2 + titleH + rows * ch + (rows - 1) * gap);
    return { panel, cells, cols, titleH, pad };
  }

  updateChooser(L) {
    const c = this.chooser;
    const { panel, cells, cols } = this.chooserLayout(L);
    const n = c.items.length;
    if (Input.pressed('right')) c.sel = (c.sel + 1) % n;
    if (Input.pressed('left')) c.sel = (c.sel + n - 1) % n;
    if (Input.pressed('down')) c.sel = Math.min(n - 1, c.sel + cols);
    if (Input.pressed('up')) c.sel = Math.max(0, c.sel - cols);
    if (Input.pressed('confirm')) { this.choose(c.sel); return; }
    if (Input.pressed('back')) { this.chooser = null; Audio.sfx('ui'); return; }
    if (Input.pressed('pointer')) {
      const { x, y } = Input.pointer;
      const inside = (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
      const i = cells.findIndex(inside);
      if (i >= 0) this.choose(i);
      else if (!inside(panel)) { this.chooser = null; Audio.sfx('ui'); }
    }
  }

  drawChooser(ctx, L) {
    const c = this.chooser;
    const { panel, cells, titleH, pad } = this.chooserLayout(L);
    const showFocus = !Input.usingTouch;
    ctx.fillStyle = 'rgba(5,5,10,0.7)';
    ctx.fillRect(0, 0, W, H);
    drawMenuRow(ctx, panel.x, panel.y, panel.w, panel.h, plateRadius(28, L.portrait), 'rgba(16,14,28,0.98)');
    const title = c.picker === 0 ? 'CHOOSE A STYLE' : 'CHOOSE A MOOD';
    portraitMenuTextCentered(ctx, title, W / 2, textYForMid(panel.y + pad + titleH / 2, portraitMenuScale(1.3)), '#fff', 1.3);
    const cur = c.picker === 0 ? this.style : this.mood;
    c.items.forEach((it, i) => {
      const r = cells[i];
      const on = it.id === cur, sel = showFocus && c.sel === i;
      drawMenuRow(ctx, r.x, r.y, r.w, r.h, plateRadius(r.h, L.portrait), sel ? MENU_ROW_HILITE : on ? 'rgba(72,224,200,0.2)' : BACK_BUTTON_PLATE);
      const s = portraitMenuFit(it.label, 1.1, r.w - 10);
      portraitMenuTextCentered(ctx, it.label, r.x + r.w / 2, textYForMid(r.y + r.h / 2, portraitMenuScale(s)), sel ? C_SEL : on ? C_NOTE : C_TEXT, s);
    });
  }

  press(button) {
    const name = BUTTONS[button];
    if (name === 'CLEAR') {
      this.notes = null;
      Audio.sfx('ui');
    } else if (name === 'ZAP') {
      this.notes = luckyNotes(this.mode);
      Audio.sfx('uiConfirm');
    } else if (name === 'BACK') {
      Audio.sfx('ui');
      this.onDone();
    } else if (!hasNotes(this.notes)) {
      Audio.sfx('uiBad');
      this.say('PUT SOME NOTES IN FIRST');
    } else {
      // Generate on the frame AFTER this one, so CHARGING... is on screen while it runs.
      Audio.sfx('uiConfirm');
      this.making = 2;
    }
  }

  make() {
    const recipe = { notes: this.notes, mode: this.mode, style: this.style, mood: this.mood, seed: newSeed() };
    let song;
    try {
      song = makeBanger(recipe);
    } catch (e) {
      console.warn('[banger] could not make it:', e);
      Audio.sfx('uiBad');
      this.say('THAT ONE WOULD NOT MAKE - TRY AGAIN');
      return;
    }
    if (!this.from) saveDraft(this.draft());
    // An edit remakes that song in place — except the starter, which is never overwritten:
    // editing it keeps a new song (Peter, 3 Oct 2026).
    const rec = this.from && !this.from.preset ? reviseBanger(this.from, { ...recipe, bpm: song.bpm })
      : keepBanger({ ...recipe, bpm: song.bpm, fresh: !!this.from });
    this.onMade(rec, song);
  }

  // ------------------------------------------------------------------ input
  moveFocus() {
    const f = this.focus;
    const dx = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
    const dy = (Input.pressed('down') ? 1 : 0) - (Input.pressed('up') ? 1 : 0);
    if (!dx && !dy) return false;
    if (f.area === 'mode') {
      if (dx) { this.setMode(dx < 0 ? 'simple' : 'advanced'); return true; }
      if (dy > 0) { f.area = 'grid'; f.row = 0; }
    } else if (f.area === 'grid') {
      if (dx) f.col = (f.col + dx + this.steps) % this.steps;
      if (dy < 0 && f.row === 0) f.area = 'mode';
      else if (dy > 0 && f.row === this.rows - 1) { f.area = 'picker'; f.picker = f.col < this.steps / 2 ? 0 : 1; }
      else if (dy) f.row = Math.max(0, Math.min(this.rows - 1, f.row + dy));
    } else if (f.area === 'picker') {
      const stacked = portraitMenuActive();
      if (dx) { this.cycle(f.picker, dx); return true; }
      if (dy < 0) {
        if (stacked && f.picker === 1) f.picker = 0;
        else { f.area = 'grid'; f.row = this.rows - 1; f.col = Math.floor(this.steps * (f.picker === 0 ? 0.25 : 0.75)); }
      } else if (stacked && f.picker === 0) f.picker = 1;
      else { f.area = 'button'; f.button = f.picker === 0 ? 0 : GENER8; }
    } else {
      if (dx) f.button = (f.button + dx + BUTTONS.length) % BUTTONS.length;
      if (dy < 0) { f.area = 'picker'; f.picker = portraitMenuActive() ? 1 : (f.button >= 2 ? 1 : 0); }
    }
    Audio.sfx('ui');
    return true;
  }

  pointerHit(L, x, y) {
    const inside = (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (inside(L.modeBox)) return { area: 'mode', mode: x < L.modeBox.x + L.modeBox.w / 2 ? 'simple' : 'advanced' };
    const g = L.grid;
    if (inside(g)) {
      return {
        area: 'grid',
        col: Math.min(this.steps - 1, Math.floor((x - g.x) / g.cellW)),
        row: Math.min(this.rows - 1, Math.floor((y - g.y) / g.cellH)),
      };
    }
    for (let i = 0; i < L.pickers.length; i++) {
      const r = L.pickers[i];
      // the arrows at the ends step; the middle opens every choice at once
      if (inside(r)) return { area: 'picker', picker: i, dir: x < r.x + r.w * 0.22 ? -1 : x > r.x + r.w * 0.78 ? 1 : 0 };
    }
    for (let i = 0; i < L.buttons.length; i++) if (inside(L.buttons[i])) return { area: 'button', button: i };
    return null;
  }

  update(dt) {
    if (this.messageT > 0) this.messageT -= dt;
    if (this.making > 0 && --this.making === 0) { this.make(); Input.endFrame(); return; }
    this.tickLoop();
    const L = this.layout();
    const f = this.focus;
    if (this.chooser) { this.updateChooser(L); Input.endFrame(); return; }
    this.moveFocus();
    if (Input.pressed('confirm')) {
      if (f.area === 'mode') this.setMode(this.mode === 'simple' ? 'advanced' : 'simple');
      else if (f.area === 'grid') this.toggle(f.col, f.row);
      else if (f.area === 'picker') this.openChooser(f.picker);
      else this.press(f.button);
    }
    if (Input.pressed('pointer')) {
      const hit = this.pointerHit(L, Input.pointer.x, Input.pointer.y);
      if (hit?.area === 'mode') { f.area = 'mode'; this.setMode(hit.mode); }
      else if (hit?.area === 'grid') { Object.assign(f, hit); this.toggle(hit.col, hit.row); }
      else if (hit?.area === 'picker') {
        f.area = 'picker'; f.picker = hit.picker;
        if (hit.dir) this.cycle(hit.picker, hit.dir); else this.openChooser(hit.picker);
      }
      else if (hit?.area === 'button') { f.area = 'button'; f.button = hit.button; this.press(hit.button); }
    }
    if (Input.pressed('back') && this.making === 0) { Audio.sfx('ui'); this.onDone(); }
    Input.endFrame();
  }

  // ------------------------------------------------------------------ draw
  draw(ctx) {
    const L = this.layout();
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, W, H);
    const titleMid = L.top + L.titleH / 2 - (L.portrait ? 6 : 2);
    portraitMenuText(ctx, this.from ? 'EDIT BANGER' : 'NEW BANGER', L.grid.labelX, textYForMid(titleMid, portraitMenuScale(1.6), 'title'), '#fff', 1.6, 'title');
    const showFocus = !Input.usingTouch;
    this.drawModeSwitch(ctx, L, showFocus);
    this.drawGrid(ctx, L.grid, L.portrait);
    // CHARGING... and the like float over the middle of the grid: the title row is full.
    const status = this.making > 0 ? 'CHARGING...' : (this.messageT > 0 ? this.message : null);
    if (status) this.drawStatus(ctx, L, status);
    const labels = [
      `STYLE: ${MAKER_STYLES.find((s) => s.id === this.style)?.label ?? ''}`,
      `MOOD: ${MAKER_MOODS.find((m) => m.id === this.mood)?.label ?? ''}`,
    ];
    L.pickers.forEach((r, i) => {
      const sel = showFocus && this.focus.area === 'picker' && this.focus.picker === i;
      drawMenuRow(ctx, r.x, r.y, r.w, r.h, plateRadius(r.h, L.portrait), sel ? MENU_ROW_HILITE : BACK_BUTTON_PLATE);
      const mid = r.y + r.h / 2;
      const arrowS = 1.2;
      const ay = textYForMid(mid, portraitMenuScale(arrowS));
      portraitMenuText(ctx, '<', r.x + 12, ay, sel ? C_SEL : C_TEXT, arrowS);
      portraitMenuText(ctx, '>', r.x + r.w - 12 - portraitMenuScale(arrowS) * 5, ay, sel ? C_SEL : C_TEXT, arrowS);
      const s = portraitMenuFit(labels[i], 1.2, r.w - 50);
      portraitMenuTextCentered(ctx, labels[i], r.x + r.w / 2, textYForMid(mid, portraitMenuScale(s)), sel ? C_SEL : C_TEXT, s);
    });
    L.buttons.forEach((r, i) => {
      const sel = showFocus && this.focus.area === 'button' && this.focus.button === i;
      const plate = sel ? MENU_ROW_HILITE : (i === GENER8 ? 'rgba(72,224,200,0.16)' : BACK_BUTTON_PLATE);
      drawMenuRow(ctx, r.x, r.y, r.w, r.h, plateRadius(r.h, L.portrait), plate);
      const s = portraitMenuFit(BUTTONS[i], i === GENER8 ? 1.5 : 1.2, r.w - 14);
      portraitMenuTextCentered(ctx, BUTTONS[i], r.x + r.w / 2, textYForMid(r.y + r.h / 2, portraitMenuScale(s)),
        sel ? C_SEL : (i === GENER8 ? C_NOTE : C_TEXT), s);
    });
    if (this.chooser) this.drawChooser(ctx, L);
  }

  drawStatus(ctx, L, status) {
    const s = portraitMenuFit(status, 1, L.grid.w - 40);
    const w = textWidth(status, portraitMenuScale(s));
    const h = portraitMenuScale(s) * 14;
    const y = L.grid.y + L.grid.h / 2;
    drawMenuRow(ctx, W / 2 - w / 2 - 14, y - h / 2, w + 28, h, plateRadius(h, L.portrait), 'rgba(11,11,20,0.92)');
    portraitMenuTextCentered(ctx, status, W / 2, textYForMid(y, portraitMenuScale(s)), C_NOTE, s);
  }

  drawModeSwitch(ctx, L, showFocus) {
    const b = L.modeBox;
    const r = plateRadius(b.h, L.portrait);
    const focused = showFocus && this.focus.area === 'mode';
    drawMenuRow(ctx, b.x, b.y, b.w, b.h, r, focused ? MENU_ROW_HILITE : BACK_BUTTON_PLATE);
    MODE_IDS.forEach((id, i) => {
      const seg = { x: b.x + (i * b.w) / 2, w: b.w / 2 };
      const on = this.mode === id;
      if (on) drawMenuRow(ctx, seg.x + 2, b.y + 2, seg.w - 4, b.h - 4, Math.max(0, r - 2), 'rgba(72,224,200,0.22)');
      const label = RIFF_MODES[id].label;
      const s = portraitMenuFit(label, 0.9, seg.w - 10);
      portraitMenuTextCentered(ctx, label, seg.x + seg.w / 2, textYForMid(b.y + b.h / 2, portraitMenuScale(s)),
        on ? C_NOTE : (focused ? C_SEL : '#7a7a8c'), s);
    });
  }

  drawGrid(ctx, g, portrait) {
    const mode = this.mode;
    const rows = this.rows;
    const steps = this.steps;
    const per = 32 / steps;                  // sixteenths per column
    const pad = g.cellW > 20 ? 1.5 : 1;
    const labelS = Math.min(0.85, g.cellH / (portrait ? 20 : 12));
    for (let vr = 0; vr < rows; vr++) {
      const row = rows - 1 - vr;
      const mid = g.y + (vr + 0.5) * g.cellH;
      portraitMenuText(ctx, rowName(mode, row), g.labelX, textYForMid(mid, portraitMenuScale(labelS)),
        isSharp(mode, row) ? cellColour(mode, row, 0.9) : noteColour(mode, row), labelS);
    }
    const w = g.cellW - 2 * pad;
    const h = g.cellH - 2 * pad;
    const radius = Math.min(w, h) * 0.3;
    for (let col = 0; col < steps; col++) {
      const x = g.x + col * g.cellW;
      const playing = col === this.playStep;
      // Beats alternate in shade so the bar reads in fours.
      const beatLift = Math.floor((col * per) / 4) % 2 === 0 ? 0.05 : 0;
      for (let vr = 0; vr < rows; vr++) {
        const row = rows - 1 - vr;
        const on = this.notes[col] === row;
        const fill = on ? (playing ? '#ffffff' : noteColour(mode, row))
          : cellColour(mode, row, (isSharp(mode, row) ? 0.22 : 0.16) + beatLift + (playing ? 0.12 : 0));
        drawMenuRow(ctx, x + pad, g.y + vr * g.cellH + pad, w, h, radius, fill);
      }
    }
    // The bar line.
    ctx.fillStyle = 'rgba(201,160,255,0.55)';
    ctx.fillRect(g.x + g.w / 2 - 1, g.y, 2, g.h);
    if (!Input.usingTouch && this.focus.area === 'grid') {
      ctx.save();
      ctx.strokeStyle = C_SEL;
      ctx.lineWidth = 2;
      ctx.strokeRect(g.x + this.focus.col * g.cellW + 1, g.y + this.focus.row * g.cellH + 1, g.cellW - 2, g.cellH - 2);
      ctx.restore();
    }
  }
}
