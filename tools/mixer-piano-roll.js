// The piano roll: what a melodic lane plays, as pitch against sixteenths.
//
// The other half of the step grid, and deliberately the second half. A drum lane
// holds booleans, so that panel could be built without deciding anything about
// pitch; this one has to decide, and the decisions are all in three functions the
// shared shell (`mixer-bar-grid.js`) asks for — everything else, the batching, the
// paint drag, the window, the playhead, the shared-editing switch, is the grid's.
//
// ---- the range problem ----------------------------------------------------------
//
// `showBar`'s read-only roll derived its rows from the notes already in the bar,
// which is fine for reading and useless for writing: there is nowhere to put a note
// the bar does not already contain. So the rows come from a ROOT AND A SCALE — the
// same two controls the on-screen keyboard uses, and the same remembered preference,
// because "what key am I working in" is one answer per person and not one per panel.
//
// Out-of-scale rows are dimmed, never removed. A guide that greys the wrong notes
// helps; one that refuses them is an instrument arguing with you, and the accidental
// you wanted is always the one it would have refused. That is the on-screen
// keyboard's rule, and this is the same instrument.
//
// ---- what a cell holds ------------------------------------------------------------
//
// Three shapes, decided by the lane and never by looking at the value — a silent lane
// is all-null and all-false alike, so inspection cannot tell them apart:
//
//   melodic   a frequency, `null` to rest
//   chord     an ARRAY of frequencies, `null` to rest. A cell is one note OF the
//             chord, so clicking stacks rather than replaces: that is what makes a
//             chord lane a chord lane, and a roll that overwrote would be a roll that
//             could only ever play one note at a time on the lane built for stacks.
//
// A bare number on a chord lane throws inside scheduleStep and takes the whole render
// page with it (see src/data/voices.js), which is why the array is built here rather
// than left to whatever the last edit happened to leave behind.
import { CHORD_LANES, PERCUSSION_LANES, baseLane } from '../src/data/voices.js';
import { LANES } from '../src/engine/lanes.js';
import { createBarGrid } from './mixer-bar-grid.js';
import { SCALES, SCALE_BY_ID, PITCH_CLASSES, inScale } from './mixer-voice-library.js';

const LABELS = Object.fromEntries(
  LANES.map((l) => [l.key, l.label.charAt(0).toUpperCase() + l.label.slice(1)]),
);

/** MIDI semitone -> Hz, and back. The engine stores Hz; a keyboard thinks in steps. */
export const midiFreq = (midi) => 440 * (2 ** ((midi - 69) / 12));
export const freqMidi = (hz) => Math.round(12 * Math.log2(hz / 440) + 69);

/** A pitch class that is a black key on a real keyboard — for shading the rows. */
const BLACK = new Set([1, 3, 6, 8, 10]);

/**
 * ---- the keyboard's geometry ----------------------------------------------------
 *
 * A real board: SEVEN white keys spanning TWELVE semitones, so a white key is its own
 * row plus the half-row of each black beside it.
 *
 *   C 1.5   D 2   E 1.5   F 1.5   G 2   A 2   B 1.5   =  12
 *
 * That sum is the test. If the whites tile the octave it is a keyboard; if they are all
 * the same height it is twelve equal bars, and no amount of width or colour makes twelve
 * equal bars read as seven whites with five blacks between them. Equal heights were tried
 * and that is exactly how they looked.
 *
 * The trade: a white key does not line up 1:1 with the field row beside it. That is fine,
 * because the keyboard is not what you aim at — the FIELD is one equal row per semitone
 * and always will be. This column is the axis and the preview, and a keyboard that looks
 * like a keyboard is worth more here than one that lines up with a grid.
 */
const BLACK_ABOVE = new Set([0, 2, 5, 7, 9]);   // C D F G A — a black key sits above
const BLACK_BELOW = new Set([2, 4, 7, 9, 11]);  // D E G A B — and below
// Matches `#pianoroll .ssqrow.ssqlane` in mixer-shell.html. Pixels, because the shape is
// a keyboard's rather than a fraction of a container.
const ROW_H = 19;

/** Where one key sits, in pixels relative to its own row. */
export function keyGeometry(midi, rowH = ROW_H) {
  const pc = ((midi % 12) + 12) % 12;
  if (BLACK.has(pc)) return { black: true, top: 0, height: rowH };
  const up = BLACK_ABOVE.has(pc) ? rowH / 2 : 0;
  const down = BLACK_BELOW.has(pc) ? rowH / 2 : 0;
  return { black: false, top: -up, height: rowH + up + down };
}

