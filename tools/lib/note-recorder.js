// Recording: a played note, written into the song.
//
// The desk has been able to PLAY a channel from three inputs for a while — the drawn
// keys, the computer keyboard and a MIDI keyboard — and all three arrive at one seam
// (`oskPlay` / `oskHit` in tools/mixer-entry.js). Every note was a preview: it sounded
// and it was gone. This is the fourth caller of that seam, the one that keeps them.
//
// ---- what is NOT here ------------------------------------------------------------
//
// Nothing about what a note IS. The three functions that decide that already exist,
// already pure and already tested, in tools/mixer-piano-roll.js:
//
//   noteCell     one note merged into a step — chord lanes stack and sort, melodic
//                lanes replace. The same rule tools/lib/midi-import.js applies to a
//                file, which is why a note played in and a note imported land alike.
//   noteLength   the parallel length, with the per-tone chord array PAIRED with the
//                frequencies, sorted together and split apart again. That positional
//                alignment is the whole risk in the format and it is solved there.
//   rollResizable  can this lane hold a length at all. The answer now follows the
//                melodic note lanes directly, so recording and the roll cannot disagree.
//
// Re-deriving any of those here would be a second opinion about the bank format, and
// two opinions is one more than a format can survive.
//
// ---- what IS here ---------------------------------------------------------------
//
// Three things the roll has no need of:
//
//   1. A clock. A pointer on a cell knows its step; a finger on a keyboard knows only
//      when it moved, so the heard position has to be turned into a step and rounded.
//   2. A buffer. The roll commits when the pointer lifts. A performance has no such
//      moment, so notes accumulate and are flushed on the bar line — see the header of
//      `createTake` for why it cannot be per note.
//   3. Percussion. `noteCell` deliberately refuses it: its rests are `null` and a drum
//      lane's are `false`, and the two are different values in the file
//      (tests/preview.js pins it). A pad is a `true` with no length, and that is the
//      one note shape this module owns outright.

import { CHORD_LANES, PERCUSSION_LANES, MONO_LANES, baseLane } from '../../src/data/voices.js';
import { lenKey, validLen } from '../../src/engine/lanes.js';
import { noteCell, noteLength, freqMidi } from '../mixer-piano-roll.js';

/**
 * Which of the three step shapes this lane holds.
 *
 * Off the LANE, never sniffed from a value: a silent chord lane is all-null and looks
 * exactly like a silent melodic one, and a bare number on a chord lane throws inside
 * scheduleStep and takes the render page with it.
 */
export function laneKind(laneKey) {
  const base = baseLane(laneKey);
  if (PERCUSSION_LANES.includes(base)) return 'perc';
  if (CHORD_LANES.includes(base)) return 'chord';
  return 'melodic';
}

/** A rest on that kind of lane. `false` on percussion, `null` on everything else. */
export const restValue = (laneKey) => (laneKind(laneKey) === 'perc' ? false : null);

/** Sixteen rests of the right kind — what a lane with nothing in it starts from. */
export const emptyBar = (laneKey, slots = 16) => new Array(slots).fill(restValue(laneKey));

/**
 * A2 — the pitch a note gets when it arrives without one, as a drum hit does.
 *
 * The same 110 as `BENCH_NOTE` in tools/mixer-voice-library.js, and for the same
 * reason: it is where a pitched preset is measured, so it is the desk's existing
 * answer to "which note, when nothing has said". Restated rather than imported —
 * that module is the preset library and pulling it in here, into a file the offline
 * tests load, would drag the whole rack behind it.
 */
export const NO_PITCH_NOTE = 110;

/** The tones in a step, whatever shape it arrived in. Empty for a rest. */
const tonesIn = (value) => (Array.isArray(value)
  ? value.filter((f) => typeof f === 'number' && f > 0)
  : (value == null || value === false || value === true ? [] : [value]));

