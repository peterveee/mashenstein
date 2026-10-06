// MAKE A BANGER, in the game — the screen. 3 Oct 2026.
//
// Reached from THE LAB's NEW BANGER button, and titled NEW BANGER (Peter, 3 Oct 2026). A two-bar piano roll (riff.js), a STYLE
// and a MOOD, and BRING TO LIFE: the desk's generator writes a whole song from those (make.js), it is kept
// (store.js), and the jukebox opens again with it playing.
//
// SIMPLE and ADVANCED (riff.js) are two grids over one riff: ADVANCED is remembered
// while SIMPLE shows it converted down, and comes back as it was unless SIMPLE has been
// written in since. ZAP (Peter, 3 Oct 2026; it was SURPRISE ME) writes a random riff in
// whichever is showing — or, one time in three, a cabinet's own hook (game-riffs.js, Peter,
// 5 Oct 2026), named as it lands. A cabinet riff goes into ADVANCED as written and SIMPLE
// shows it converted down, as if ADVANCED had been switched from. EXPERIMENT (Peter, 5 Oct
// 2026) is ZAP for everything else: a random FORMULA, ELEMENT, VOLTAGE and DNA (Hybrid,
// Spliced or Mutant), leaving the notes alone.
//
// The grid loops while you edit, over a plain kick, hat and light clap at four BPM below
// the chosen style's lower tempo limit. It runs its own clock through Audio.voiceSfx rather
// than loading a song: edits are heard on the next pass, and a style change restarts
// the loop at its new tempo.
//
// BACK is the dance floor's round arrow, left of the title (Peter, 5 Oct 2026), which gave
// its slot in the button row to EXPERIMENT. The note-only buttons come first: CLEAR, ZAP, then
// EXPERIMENT, then the make. The buttons are one line, no hints, and the selectors slimmer,
// so the grid has the room; in portrait they stand two by two, under the selectors (Peter, 5 Oct 2026).
//
// The grid runs G4 to C6 (riff.js). Portrait shows every row; landscape shows as many as the
// A-to-A grid did, at the same size, and scrolls for the rest (Peter, 5 Oct 2026): the wheel,
// a drag up or down the note names, or the focus walking off the edge.
//
// The jukebox owns where this screen goes next, so it hands in `onDone` (BACK) and
// `onMade(recipe, song)` (BRING TO LIFE); nothing here imports the jukebox.
import { TRACK_EFFECTS_VERSION } from '../../../tools/lib/banger/production.js';
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawMenuRow, MENU_ROW_HILITE, BACK_BUTTON_PLATE, textYForMid, textWidth, TEXT_INK_TOP, TEXT_INK_H } from '../../engine/sprites.js';
import {
  portraitMenuActive, portraitMenuSafeTop, portraitMenuSafeBottom, portraitMenuScale,
  portraitMenuText, portraitMenuTextCentered, portraitMenuFit,
} from '../../engine/portrait-menu.js';
import {
  RIFF_MODES, RIFF_BPM, modeOf, semitoneOf, rowName, isSharp, rowHz, semitoneHz, toggleNote, hasNotes,
  normaliseNotes, normaliseLengths, simplify, expand, sixteenths, luckyNotes,
} from './riff.js';
import { GAME_RIFF_ODDS, pickGameRiff, gameRiffGrid } from './game-riffs.js';
import { MAKER_STYLES, MAKER_MOODS, makeBanger, newSeed, RECIPE_EXPRESSION, labFlavour } from './make.js';
import { styleFor } from '../../../tools/lib/banger/styles/index.js';
import { bangerState, saveDraft, pendingRecipe } from './store.js';
import { BANGER_VOLTAGES, voltageFor, voltageSettings } from './voltage.js';

// DNA — how far the riff's own notes are rewritten — has its own picker beside VOLTAGE, which
// is the effects, energy and arrangement, so a Overload take can keep the riff as written
// (Peter, 4 Oct 2026). It is the desk's Variation: PURE Faithful, HYBRID Some, SPLICED More, MUTANT Wild.
export const MAKER_VARIATIONS = Object.freeze([
  Object.freeze({ id: 'faithful', label: 'Pure', description: 'Your notes, as written' }),
  Object.freeze({ id: 'some', label: 'Hybrid', description: 'Sequenced up, phrase ends turned round' }),
  // Between the two (Peter, 5 Oct 2026): Hybrid, with one Mutant move a phrase.
  Object.freeze({ id: 'more', label: 'Spliced', description: 'Hybrid, plus a leap or a fragment' }),
  Object.freeze({ id: 'wild', label: 'Mutant', description: 'Fragments, rhythm shifts and big leaps' }),
]);
const PICKERS = 4;
const VARIATION = 3;

/**
 * The club's BOLT: `src`'s song as RECHARGE would make it with nothing changed — the riff,
 * style, mood, voltage and DNA read the way the grid reads them, today's expression and track
 * effects — on a new seed. The flavour is the one `src` plays, so the take is new but the
 * combination is not (Peter, 6 Oct 2026).
 */
export function rerollRecipe(src, seed = newSeed()) {
  const mode = src.mode === 'advanced' ? 'advanced' : 'simple';
  const notes = normaliseNotes(src.notes, mode);
  const voltage = Math.max(0, Math.min(BANGER_VOLTAGES.length - 1, Math.round(Number(voltageFor(src)) || 0)));
  const preset = voltageSettings(voltage);
  const dna = src.variation ?? (src.wild ? 'wild' : 'some');
  const variation = MAKER_VARIATIONS.some((v) => v.id === dna) ? dna : 'some';
  const flavour = src.flavour ?? labFlavour(src.style, src.mood, src.seed ?? null, voltageFor(src));
  return { notes, lengths: normaliseLengths(src.lengths, notes, mode), mode, style: src.style, mood: src.mood, voltage, variation,
    wild: preset.wild, energy: preset.energy, expression: RECIPE_EXPRESSION,
    production: { mode: preset.production, version: TRACK_EFFECTS_VERSION }, seed, flavour };
}

/**
 * THE BOLT's take: `src` rerolled and made, as `{ rec, song }` — `rec` the pending recipe the
 * club previews, an update to `from` when that is a kept song — or null if it would not make.
 */