/**
 * The lanes this panel can edit.
 *
 * Percussion is the step grid's job — it has no pitch axis, and offering one here would
 * be a second, worse way to do what that panel already does well. The fx lanes are left
 * out for a different reason: they build their own node graphs with timing internal to
 * the gesture, so a note in a roll would misrepresent what they play. They still take a
 * frequency, and a bank can still spell one by hand.
 */
const GESTURE_LANES = ['organGliss', 'organSwoop', 'keyGliss', 'gliss', 'electroFx', 'sweeps'];
export const rollEditable = (key) => {
  const base = baseLane(key);
  return !PERCUSSION_LANES.includes(base) && !GESTURE_LANES.includes(base);
};

/**
 * What a step becomes when a cell on it is drawn or cleared.
 *
 * Pulled out of the panel so it can be tested without a DOM: this is the one place
 * that decides what a note IS, and getting it wrong writes a bad bank rather than a
 * bad pixel. `chord` is the lane's nature, never a guess from the value — a silent
 * chord lane is all-null and looks exactly like a silent melodic one.
 *
 * Rests are `null` here, never `false`: that is a percussion lane's rest, and the two
 * are different values in the file (tests/preview.js pins it).
 */
export function noteCell({ chord, midi, freq }, value, on) {
  if (chord) {
    // A cell is one note OF the chord: stack, do not replace. Sorted so two ways of
    // arriving at the same chord write the same array and the file stops churning.
    const had = Array.isArray(value) ? value.filter((f) => f > 0) : [];
    const without = had.filter((f) => freqMidi(f) !== midi);
    const next = on ? [...without, freq].sort((a, b) => a - b) : without;
    return next.length ? next : null;
  }
  // Monophonic lanes hold ONE frequency, so drawing replaces whatever was on that
  // step — including a note on another row. Clearing only clears the row you clicked,
  // which is why this compares before nulling: dragging an eraser along a row must not
  // silently take out the notes above and below it.
  if (on) return freq;
  const cur = typeof value === 'number' && value > 0 ? value : null;
  return cur != null && freqMidi(cur) === midi ? null : cur;
}

/** Is this row's cell filled, given whatever the step holds? */
export function noteOn({ midi }, value) {
  if (Array.isArray(value)) return value.some((f) => f > 0 && freqMidi(f) === midi);
  return typeof value === 'number' && value > 0 && freqMidi(value) === midi;
}

/**
 * The pitch rows to draw, highest first.
 *
 * A range, not a count: the roll shows what the part actually uses, so a two-note
 * bassline is two octaves of room and a lead that walks four octaves gets four.
 */
export function pitchRows(lowMidi, highMidi) {
  const rows = [];
  for (let m = highMidi; m >= lowMidi; m--) rows.push(m);
  return rows;
}

/**
 * The highest and lowest note a lane plays ANYWHERE in the song, or null if it is
 * silent throughout.
 *
 * The whole song rather than the bar on screen. That distinction is the entire reason
 * `showBar`'s roll could not be written in: a range derived per bar has nowhere to put
 * a note the bar does not already contain, and it moves under the pointer every time
 * you page to the next bar. Derived per SONG it is stable while you work, and every
 * note the part plays is on screen wherever you are in it.
 */
export function laneSpan(bank, lane) {
  let low = null;
  let high = null;
  const consider = (v) => {
    if (typeof v === 'number' && v > 0) {
      const m = freqMidi(v);
      low = low == null ? m : Math.min(low, m);
      high = high == null ? m : Math.max(high, m);
    } else if (Array.isArray(v)) for (const f of v) consider(f);
  };
  const scan = (b) => { for (const v of b?.[lane] || []) consider(v); };
  scan(bank);
  for (const s of bank?.sections || []) scan(s);
  return low == null ? null : { low, high };
}

/**
 * The range to open a lane on: what it plays, with room to write above and below.
 *
 * Padded then snapped OUT to whole octaves, so the roll always begins and ends on a C
 * and the octave stripes line up with the labels. A silent lane gets a plain two
 * octaves from C3 — it has no opinion yet, and somewhere playable beats nowhere.
 *
 * The bottom is the part's own lowest note, one tone under it — NOT snapped down to the
 * octave. Snapping put plumber's bass, which spans eight semitones, thirty-seven rows up
 * from the bottom of the panel with the part floating in the middle of it. What you want
 * on opening is the part at the bottom of the window and room above to write; scrolling
 * up is easy and hunting for your own bassline is not.
 */