/**
 * Make one step legal on the lane it is about to be written to.
 *
 * The three shapes are not interchangeable and the engine does not defend itself
 * evenly against getting the wrong one. Most pitched bodies read their step through a
 * `tonesOf` that takes a number or an array, so an array on `bass` is fine — but
 * `scheduleStep` calls `b.chords[s].forEach` outright, so a bare number on a chord
 * lane is a TypeError on the audio thread that repeats every step and takes the page
 * down with it. That is exactly what a cross-lane paste produces: `copyLaneBars`
 * reads a lane's values as they are, and pasting a bassline onto `chords` was writing
 * sixteen bare numbers into a lane whose every reader expects arrays.
 *
 * So the write path converts rather than trusting the clip:
 *
 *   → percussion   a note of any shape is a hit, a rest is `false`. Rhythm is all a
 *                  drum lane can hold, and rhythm is what survives.
 *   → chord        one note becomes a one-note chord; a chord stays as it is.
 *   → mono pitched gliss, sweeps, vox and the rest hold ONE thing per step — `vox`
 *                  picks a word by it — so a chord is flattened to its bottom tone
 *                  rather than handed over as an array that would multiply to NaN.
 *   → poly pitched a number or an array, both of which `tonesOf` reads.
 *
 * A percussion hit has no pitch to give, so one going the other way lands on
 * `NO_PITCH_NOTE` and can be dragged from there — a kit pattern pasted onto a bass is
 * a rhythm you wanted, and silence would look like the paste had failed.
 */
export function laneShape(laneKey, value, { pitch = NO_PITCH_NOTE } = {}) {
  const kind = laneKind(laneKey);
  const rest = value == null || value === false;
  if (kind === 'perc') return !rest;
  if (rest) return null;
  const tones = tonesIn(value);
  // `true` is a percussion hit on its way to a pitched lane: it has a step but no note.
  if (!tones.length) return value === true ? (kind === 'chord' ? [pitch] : pitch) : null;
  if (kind === 'chord') return tones;
  return MONO_LANES.includes(baseLane(laneKey)) || !Array.isArray(value) ? tones[0] : tones;
}

/**
 * The lengths that go with `laneShape`, kept aligned with the notes it produced.
 *
 * A percussion lane has no per-note length — a hit is a trigger — so every length is
 * blanked. Blanked rather than dropped: `putLane` reads a missing array as "leave the
 * lengths as they are", and the point is to CLEAR them, since the lengths that were
 * there belonged to the notes being replaced. Sixteen nulls is what deletes the key.
 *
 * Everywhere else a scalar is already legal on a chord lane (it covers every tone),
 * and the only real conversion is the flatten: a chord landing on a mono lane keeps
 * the length of the tone that survived it.
 */
export function laneShapeLengths(laneKey, lengths16) {
  if (!lengths16) return null;
  if (laneKind(laneKey) === 'perc') return lengths16.map(() => null);
  const mono = MONO_LANES.includes(baseLane(laneKey));
  return lengths16.map((len) => (mono && Array.isArray(len) ? (len[0] ?? null) : len ?? null));
}

/** Which bar of the song a step falls in, and where in that bar. */
export const barOfStep = (step) => Math.floor(step / 16);
export const stepInBar = (step) => step % 16;

/**
 * The heard position, as the grid step it lands on.
 *
 * `from` and `span` are the region being recorded — the armed loop, or the whole song
 * when nothing is looped. Rounding is `Math.round`, deliberately the same rule
 * tools/lib/midi-import.js uses on a file, so playing a note in and importing one put
 * it in the same place.
 *
 * The wrap is the interesting half. A note played thirty milliseconds BEFORE the
 * loop's downbeat rounds forward past the end of the loop, and comes back round to the
 * top of it — which is musically exactly right: you played the pickup to the downbeat,
 * and the downbeat is the top. Rounding forward over an ordinary bar line needs no
 * special case at all; it simply lands in the next bar.
 *
 * `grid` is expressed in the transport's sixteenth-step unit: 4 = quarter, 2 = eighth,
 * 1 = sixteenth and 0.5 = thirty-second. The transport deliberately keeps that unit
 * after a song upgrades, so loop markers, arrangement offsets and old recordings do
 * not need a second coordinate system.
 */
export function quantiseStep(heardStep, { grid = 1, from = 0, span = 32 } = {}) {
  if (!Number.isFinite(heardStep)) return from;
  const width = span > 0 ? span : 32;
  const q = Math.round((heardStep - from) / grid) * grid;
  return from + ((q % width) + width) % width;
}

/**
 * Keep a chord together.
 *
 * Three keys pressed "at once" are pressed over twenty or thirty milliseconds, and each
 * one asks the clock where it is. At 120bpm a sixteenth is 125ms, so most of the time
 * all three round to the same step and the chord is a chord — but a hand that lands
 * either side of a rounding boundary gets `round(4.45) = 4` for the bottom note and
 * `round(4.52) = 5` for the two above it, and the chord comes out as a note and a
 * dyad a step later. Rare enough to look like the recorder dropping notes at random,
 * which is the worst kind of rare.
 *
 * So the first note of a cluster anchors the rest: while the anchor is fresh, every
 * note takes ITS step rather than its own. Anchored to the first press rather than the
 * previous one, so a slow arpeggio cannot chain its way into one stacked chord — after
 * `withinMs` the next note starts a new anchor and the run spreads out as played.
 *
 * 45ms by default: comfortably wider than a hand landing on a chord, comfortably
 * narrower than the ~90ms a deliberate pair of sixteenths is apart at any usable tempo.
 *
 * Returns the step to use and the anchor to keep. Pure — the caller owns the clock.
 */