export function rerollTake(src, from = null) {
  const recipe = rerollRecipe(src);
  let song;
  try {
    song = makeBanger({ ...recipe, useCurrentPalette: true });
  } catch (e) {
    console.warn('[banger] could not reroll it:', e);
    return null;
  }
  const rec = pendingRecipe({ ...recipe, bpm: song.bpm, paletteSnapshot: song.paletteSnapshot }, from);
  // a new banger not kept yet keeps the name its preview has shown
  if (!from && src.name) rec.name = src.name;
  return { rec, song };
}

const LOOKAHEAD_S = 0.12;
// The grid's own preview sound, a different one each visit, drawn from gentle voices
// with a real sustain stage. Struck pianos, mallets, plucks and fixed-length test tones
// sound lovely on a tap but hide the difference between short and held notes. These
// have quick attacks and an audible sustain; no MRDR-3 voices, to keep the Lab light on
// a phone. Only this screen hears them: the song uses the style's hook sound.
export const RIFF_VOICES = Object.freeze([
  'simpleTriangle', 'softKeys', 'padTriangle', 'amOrgan', 'tngrSoftPiano',
  'tngrHollowKeys', 'tngrMemoryOrgan', 'tngrAirFlute',
]);
// The riff over the loop: about 6 dB down from full — at 1 it was far too loud over the
// kick and hat (Peter, 3 Oct 2026).
const RIFF_GAIN = 0.5;
// BRING TO LIFE was GENER8 (Peter, 3 Oct 2026: the IT'S ALIVE! angle — birth.js). Editing a
// kept song shows RECHARGE instead — the same make, for a song already alive (Peter, 4 Oct 2026).
const BUTTONS = ['CLEAR', 'ZAP', 'EXPERIMENT', 'BRING TO LIFE'];
const GENER8 = 3;
/**
 * Rows on show in landscape. ADVANCED scrolls, showing the A-to-A grid's thirteen so the squares
 * stay their size; SIMPLE shows all eleven, a little shorter, and needs no arrows (Peter, 5 Oct 2026).
 */
const LANDSCAPE_ROWS = { simple: 11, advanced: 13 };
/** Wheel travel (deltaY) for one row. */
const WHEEL_ROW = 40;
/** How far a press on the note names moves before it is a drag rather than a tap on an arrow. */
const SCROLL_TAP_SLOP = 4;
const MODE_IDS = ['simple', 'advanced'];

const C_BG = '#0b0b14';
const C_TEXT = '#c8c8d8';
const C_SEL = '#c9a0ff';
const C_ARROW_OFF = 'rgba(200,200,216,0.22)';
// The grid's bar line: plain light, not the selection's violet (Peter, 5 Oct 2026).
const C_BAR_LINE = 'rgba(255,255,255,0.2)';
const BAR_LINE_W = 0.75;
const C_NOTE = '#48e0c8';

// Each of the twelve notes has its own colour, round the wheel from A (the game's teal),
// so a tune reads as a shape of colours and an octave lands on the colour it left — the
// same colour for a note in either mode. The black-key rows sit darker, as on a keyboard.
/**
 * The sharp sign, small and raised beside its letter as on a score (Peter, 5 Oct 2026):
 * two upright strokes and two heavier bars rising to the right. `x` is its left edge,
 * `capTop` and `capH` the letter's.
 */