const PAD = 2;
const MIN_ROWS = 25;
export function autoRange(bank, lane, fallback = 48) {
  const span = laneSpan(bank, lane);
  if (!span) return { low: fallback, high: fallback + 24 };
  let low = span.low - PAD;
  let high = span.high + PAD;
  // Never so tight that the part fills the window edge to edge: a roll you cannot
  // draw a passing note into is the read-only one again.
  // Room to write goes ABOVE, so the part stays where it opened rather than sliding up
  // the window as the range grows.
  if (high - low + 1 < MIN_ROWS) high = low + MIN_ROWS - 1;
  return { low: Math.max(12, low), high: Math.min(120, high) };
}

/**
 * @param lane        () => the lane being edited, chosen on the desk
 * @param setLane     (key) => tell the desk the roll moved to another lane
 * @param editable    () => [laneKey] — which lanes the picker may offer
 * @param scale       () => { root, id } — the key, INJECTED rather than read from
 *                    localStorage, because the on-screen keyboard holds it in module
 *                    state as well as on disk. A second copy here would agree with the
 *                    keyboard until one of them was changed and then quietly disagree
 *                    for the rest of the session, which is the whole failure mode
 *                    sharing the preference was meant to avoid.
 * @param setScale    ({ root, id }) => the desk's own setter, so changing the key in the
 *                    roll re-dims the keyboard's keys too.
 * See `createBarGrid` for the rest; they are passed straight through.
 */