export function chordAnchor(anchor, nowMs, step, { withinMs = 45 } = {}) {
  if (anchor && Number.isFinite(nowMs) && nowMs - anchor.ms <= withinMs) {
    return { step: anchor.step, anchor };
  }
  return { step, anchor: { ms: nowMs, step } };
}

/**
 * How long a key was held, in steps, snapped to the grid.
 *
 * A `span` makes it survive the loop coming round underneath a held key — without it
 * that note reads as negative and would be thrown away, which is the one case where
 * holding a note through the turnaround is the thing you meant.
 *
 * Never zero: a key pressed and released inside one sixteenth is a note, and a note
 * of no length is a note that is not there.
 */
export function heldLength(onStep, offStep, { grid = 1, max = Infinity, span = null } = {}) {
  if (!Number.isFinite(onStep) || !Number.isFinite(offStep)) return null;
  let held = offStep - onStep;
  if (held < 0 && span > 0) held += span;
  if (held < 0) return null;
  const snapped = Math.round(held / grid) * grid || grid;
  return Math.max(grid, Math.min(max, snapped));
}

/** A length is a number, or one per chord tone, or nothing — so `Object.is` won't do. */
const sameLen = (a, b) => (Array.isArray(a) || Array.isArray(b)
  ? JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  : Object.is(a ?? null, b ?? null));

/**
 * ---- the take -------------------------------------------------------------------
 *
 * Everything played since the last flush, grouped the way the write wants it: one
 * entry per (bar, lane), holding that bar's sixteen steps and their sixteen lengths.
 * The same shape as the bar grid's `pending` map, deliberately — a take and a
 * paint-drag are the same edit arriving at different speeds, and the desk flushes both
 * through the same chained `writeBarNotes*` loop.
 *
 * ---- why it buffers at all ------------------------------------------------------
 *
 * `applyArrangementEdit` pushes an undo snapshot, revalidates the whole arrangement,
 * rebuilds the timeline and re-arms the loop. Committing per note would make one undo
 * step per note and rebuild the desk on every key — so a bar's worth of playing is one
 * edit, and the flush boundary is the bar line.
 *
 * ---- why it seeds from a read ---------------------------------------------------
 *
 * Recording OVERDUBS: the fifteen steps you did not play have to come back unchanged,
 * and a section override replaces the whole lane. So the first note into a (bar, lane)
 * reads what that bar currently plays and edits it. `read(bar, key)` must resolve
 * through the section delta chain and then fall through to the bank — exactly what
 * `readBarLane` in ./arrangement-edit.js does, against the bank as it is WRITTEN. It
 * is injected rather than imported so this stays pure and the test can hand it a stub.
 */