function drawSharp(ctx, x, capTop, capH, colour) {
  const h = capH * 0.75;
  const w = h * 0.66;
  const slope = h * 0.12;
  ctx.save();
  ctx.fillStyle = colour;
  const stem = Math.max(0.5, h * 0.13);
  ctx.fillRect(x + w * 0.3 - stem / 2, capTop + slope, stem, h - slope);
  ctx.fillRect(x + w * 0.7 - stem / 2, capTop, stem, h - slope);
  const bar = Math.max(0.7, h * 0.2);
  for (const at of [0.28, 0.62]) {
    const y = capTop + h * at;
    ctx.beginPath();
    ctx.moveTo(x, y + slope / 2);
    ctx.lineTo(x + w, y - slope / 2);
    ctx.lineTo(x + w, y - slope / 2 + bar);
    ctx.lineTo(x, y + slope / 2 + bar);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const hueOf = (semi) => (172 + (((semi % 12) + 12) % 12) * 30) % 360;
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
  // `seed` opens the grid on a recipe that is not kept yet (a banger being previewed and
  // edited again), while `from` still names the kept song an update would change.
  constructor({ onDone, onMade, from = null, seed = null, random = Math.random }) {
    this.onDone = onDone;
    this.onMade = onMade;
    this.from = from;
    this.seed = seed;
    // Either a kept song (`from`) or a pending preview (`seed`) came from the pencil.
    // Both are a RECHARGE; only the NEW BANGER entry is a birth.
    this.recharging = !!(from || seed);
    this.random = random;
  }

  enter() {
    const d = bangerState().draft;
    this.mode = d.mode;
    this.simple = normaliseNotes(d.simple, 'simple');
    this.advanced = normaliseNotes(d.advanced, 'advanced');
    this.simpleLengths = normaliseLengths(d.simpleLengths, this.simple, 'simple');
    this.advancedLengths = normaliseLengths(d.advancedLengths, this.advanced, 'advanced');
    this.simpleEdited = !!d.simpleEdited;
    // The style and mood it was left on (store.js has already checked they still exist).
    // What changes every visit is only the grid's preview sound — never last visit's
    // (Peter, 3 Oct 2026).
    this.style = d.style;
    this.mood = d.mood;
    this.setVoltage(voltageFor(d), false);
    this.setVariation(d.variation);
    const src = this.seed || this.from;
    if (src) {
      this.mode = src.mode;
      if (this.mode === 'simple') { this.simple = normaliseNotes(src.notes, 'simple'); this.simpleLengths = normaliseLengths(src.lengths, this.simple, 'simple'); this.simpleEdited = true; }
      else { this.advanced = normaliseNotes(src.notes, 'advanced'); this.advancedLengths = normaliseLengths(src.lengths, this.advanced, 'advanced'); }
      this.style = src.style;
      this.mood = src.mood;
      this.setVoltage(voltageFor(src), false);
      // A recipe with no DNA of its own (the starter, a song from before the picker) was made
      // at the generator's default, Hybrid — Mutant if it went wild.
      this.setVariation(src.variation ?? (src.wild ? 'wild' : 'some'));
    }
    const voices = RIFF_VOICES.filter((id) => id !== BangerMakerState.lastVoice);
    this.riffVoice = voices[Math.floor(this.random() * voices.length)];
    BangerMakerState.lastVoice = this.riffVoice;
    const first = this.notes.findIndex((n) => n >= 0);
    this.scroll = 0;
    this.scrollToNotes();
    this.focus = { area: 'grid', col: Math.max(0, first), row: first >= 0 ? this.rows - 1 - this.notes[first] : this.scrollRow + this.visibleRows - 1, picker: 0, button: GENER8 };
    this.scrollDrag = null;
    this.wheelAcc = 0;
    // The wheel scrolls the grid here rather than stepping the focus.
    Input.wheelNav = false;
    this.message = null;
    this.pointerNote = null;
    this.messageT = 0;
    this.chooser = null;       // the STYLE / MOOD chooser while it is open
    this.making = 0;
    this.loopT0 = null;
    this.scheduled = -1;
    this.playStep = -1;
    Audio.setBank(null);
    Input.setMenuButtons();
  }

  exit() {
    Input.wheelNav = true;
    if (!this.recharging) saveDraft(this.draft());
  }

  draft() {
    return { mode: this.mode, simple: this.simple, advanced: this.advanced, simpleLengths: this.simpleLengths, advancedLengths: this.advancedLengths, simpleEdited: this.simpleEdited, style: this.style, mood: this.mood, voltage: this.voltage, variation: this.variation, wild: this.wild, energy: this.energy,
      production: { mode: this.trackEffects, version: TRACK_EFFECTS_VERSION } };
  }

  /** The grid on show. */
  get notes() { return this.mode === 'simple' ? this.simple : this.advanced; }
  get lengths() { return this.mode === 'simple' ? this.simpleLengths : this.advancedLengths; }
  set lengths(v) {
    const n = this.notes;
    if (this.mode === 'simple') { this.simpleLengths = normaliseLengths(v, n, 'simple'); this.simpleEdited = true; }
    else this.advancedLengths = normaliseLengths(v, n, 'advanced');
  }
  set notes(v) {
    if (this.mode === 'simple') { this.simple = normaliseNotes(v, 'simple'); this.simpleLengths = normaliseLengths(this.simpleLengths, this.simple, 'simple'); this.simpleEdited = true; }
    else { this.advanced = normaliseNotes(v, 'advanced'); this.advancedLengths = normaliseLengths(this.advancedLengths, this.advanced, 'advanced'); }
  }
  get previewBpm() {
    const style = styleFor(this.style);
    return (style?.tempoRange?.[0] ?? style?.bpm ?? RIFF_BPM) - 4;
  }
  get previewSixteenthS() { return 60 / this.previewBpm / 4; }
  setStyle(id) {
    if (this.style === id) return;
    this.style = id;
    this.loopT0 = null;
    this.scheduled = -1;
    this.playStep = -1;
  }
  get rows() { return modeOf(this.mode).semis.length; }
  /** How many rows the grid shows at once: all of them in portrait. */
  get visibleRows() { return portraitMenuActive() ? this.rows : Math.min(this.rows, LANDSCAPE_ROWS[this.mode] ?? this.rows); }
  /** The top row on show, counted down from the top (a visual row), kept in range. */
  get scrollRow() { return Math.max(0, Math.min(this.rows - this.visibleRows, this.scroll | 0)); }
  set scrollRow(v) { this.scroll = Math.max(0, Math.min(this.rows - this.visibleRows, Math.round(v))); }
  /** Scroll just far enough that visual row `vr` is on show. */
  showRow(vr) {
    const top = this.scrollRow;
    if (vr < top) this.scrollRow = vr;
    else if (vr > top + this.visibleRows - 1) this.scrollRow = vr - this.visibleRows + 1;
  }
  /** The A4-to-A5 window the grid always had, moved just enough to take in every note written. */
  scrollToNotes() {
    const aRow = modeOf(this.mode).semis.indexOf(0);
    this.scrollRow = this.rows - aRow - this.visibleRows;
    const vrs = this.notes.filter((n) => n >= 0).map((n) => this.rows - 1 - n);
    if (!vrs.length) return;
    this.showRow(Math.max(...vrs));
    this.showRow(Math.min(...vrs));
  }
  get steps() { return modeOf(this.mode).steps; }

  /** SIMPLE converted down from ADVANCED, which it gives back unless SIMPLE is written in. */
  simplifyAdvanced() {
    this.simple = simplify(this.advanced);
    this.simpleLengths = normaliseLengths(this.simple.map((note, i) =>
      note < 0 ? 0 : (this.advanced[2 * i] >= 0 ? this.advancedLengths[2 * i] : this.advancedLengths[2 * i + 1])), this.simple, 'simple');
    this.simpleEdited = false;
  }

  /** ZAP's cabinet riff: written into ADVANCED, SIMPLE converted down from it. */
  zapGameRiff(riff) {
    const { notes, lengths } = gameRiffGrid(riff);
    this.advanced = normaliseNotes(notes, 'advanced');
    this.advancedLengths = normaliseLengths(lengths, this.advanced, 'advanced');
    if (this.mode === 'simple') this.simplifyAdvanced();
    BangerMakerState.lastGameRiff = riff.id;
    this.scrollToNotes();
    this.say(riff.from);
  }

  setMode(id) {
    if (id === this.mode || !RIFF_MODES[id]) return;
    if (id === 'simple') {
      this.simplifyAdvanced();
    } else if (this.simpleEdited) {
      this.advanced = expand(this.simple);
      this.advancedLengths = normaliseLengths(this.simpleLengths.flatMap((len, i) =>
        this.simple[i] < 0 ? [0, 0] : [len, len]), this.advanced, 'advanced');
    }
    const f = this.focus;
    const was = this.steps;
    this.mode = id;
    f.col = Math.min(this.steps - 1, Math.floor(f.col * this.steps / was));
    f.row = Math.min(this.rows - 1, f.row);
    this.scrollToNotes();
    if (f.area === 'grid') this.showRow(f.row);
    Audio.sfx('ui');
  }

  // ------------------------------------------------------------------ layout
  layout() {
    const portrait = portraitMenuActive();
    const top = portrait ? portraitMenuSafeTop(28) : 6;
    const bottom = portrait ? portraitMenuSafeBottom(24) : H - 6;
    const titleH = portrait ? 70 : 24;
    const ctrlH = portrait ? 54 : 30;       // a selector: its label over its value
    const buttonH = portrait ? 46 : 22;     // a button: one line
    const gap = portrait ? 10 : 4;
    const x0 = 12;
    const width = W - 24;
    // The SIMPLE / ADVANCED switch, at the right of the title.
    // Smaller than it was (Peter, 5 Oct 2026): the title row is not where the eye should go.
    const modeW = portrait ? 176 : 112;
    const modeH = portrait ? 36 : 15;
    const modeBox = { x: x0 + width - modeW, y: top + (titleH - modeH) / 2 - (portrait ? 6 : 2), w: modeW, h: modeH };
    // BACK, the dance floor's round button (club.js), at the left of the title; the box is
    // the tap target, a little wider than the disc.
    const backR = portrait ? 20 * W / 390 : 9;
    const backMid = modeBox.y + modeH / 2;
    const backBox = { x: x0 - 4, y: backMid - backR * 1.4, w: backR * 2.8, h: backR * 2.8, cx: x0 + backR, cy: backMid, r: backR };
    // The note names stand in a column of their own, left of the grid.
    const labelW = portrait ? 44 : 24;
    // The four selectors: one row in landscape; two by two in portrait, where four abreast
    // leave no room between the arrows for BIG-ROOM HOUSE.
    const cols = this.pickerCols();
    const pickerRows = Math.ceil(PICKERS / cols);
    const buttonRows = Math.ceil(BUTTONS.length / cols);
    const ctrlTop = bottom - pickerRows * (ctrlH + gap) - buttonRows * (buttonH + gap) + gap;
    const gridTop = top + titleH;
    // Every beat stands apart in a gutter of its own and the bar in a wider one (Peter, 5 Oct
    // 2026): sixteenths in ADVANCED read in fours. The gutters come out of the width before
    // it is shared, so every square is the same size. Positions are counted in sixteenths:
    // `startX(at)` is where a square starting there begins, `endX(at)` where one ending there
    // ends, a gutter between them.
    const gridW = width - labelW;
    const per = 32 / this.steps;
    const pad = gridW / this.steps > 20 ? 1.5 : 1;
    const gutter = (at) => (at <= 0 || at >= 32 ? 0 : at % 16 === 0 ? 4 * pad : at % 4 === 0 ? 2 * pad : 0);
    let gutters = 0;
    for (let at = 4; at < 32; at += 4) gutters += gutter(at);
    const cellW = (gridW - gutters) / this.steps;
    const before = (at, inclusive) => {
      let sum = 0;
      for (let b = 4; b < 32 && (inclusive ? b <= at : b < at); b += 4) sum += gutter(b);
      return sum;
    };
    const gx = x0 + labelW;
    const startX = (at) => gx + (at / per) * cellW + before(at, true);
    const endX = (at) => gx + (at / per) * cellW + before(at, false);
    // The column under x: a gutter belongs half to each side.
    const colAt = (x) => {
      for (let col = 0; col < this.steps - 1; col++) {
        const at = (col + 1) * per;
        if (x < (endX(at) + startX(at)) / 2) return col;
      }
      return this.steps - 1;
    };
    // Portrait gives the grid everything between the title and the pickers: tall
    // squares are what a thumb wants.
    const visible = this.visibleRows;
    const cellH = (ctrlTop - gap - gridTop) / visible;
    // The note names stand centred under the BACK disc (Peter, 5 Oct 2026); `labelX` is the
    // column's left edge, where the scroll arrows hang.
    const grid = { x: gx, y: gridTop, w: gridW, h: cellH * visible, cellW, cellH, labelX: x0, nameX: backBox.cx, visible,
      pad, startX, endX, colAt };
    const selectorW = (width - (cols - 1) * gap) / cols;
    const pickers = Array.from({ length: PICKERS }, (_, i) => ({
      x: x0 + (i % cols) * (selectorW + gap), y: ctrlTop + Math.floor(i / cols) * (ctrlH + gap), w: selectorW, h: ctrlH,
    }));
    // The buttons stand in the selectors' columns, so each lines up with the one above it.
    const by = ctrlTop + pickerRows * (ctrlH + gap);
    const buttons = BUTTONS.map((_, i) => ({
      x: x0 + (i % cols) * (selectorW + gap), y: by + Math.floor(i / cols) * (buttonH + gap), w: selectorW, h: buttonH,
    }));
    return { portrait, top, titleH, modeBox, backBox, grid, pickers, buttons };
  }

  // ------------------------------------------------------------------ the loop
  // Always counted in sixteenths, whichever grid is showing: the kick on the beat, the
  // hat on the off-beat eighths, the riff from the grid as sixteenths.
  tickLoop() {
    const ctx = Audio.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const stepS = this.previewSixteenthS;
    if (this.loopT0 == null) { this.loopT0 = now + 0.1; this.scheduled = -1; }
    const { semis, lengths } = sixteenths(this.notes, this.mode, this.lengths);
    for (;;) {
      const next = this.scheduled + 1;
      const t = this.loopT0 + next * stepS;
      if (t > now + LOOKAHEAD_S) break;
      // Fell well behind (a hidden tab, a long frame): pick the loop up from here
      // rather than firing a backlog of notes at once.
      if (t < now - 0.25) { this.loopT0 = now + 0.05 - next * stepS; continue; }
      this.scheduled = next;
      const at = Math.max(0.005, t - now);
      const s16 = next % 32;
      // The kick on every beat, a light clap on two and four, the hat off the beat.
      if (s16 % 4 === 0) Audio.voiceSfx('kickMegamix', { gain: 0.45, at });
      else if (s16 % 4 === 2) Audio.voiceSfx('hatEngine', { gain: 0.3, at });
      if (s16 % 8 === 4) Audio.voiceSfx('ds808Clap', { gain: 0.2, at });
      if (semis[s16] != null) Audio.voiceSfx(this.riffVoice, { freq: semitoneHz(semis[s16]), seconds: lengths[Math.floor(s16 / (16 / this.steps))] * stepS * 0.9, gain: RIFF_GAIN, at });
    }
    const pos = Math.floor((now - this.loopT0) / stepS);
    this.playStep = pos >= 0 ? Math.floor((pos % 32) * this.steps / 32) : -1;
  }

  // ------------------------------------------------------------------ actions
  toggle(col, visualRow) {
    const row = this.rows - 1 - visualRow;
    const wasOn = this.notes[col] === row;
    this.notes = toggleNote(this.notes, col, row, this.mode);
    const lens = [...this.lengths];
    lens[col] = wasOn ? 0 : modeOf(this.mode).len;
    this.lengths = lens;
    if (!wasOn) Audio.voiceSfx(this.riffVoice, { freq: rowHz(this.mode, row), seconds: 0.2, gain: RIFF_GAIN });
    else Audio.sfx('ui');
  }

  cycle(picker, dir) {
    if (picker === 0) {
      const i = MAKER_STYLES.findIndex((s) => s.id === this.style);
      this.setStyle(MAKER_STYLES[(i + dir + MAKER_STYLES.length) % MAKER_STYLES.length].id);
    } else if (picker === 1) {
      const i = MAKER_MOODS.findIndex((m) => m.id === this.mood);
      this.mood = MAKER_MOODS[(i + dir + MAKER_MOODS.length) % MAKER_MOODS.length].id;
    } else if (picker === VARIATION) {
      const i = MAKER_VARIATIONS.findIndex((v) => v.id === this.variation);
      this.setVariation(MAKER_VARIATIONS[Math.max(0, Math.min(MAKER_VARIATIONS.length - 1, i + dir))].id);
    } else this.setVoltage(this.voltage + dir, false);
    Audio.sfx('ui');
  }

  say(text) { this.message = text; this.messageT = 2; }

  /** EXPERIMENT: a new FORMULA and ELEMENT (never the ones on show), any VOLTAGE, and DNA Hybrid, Spliced or Mutant — never Pure (Peter, 5 Oct 2026). The notes stay. */
  experiment() {
    const other = (list, cur) => {
      const rest = list.filter((it) => it.id !== cur);
      return (rest.length ? rest : list)[Math.floor(this.random() * (rest.length || list.length))].id;
    };
    this.setStyle(other(MAKER_STYLES, this.style));
    this.mood = other(MAKER_MOODS, this.mood);
    this.setVoltage(Math.floor(this.random() * BANGER_VOLTAGES.length), false);
    const dna = MAKER_VARIATIONS.filter((v) => v.id !== 'faithful');
    this.setVariation(dna[Math.floor(this.random() * dna.length)].id);
  }

  /** The make-it button's word: BRING TO LIFE for a new banger, RECHARGE when remaking one. */
  actionWord() { return this.recharging ? 'RECHARGE' : 'BRING TO LIFE'; }

  // ------------------------------------------------------------------ the chooser
  // The centre opens the full choice list; the arrows at either end step the selection.
  // A tap outside, or back, closes the list.
  openChooser(picker) {
    const items = picker === 0 ? MAKER_STYLES : picker === 1 ? MAKER_MOODS : picker === VARIATION ? MAKER_VARIATIONS
      : BANGER_VOLTAGES.map(({ level, label, helper }) => ({ id: String(level), label, description: helper }));
    const cur = this.pickerValue(picker);
    this.chooser = { picker, items, sel: Math.max(0, items.findIndex((it) => it.id === cur)) };
    Audio.sfx('ui');
  }

  choose(i) {
    const c = this.chooser;
    const it = c.items[i];
    if (it) {
      if (c.picker === 0) this.setStyle(it.id);
      else if (c.picker === 1) this.mood = it.id;
      else if (c.picker === VARIATION) this.setVariation(it.id);
      else this.setVoltage(Number(it.id), false);
    }
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
    const ch = Math.min(L.portrait ? 56 : 42, (panel.h - pad * 2 - titleH - gap * (rows - 1)) / rows);
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
    const title = ['CHOOSE A FORMULA', 'CHOOSE AN ELEMENT', 'CHOOSE A VOLTAGE', 'CHOOSE ITS DNA'][c.picker];
    portraitMenuTextCentered(ctx, title, W / 2, textYForMid(panel.y + pad + titleH / 2, portraitMenuScale(1.3)), '#fff', 1.3);
    const cur = this.pickerValue(c.picker);
    c.items.forEach((it, i) => {
      const r = cells[i];
      const on = it.id === cur, sel = showFocus && c.sel === i;
      drawMenuRow(ctx, r.x, r.y, r.w, r.h, plateRadius(r.h, L.portrait), sel ? MENU_ROW_HILITE : on ? 'rgba(72,224,200,0.2)' : BACK_BUTTON_PLATE);
      const labelY = r.y + r.h * 0.34;
      const descriptionY = r.y + r.h * 0.72;
      const labelSize = portraitMenuFit(it.label, 1.05, r.w - 12);
      const description = it.description ?? '';
      const descriptionSize = portraitMenuFit(description, 0.68, r.w - 12);
      portraitMenuTextCentered(ctx, it.label.toUpperCase(), r.x + r.w / 2, textYForMid(labelY, portraitMenuScale(labelSize)),
        sel ? C_SEL : on ? C_NOTE : C_TEXT, labelSize);
      if (description) portraitMenuTextCentered(ctx, description, r.x + r.w / 2,
        textYForMid(descriptionY, portraitMenuScale(descriptionSize)), sel ? '#d3c0f4' : '#89899a', descriptionSize);
    });
  }

  press(button) {
    const name = BUTTONS[button];
    if (name === 'CLEAR') {
      this.notes = null;
      Audio.sfx('ui');
    } else if (name === 'ZAP') {
      const riff = this.random() < GAME_RIFF_ODDS ? pickGameRiff(this.mode, this.random, BangerMakerState.lastGameRiff) : null;
      if (riff) this.zapGameRiff(riff);
      else {
        this.notes = luckyNotes(this.mode);
        this.lengths = normaliseLengths(null, this.notes, this.mode);
      }
      Audio.sfx('uiConfirm');
    } else if (name === 'EXPERIMENT') {
      this.experiment();
      Audio.sfx('uiConfirm');
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
    // `expression` is the recipe's playing-policy version (make.js): a new or revised song opts in,
    // so GO WILD also sets the slide on its lead and the take draws its voltage rolls (a new lead
    // sound, and by voltage a new bass line and chord gate); an old recipe kept without it is made as it was.
    const recipe = { notes: this.notes, lengths: this.lengths, mode: this.mode, style: this.style, mood: this.mood, voltage: this.voltage, variation: this.variation, wild: this.wild, energy: this.energy, expression: RECIPE_EXPRESSION,
      production: { mode: this.trackEffects, version: TRACK_EFFECTS_VERSION }, seed: newSeed() };
    // The flavour the take plays, kept with it (make.js labFlavour): a flavour added to the style later
    // never moves a saved song. Null for a style without flavours.
    recipe.flavour = labFlavour(recipe.style, recipe.mood, recipe.seed, recipe.voltage);
    let song;
    try {
      song = makeBanger({ ...recipe, useCurrentPalette: true });
    } catch (e) {
      console.warn('[banger] could not make it:', e);
      Audio.sfx('uiBad');
      this.say('THAT ONE WOULD NOT MAKE - TRY AGAIN');
      return;
    }
    if (!this.recharging) saveDraft(this.draft());
    // Nothing is kept here — generation hands a pending recipe over, and the club asks
    // whether to save it (UPDATE / SAVE AS NEW / DON'T SAVE) rather than keeping every take
    // (Peter, 4 Oct 2026).
    const rec = pendingRecipe({ ...recipe, bpm: song.bpm, paletteSnapshot: song.paletteSnapshot }, this.from);
    // Editing a still-pending new song starts with a seed recipe but no kept `from` row.
    // Keep the label already shown in the club through that second recharge.
    if (this.seed && !this.from) rec.name = this.seed.name;
    this.onMade(rec, song, this.from, this.recharging);
  }

  // ------------------------------------------------------------------ input
  moveFocus() {
    const f = this.focus;
    const dx = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
    const dy = (Input.pressed('down') ? 1 : 0) - (Input.pressed('up') ? 1 : 0);
    if (!dx && !dy) return false;
    if (f.area === 'back') {
      if (dx > 0) f.area = 'mode';
      if (dy > 0) { f.area = 'grid'; f.row = this.scrollRow; f.col = 0; }
    } else if (f.area === 'mode') {
      // left past SIMPLE reaches the BACK arrow
      if (dx < 0 && this.mode === 'simple') f.area = 'back';
      else if (dx) { this.setMode(dx < 0 ? 'simple' : 'advanced'); return true; }
      if (dy > 0) { f.area = 'grid'; f.row = this.scrollRow; }
    } else if (f.area === 'grid') {
      if (dx) f.col = (f.col + dx + this.steps) % this.steps;
      if (dy < 0 && f.row === 0) f.area = 'mode';
      else if (dy > 0 && f.row === this.rows - 1) { f.area = 'picker'; f.picker = Math.min(this.pickerCols() - 1, Math.floor(f.col * this.pickerCols() / this.steps)); }
      else if (dy) { f.row = Math.max(0, Math.min(this.rows - 1, f.row + dy)); this.showRow(f.row); }
    } else if (f.area === 'picker') {
      if (dx) { this.cycle(f.picker, dx); return true; }
      const cols = this.pickerCols();
      if (dy < 0 && f.picker >= cols) f.picker -= cols;
      else if (dy < 0) {
        f.area = 'grid'; f.row = this.scrollRow + this.visibleRows - 1;
        f.col = Math.floor(this.steps * (f.picker + 0.5) / cols);
      } else if (dy > 0 && f.picker + cols < PICKERS) f.picker += cols;
      else if (dy > 0) { f.area = 'button'; f.button = f.picker % cols; }
    } else if (f.area === 'button') {
      const cols = this.pickerCols();
      if (dx) f.button = (f.button + dx + BUTTONS.length) % BUTTONS.length;
      if (dy > 0 && f.button + cols < BUTTONS.length) f.button += cols;
      else if (dy < 0 && f.button >= cols) f.button -= cols;
      else if (dy < 0) { f.area = 'picker'; f.picker = PICKERS - cols + f.button; }
    }
    Audio.sfx('ui');
    return true;
  }

  setVoltage(level, sound = true) {
    const next = Math.max(0, Math.min(BANGER_VOLTAGES.length - 1, Math.round(Number(level) || 0)));
    this.voltage = next;
    const preset = voltageSettings(next);
    // DNA is its own picker now: Voltage leaves the riff's notes alone.
    this.wild = preset.wild;
    this.energy = preset.energy;
    this.trackEffects = preset.production;
    if (sound) Audio.sfx('ui');
  }

  /** How many selectors stand abreast: all four in landscape, two in portrait. */
  pickerCols() { return portraitMenuActive() ? 2 : PICKERS; }

  /** DNA's setting (the desk's Variation id); anything unreadable is Hybrid, the Lab's default. */
  setVariation(id) {
    this.variation = MAKER_VARIATIONS.some((v) => v.id === id) ? id : 'some';
  }

  /** What a picker shows, as its chooser's id. */
  pickerValue(picker) {
    return picker === 0 ? this.style : picker === 1 ? this.mood : picker === VARIATION ? this.variation : String(this.voltage);
  }

  pointerHit(L, x, y) {
    const inside = (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (inside(L.backBox)) return { area: 'back' };
    if (inside(L.modeBox)) return { area: 'mode', mode: x < L.modeBox.x + L.modeBox.w / 2 ? 'simple' : 'advanced' };
    const g = L.grid;
    // the note names are the handle that scrolls the grid
    if (x >= g.labelX - 12 && x < g.x && y >= g.y && y < g.y + g.h) return { area: 'names' };
    if (inside(g)) {
      return {
        area: 'grid',
        col: g.colAt(x),
        row: Math.min(this.rows - 1, this.scrollRow + Math.floor((y - g.y) / g.cellH)),
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
    this.wheelAcc += Input.wheelY;
    while (Math.abs(this.wheelAcc) >= WHEEL_ROW) {
      const dir = Math.sign(this.wheelAcc);
      this.scrollRow = this.scrollRow + dir;
      this.wheelAcc -= dir * WHEEL_ROW;
    }
    if (this.scrollDrag) {
      const d = this.scrollDrag;
      if (Input.pointer.down) {
        if (Math.abs(Input.pointer.y - d.y) > SCROLL_TAP_SLOP) d.moved = true;
        if (d.moved) this.scrollRow = d.from - (Input.pointer.y - d.y) / L.grid.cellH;
      } else {
        // A tap, not a drag: the names' top half is the up arrow, the bottom half the down,
        // one note a tap (Peter, 5 Oct 2026).
        if (!d.moved) this.scrollRow = d.from + (d.y < L.grid.y + L.grid.h / 2 ? -1 : 1);
        this.scrollDrag = null;
      }
    }
    if (Input.pressed('confirm')) {
      if (f.area === 'back') { Audio.sfx('ui'); this.onDone(); }
      else if (f.area === 'mode') this.setMode(this.mode === 'simple' ? 'advanced' : 'simple');
      else if (f.area === 'grid') this.toggle(f.col, f.row);
      else if (f.area === 'picker') this.openChooser(f.picker);
      else this.press(f.button);
    }
    if (Input.pressed('pointer')) {
      const hit = this.pointerHit(L, Input.pointer.x, Input.pointer.y);
      if (hit?.area === 'back') { Audio.sfx('ui'); this.onDone(); }
      else if (hit?.area === 'names') this.scrollDrag = { y: Input.pointer.y, from: this.scrollRow, moved: false };
      else if (hit?.area === 'mode') { f.area = 'mode'; this.setMode(hit.mode); }
      else if (hit?.area === 'grid') {
        Object.assign(f, hit);
        this.toggle(hit.col, hit.row);
        const row = this.rows - 1 - hit.row;
        this.pointerNote = { col: hit.col, row, at: performance.now(), x: Input.pointer.x };
      }
      else if (hit?.area === 'picker') {
        f.area = 'picker'; f.picker = hit.picker;
        if (hit.dir) this.cycle(hit.picker, hit.dir); else this.openChooser(hit.picker);
      }
      else if (hit?.area === 'button') { f.area = 'button'; f.button = hit.button; this.press(hit.button); }
    }
    if (this.pointerNote && Input.pointer.down) {
      const at = this.pointerHit(L, Input.pointer.x, Input.pointer.y);
      if (at?.area === 'grid' && at.row === this.rows - 1 - this.pointerNote.row) {
        const per = 32 / this.steps;
        const steps = Math.max(modeOf(this.mode).len,
          (Math.abs(at.col - this.pointerNote.col) + 1) * per);
        if (at.col >= this.pointerNote.col) {
          const lens = [...this.lengths];
          lens[this.pointerNote.col] = Math.min(32, steps);
          this.lengths = lens;
          if (at.col > this.pointerNote.col) this.pointerNote.dragged = true;
        }
      }
    }
    if (this.pointerNote && Input.released('pointer')) {
      const per = 32 / this.steps;
      const heldSteps = Math.round((performance.now() - this.pointerNote.at)
        / (this.previewSixteenthS * 1000) / per) * per;
      // Held still, a note is as long as it was held. Dragged, the drag says how long: a slow
      // drag's time held ran it on past where the finger stopped (Peter, 5 Oct 2026).
      if (!this.pointerNote.dragged && heldSteps > modeOf(this.mode).len) {
        const lens = [...this.lengths];
        lens[this.pointerNote.col] = Math.min(32, Math.max(lens[this.pointerNote.col], heldSteps));
        this.lengths = lens;
      }
      this.pointerNote = null;
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
    const showFocus = !Input.usingTouch;
    this.drawBack(ctx, L, showFocus);
    const titleX = L.backBox.cx + L.backBox.r + (L.portrait ? 18 : 8);
    portraitMenuText(ctx, this.from ? 'EDIT BANGER' : 'NEW BANGER', titleX, textYForMid(titleMid, portraitMenuScale(1.6), 'title'), '#fff', 1.6, 'title');
    this.drawModeSwitch(ctx, L, showFocus);
    this.drawGrid(ctx, L.grid, L.portrait);
    // CHARGING... and the like float over the middle of the grid: the title row is full.
    const status = this.making > 0 ? 'CHARGING...' : (this.messageT > 0 ? this.message : null);
    if (status) this.drawStatus(ctx, L, status);
    const selectors = [
      { label: 'FORMULA', value: (MAKER_STYLES.find((s) => s.id === this.style)?.label ?? '').toUpperCase() },
      { label: 'ELEMENT', value: (MAKER_MOODS.find((m) => m.id === this.mood)?.label ?? '').toUpperCase() },
      { label: 'VOLTAGE', value: BANGER_VOLTAGES[this.voltage].label.toUpperCase() },
      { label: 'DNA', value: (MAKER_VARIATIONS.find((v) => v.id === this.variation)?.label ?? '').toUpperCase() },
    ];
    L.pickers.forEach((r, i) => {
      const sel = showFocus && this.focus.area === 'picker' && this.focus.picker === i;
      drawMenuRow(ctx, r.x, r.y, r.w, r.h, plateRadius(r.h, L.portrait), sel ? MENU_ROW_HILITE : BACK_BUTTON_PLATE);
      const labelMid = r.y + r.h * 0.28;
      const valueMid = r.y + r.h * 0.7;
      const arrowS = 1.2;
      const ay = textYForMid(valueMid, portraitMenuScale(arrowS));
      portraitMenuText(ctx, '<', r.x + 12, ay, sel ? C_SEL : C_TEXT, arrowS);
      portraitMenuText(ctx, '>', r.x + r.w - 12 - portraitMenuScale(arrowS) * 5, ay, sel ? C_SEL : C_TEXT, arrowS);
      const labelSize = portraitMenuFit(selectors[i].label, 0.9, r.w - 12);
      const valueSize = portraitMenuFit(selectors[i].value, L.portrait ? 1 : 0.86, r.w - 34);
      portraitMenuTextCentered(ctx, selectors[i].label, r.x + r.w / 2,
        textYForMid(labelMid, portraitMenuScale(labelSize)), sel ? C_SEL : '#89899a', labelSize);
      portraitMenuTextCentered(ctx, selectors[i].value, r.x + r.w / 2,
        textYForMid(valueMid, portraitMenuScale(valueSize)), sel ? C_SEL : C_TEXT, valueSize);
    });
    L.buttons.forEach((r, i) => {
      const sel = showFocus && this.focus.area === 'button' && this.focus.button === i;
      const plate = sel ? MENU_ROW_HILITE : (i === GENER8 ? 'rgba(72,224,200,0.16)' : BACK_BUTTON_PLATE);
      drawMenuRow(ctx, r.x, r.y, r.w, r.h, plateRadius(r.h, L.portrait), plate);
      const label = i === GENER8 ? this.actionWord() : BUTTONS[i];
      const s = portraitMenuFit(label, i === GENER8 ? 1.2 : 1, r.w - 14);
      portraitMenuTextCentered(ctx, label, r.x + r.w / 2, textYForMid(r.y + r.h / 2, portraitMenuScale(s)),
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

  /** BACK, drawn as the dance floor draws its own (club.js): a dark disc, a faint rim, a chevron. */
  drawBack(ctx, L, showFocus) {
    const { cx, cy, r } = L.backBox;
    const u = L.portrait ? 1.9 * W / 390 : 1;
    const focused = showFocus && this.focus.area === 'back';
    ctx.save();
    ctx.fillStyle = 'rgba(11,11,20,0.78)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = focused ? C_SEL : 'rgba(200,200,216,0.45)'; ctx.lineWidth = 0.8 * u;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C_TEXT; ctx.lineWidth = 1.6 * u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(cx + r * 0.15, cy - r * 0.42); ctx.lineTo(cx - r * 0.3, cy); ctx.lineTo(cx + r * 0.15, cy + r * 0.42); ctx.stroke();
    ctx.restore();
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
      const s = portraitMenuFit(label, 0.72, seg.w - 8);
      portraitMenuTextCentered(ctx, label, seg.x + seg.w / 2, textYForMid(b.y + b.h / 2, portraitMenuScale(s)),
        on ? C_NOTE : (focused ? C_SEL : '#7a7a8c'), s);
    });
  }

  drawGrid(ctx, g, portrait) {
    const mode = this.mode;
    const rows = this.rows;
    const steps = this.steps;
    const per = 32 / steps;                  // sixteenths per column
    const pad = g.pad;
    const labelS = Math.min(0.85, g.cellH / (portrait ? 20 : 12));
    // Only the rows on show (landscape scrolls); `top` is the first, a visual row.
    const top = this.scrollRow;
    const shown = [];
    for (let vr = top; vr < top + g.visible; vr++) shown.push(vr);
    const yOf = (vr) => g.y + (vr - top) * g.cellH;
    for (const vr of shown) {
      const row = rows - 1 - vr;
      const mid = yOf(vr) + g.cellH / 2;
      const sharp = isSharp(mode, row);
      const colour = sharp ? cellColour(mode, row, 0.9) : noteColour(mode, row);
      const letter = rowName(mode, row)[0];
      const scale = portraitMenuScale(labelS);
      const ty = textYForMid(mid, scale);
      portraitMenuTextCentered(ctx, letter, g.nameX, ty, colour, labelS);
      if (sharp) drawSharp(ctx, g.nameX + textWidth(letter, scale) / 2 + scale * 0.8, ty + TEXT_INK_TOP * scale, TEXT_INK_H * scale, colour);
    }
    const h = g.cellH - 2 * pad;
    const radius = Math.min(g.cellW - 2 * pad, h) * 0.3;
    // The beat gutters (layout) are space alone — a line on every beat was noise; the bar's
    // has a hairline down it.
    const leftAt = (at) => g.startX(at) + pad;
    const rightAt = (at) => g.endX(at) - pad;
    for (let col = 0; col < steps; col++) {
      const x = leftAt(col * per);
      const w = rightAt((col + 1) * per) - x;
      const playing = col === this.playStep;
      // Beats alternate in shade so the bar reads in fours.
      const beatLift = Math.floor((col * per) / 4) % 2 === 0 ? 0.05 : 0;
      for (const vr of shown) {
        const row = rows - 1 - vr;
        const fill = cellColour(mode, row, (isSharp(mode, row) ? 0.22 : 0.16) + beatLift + (playing ? 0.12 : 0));
        drawMenuRow(ctx, x, yOf(vr) + pad, w, h, Math.min(radius, w / 2), fill);
      }
    }
    // The bar line, under a note held across it.
    ctx.fillStyle = C_BAR_LINE;
    ctx.fillRect((g.endX(16) + g.startX(16)) / 2 - BAR_LINE_W / 2, g.y, BAR_LINE_W, g.h);
    const lengths = normaliseLengths(this.lengths, this.notes, mode);
    // Each note is a piano roll block: the body itself reaches the written end, with
    // wrapped duration continuing at the start of this two-bar loop.
    for (let col = 0; col < steps; col++) {
      const row = this.notes[col];
      if (row < 0) continue;
      const vr = rows - 1 - row;
      if (vr < top || vr >= top + g.visible) continue;
      const y = yOf(vr) + pad;
      const start = col * per;
      const end = start + lengths[col];
      const x = leftAt(start);
      const first = rightAt(Math.min(end, 32)) - x;
      drawMenuRow(ctx, x, y, first, h, Math.min(radius, first / 2),
        col === this.playStep ? '#ffffff' : noteColour(mode, row));
      if (end > 32) {
        const wrapped = rightAt(Math.min(end - 32, 32)) - leftAt(0);
        drawMenuRow(ctx, leftAt(0), y, wrapped, h, Math.min(radius, wrapped / 2), noteColour(mode, row));
      }
    }
    // More rows than show: an arrow at the top and the bottom of the names, left of them (it
    // was a slim scroll bar; Peter, 5 Oct 2026), in the selectors' arrow colour. Both stay
    // up; the one with nowhere left to go is dimmed.
    if (g.visible < rows) {
      const ax = g.nameX - 10;           // in from the edge, a little left of the names (Peter, 5 Oct 2026)
      const aw = 4.5;
      const ah = Math.min(3.5, g.cellH * 0.25);
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const chevron = (cy, dir, live) => {
        ctx.strokeStyle = live ? C_TEXT : C_ARROW_OFF;
        ctx.beginPath();
        ctx.moveTo(ax - aw / 2, cy + dir * ah / 2);
        ctx.lineTo(ax, cy - dir * ah / 2);
        ctx.lineTo(ax + aw / 2, cy + dir * ah / 2);
        ctx.stroke();
      };
      chevron(yOf(top) + g.cellH / 2, 1, top > 0);
      chevron(yOf(top + g.visible - 1) + g.cellH / 2, -1, top + g.visible < rows);
      ctx.restore();
    }
    const fr = this.focus.row;
    if (!Input.usingTouch && this.focus.area === 'grid' && fr >= top && fr < top + g.visible) {
      ctx.save();
      ctx.strokeStyle = C_SEL;
      ctx.lineWidth = 2;
      const fx = g.startX(this.focus.col * per);
      ctx.strokeRect(fx + 1, yOf(this.focus.row) + 1, g.endX((this.focus.col + 1) * per) - fx - 2, g.cellH - 2);
      ctx.restore();
    }
  }
}