export function createPianoRoll({
  el, Audio, bank, editBank, draft, sel, apply, laneColour, engineBank,
  lane, setLane, editable, laneLabel = (key) => LABELS[key] || key,
  scale = () => ({ root: 0, id: 'chromatic' }), setScale = () => {},
  onClose = () => {},
}) {
  const SHIFT_KEY = 'mash-mixer-roll-shift';
  // The range is DERIVED, not stored: it is what the lane plays, so a part that grows
  // an octave grows the roll with it and there is no remembered number to go stale.
  // What is remembered is a nudge off that, per lane, for when you want to write
  // somewhere the part has not been yet.
  let shift = {};
  try { shift = JSON.parse(localStorage.getItem(SHIFT_KEY) || '{}'); } catch { shift = {}; }

  const isChord = () => CHORD_LANES.includes(baseLane(lane()));
  const rangeOf = () => {
    const key = lane();
    const auto = autoRange(bank(), key);
    const by = shift[key] || 0;
    return { low: auto.low + by, high: auto.high + by, shifted: by !== 0 };
  };
  const nudge = (semis) => {
    const key = lane();
    shift[key] = (shift[key] || 0) + semis;
    localStorage.setItem(SHIFT_KEY, JSON.stringify(shift));
    grid.redraw();
  };
  const refit = () => {
    delete shift[lane()];
    localStorage.setItem(SHIFT_KEY, JSON.stringify(shift));
    grid.redraw();
  };

  const grid = createBarGrid({
    el, Audio, bank, editBank, draft, sel, apply, engineBank, laneLabel,
    ns: 'roll',
    // The two that make this a roll rather than a pattern editor: it shows the whole
    // song and it lives in the page. See createBarGrid.
    wholeSong: true,
    docked: true,
    // Its controls join the region's own header rather than starting a second row.
    headerHost: () => document.getElementById('devhead'),
    onClose,

    // Every row is a PITCH on one lane, which is the whole difference from the step
    // grid — there, a row was a lane.
    rows: () => {
      const key = lane();
      const { root: scaleRoot, id: scaleId } = scale();
      const steps = SCALE_BY_ID[scaleId]?.steps || null;
      const { low, high } = rangeOf();
      // The range is the part's own, so most lanes fit the window outright. A lead that
      // walks four octaves will not, and that is what the wheel handler below is for —
      // rows stay the step grid's height rather than shrinking to fit, because the two
      // panels are two views of one song.
      return pitchRows(low, high).map((midi) => ({
        key: String(midi),
        lane: key,
        midi,
        freq: midiFreq(midi),
        label: `${PITCH_CLASSES[midi % 12]}${Math.floor(midi / 12) - 1}`,
        colour: laneColour(key),
        className: (BLACK.has(midi % 12) ? 'rollblack' : 'rollwhite')
          // Named the way the on-screen keyboard names them, and coloured the same way:
          // an offscale key gets its own face rather than a dimmed one. Dimming made a
          // white key render grey, which reads as a third kind of key instead of as
          // "not in this scale" — see the CSS.
          + (steps ? (inScale(midi, scaleRoot, steps) ? ' scalekey' : ' offscale') : '')
          + (steps && midi % 12 === scaleRoot ? ' rollroot' : ''),
      }));
    },

    // ---- the three that make this the roll
    isOn: (row, value) => noteOn(row, value),
    withCell: (row, value, on) => noteCell({ ...row, chord: isChord() }, value, on),

    preview: (row) => Audio.previewNote(row.lane, row.freq, { bank: engineBank() }),

    title: (c) => `${laneLabel(lane())} · ${c.barSpan}${c.linked ? ' · shared editing' : ''}`,

    headerExtra: () => {
      const { root: scaleRoot, id: scaleId } = scale();
      const picker = document.createElement('select');
      picker.className = 'fxsel ssqlane-pick';
      picker.title = 'Which part this roll is editing';
      for (const key of editable()) {
        const o = document.createElement('option');
        o.value = key;
        o.textContent = laneLabel(key);
        if (key === lane()) o.selected = true;
        picker.append(o);
      }
      picker.onchange = () => { setLane(picker.value); grid.redraw(); };

      const down = document.createElement('button');
      down.className = 'ssqx';
      down.textContent = '−';
      down.title = 'Move the window an octave down';
      down.onclick = (ev) => { ev.stopPropagation(); nudge(-12); };
      const up = document.createElement('button');
      up.className = 'ssqx';
      up.textContent = '+';
      up.title = 'Move the window an octave up';
      up.onclick = (ev) => { ev.stopPropagation(); nudge(12); };
      // Only once you have moved off the part: a control that does nothing is a
      // control you have to try before you learn it does nothing.
      const fit = document.createElement('button');
      fit.className = 'ssqlink';
      fit.textContent = 'Fit to part';
      fit.title = 'Back to the range this part actually plays';
      fit.hidden = !rangeOf().shifted;
      fit.onclick = (ev) => { ev.stopPropagation(); refit(); };

      const root = document.createElement('select');
      root.className = 'fxsel ssqroot';
      for (let i = 0; i < 12; i++) {
        const o = document.createElement('option');
        o.value = String(i); o.textContent = PITCH_CLASSES[i];
        if (i === scaleRoot) o.selected = true;
        root.append(o);
      }
      root.title = 'Which note is home';
      root.disabled = scaleId === 'chromatic';
      root.onchange = () => { setScale({ root: Number(root.value) }); grid.redraw(); };

      const kind = document.createElement('select');
      kind.className = 'fxsel ssqscalekind';
      for (const s of SCALES) {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.label;
        if (s.id === scaleId) o.selected = true;
        kind.append(o);
      }
      kind.title = 'Notes outside the key are dimmed — they still play, because the'
        + ' accidental you wanted is always the one a keyboard would have refused.';
      kind.onchange = () => { setScale({ id: kind.value }); grid.redraw(); };

      return [picker, down, up, fit, root, kind];
    },

    // A key, not a track name — and a real one: white notes full width, black notes
    // narrower and darker, which is the picture every hand already has. Only the C is
    // named, on the key itself. Twenty-five rows each labelled is twenty-five things to
    // read past; one landmark an octave is how a keyboard has always said where you are.
    rowHeader: (row) => {
      const key = document.createElement('button');
      const g = keyGeometry(row.midi);
      key.className = 'ssqkey';
      // Positioned in pixels rather than by the row, because a white key is taller than
      // its row — see keyGeometry. The row still owns the pitch; this only draws it.
      key.style.top = `${g.top}px`;
      key.style.height = `${g.height}px`;
      key.textContent = row.midi % 12 === 0 ? row.label : '';
      key.title = `Play ${row.label}`;
      key.setAttribute('aria-label', `Play ${row.label}`);
      key.onclick = () => Audio.previewNote(row.lane, row.freq, { bank: engineBank() });
      return [key];
    },
  });
  grid.setRulerLabel('Keys');

  // The wheel scrolls PITCH, which is the axis this panel is about. A trackpad's
  // horizontal component still reaches the scroller underneath, so a two-finger swipe
  // sideways moves through the bars as it always did — this only claims the vertical
  // part, and only when there is somewhere to go. Passive: false because a wheel over
  // a full-height roll must not also scroll the desk behind it.
  el.addEventListener('wheel', (ev) => {
    const scroll = el.querySelector('.ssqscroll');
    if (!scroll) return;
    const room = scroll.scrollHeight - scroll.clientHeight;
    if (room <= 0) return;                       // the whole range is already shown
    if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;   // that gesture is sideways
    const before = scroll.scrollTop;
    scroll.scrollTop = Math.max(0, Math.min(room, before + ev.deltaY));
    if (scroll.scrollTop !== before) ev.preventDefault();
  }, { passive: false });

  return {
    open: grid.open,
    close: grid.close,
    isOpen: grid.isOpen,
    refresh: grid.refresh,
    follow: grid.follow,
    songChanged: grid.songChanged,
  };
}