export function createTake({
  read,
  resizable = () => true,
  slots = 16,
  // Does a second note on the same step of this lane STACK or REPLACE?
  //
  // Injected rather than derived, because the honest answer needs the bank: a lane can
  // hold a chord when the rack is what plays it, and which voice a lane is on is a
  // property of the song rather than of the lane's name. See `polyLane` in
  // src/data/voices.js. The default is the old, narrower rule — the two lanes whose
  // hand-written playback loops over the step — so a caller with no bank still behaves.
  stacks = (laneKey) => laneKind(laneKey) === 'chord',
} = {}) {
  const entries = new Map();          // `${bar}:${lane}` -> entry
  const open = new Map();             // token -> what a note-off needs to know
  let tokens = 0;
  let played = 0;

  const kof = (bar, lane) => `${bar}:${lane}`;

  function entryFor(bar, lane) {
    const k = kof(bar, lane);
    const found = entries.get(k);
    if (found) return found;
    const perc = laneKind(lane) === 'perc';
    const seed = read(bar, lane);
    const entry = {
      bar,
      lane,
      // A percussion lane is coerced to booleans on the way in. A lane the song does
      // not have yet reads as sixteen nulls, and writing those back would leave a kit
      // lane holding nulls: inaudible, but it stops writing out as `seq(...)` and the
      // song file grows a line of raw JSON for no reason anybody could point at.
      notes: perc ? seed.map((v) => v === true) : seed.slice(),
      lens: read(bar, lenKey(lane)).slice(),
      touchedLen: false,
    };
    entries.set(k, entry);
    return entry;
  }

  /**
   * A note went down. Returns a token the note-off names, or null if there is nothing
   * to record — the lane is missing, or the step is off the end of a bar.
   */
  function add({ bar, lane, step, midi = null, freq = null }) {
    if (!lane || !Number.isInteger(bar) || bar < 0) return null;
    if (!Number.isInteger(step) || step < 0 || step >= slots) return null;
    const kind = laneKind(lane);
    const entry = entryFor(bar, lane);
    played += 1;
    const token = `t${tokens += 1}`;

    if (kind === 'perc') {
      // Retriggering a step already struck is a no-op. Record ADDS hits; taking one
      // out is the grid's job, and a recorder that could erase would be a recorder you
      // could not safely leave armed.
      entry.notes[step] = true;
      open.set(token, { entry, step, lengthable: false });
      return token;
    }

    // A chord lane always stacks; anywhere else it is the caller's decision, because it
    // depends on whether the rack or the hand-written oscillator code will play the step.
    const row = { chord: kind === 'chord' || !!stacks(lane), midi, freq };
    const prevValue = entry.notes[step] ?? null;
    const prevLen = entry.lens[step] ?? null;
    entry.notes[step] = noteCell(row, prevValue, true);
    // With no length measured yet this only ever inherits or clears: a note landing on
    // top of a DIFFERENT note must not ring for as long as the one it replaced.
    const nextLen = noteLength(row, prevValue, prevLen, true, null);
    if (!sameLen(nextLen, prevLen)) {
      entry.lens[step] = nextLen;
      entry.touchedLen = true;
    }
    open.set(token, {
      entry, step, row, prevValue, prevLen, lengthable: !!resizable(lane),
    });
    return token;
  }

  /**
   * That note came up, `len` steps later.
   *
   * The length is computed against the PRE-note snapshot, not against what `add` left
   * behind — which is the roll's own draw-then-resize path, and the reason the chord
   * case does not need a second implementation here.
   */
  function close(token, len) {
    const o = open.get(token);
    if (!o) return;
    open.delete(token);
    if (!o.lengthable || !(len > 0)) return;
    const value = o.entry.notes[o.step];
    const held = o.entry.lens[o.step] ?? null;

    // Against the step as it stands NOW, not against the snapshot this note took on the
    // way down. That distinction is the whole bug this replaced: `noteLength` rebuilds a
    // chord's entire length array from the value it is handed, and for a chord each note
    // went down seeing a SHORTER chord than the one that ended up there. Three releases
    // then wrote three differently-shaped arrays over each other and the last won —
    // `[null, null, 3]` for a triad every tone of which was held the same length.
    //
    // A release is not a draw. It says one thing about one tone: how long that one was.
    if (Array.isArray(value)) {
      const i = value.findIndex((f) => f > 0 && freqMidi(f) === o.row.midi);
      if (i < 0) return;                          // that tone is no longer in the chord
      // A scalar on a chord step means the whole chord, which is what a hand-written
      // `chordsLen: [4, …]` plainly says — so it spreads onto the tones rather than being
      // lost the moment one of them is released.
      const spread = validLen(held) ? held : null;
      const next = Array.from({ length: value.length },
        (_, j) => (Array.isArray(held) ? (validLen(held[j]) ? held[j] : null) : spread));
      next[i] = len;
      o.entry.lens[o.step] = next.some((v) => validLen(v)) ? next : null;
    } else {
      // Monophonic: only if this row's note is still the one on the step. A later note
      // replacing it must keep its own length, not inherit the released one's.
      if (typeof value !== 'number' || freqMidi(value) !== o.row.midi) return;
      o.entry.lens[o.step] = len;
    }
    o.entry.touchedLen = true;
  }

  return {
    add,
    close,
    count: () => played,
    lanes: () => new Set([...entries.values()].map((e) => e.lane)),
    bars: () => [...new Set([...entries.values()].map((e) => e.bar))].sort((a, b) => a - b),
    openTokens: () => [...open.keys()],
    stepOf: (token) => open.get(token) ?? null,
    /**
     * What the desk writes. `lengths16` stays NULL unless something actually measured
     * one — which is what keeps `putLane` from creating a `bassLen` key, and
     * tests/null-test.js sample-exact, on a take where every note-off was missed.
     */
    entries: () => [...entries.values()].map((e) => ({
      bar: e.bar,
      lane: e.lane,
      notes16: e.notes.slice(),
      lengths16: e.touchedLen ? e.lens.slice() : null,
    })),
    clear: () => { entries.clear(); open.clear(); played = 0; },
  };
}
