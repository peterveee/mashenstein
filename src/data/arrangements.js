// The arrangement layer — written by the mixing desk, read by the game and by every
// render tool. The counterpart of src/data/mix.js: that one holds what a song sounds
// LIKE, this one holds what plays WHEN.
//
// A song ("bank") is a set of 32-step lane arrays, a list of `sections` — two-bar
// partial banks that override some of those lanes — and an `order`, which is the
// playlist of section indices. Every build-up in the game was hand-typed into an
// order array: `plumber` is `[0, 0, 1, 1, 2, 3, 4, 5]` with section 0 being the same
// music with the snare, clap and open hats switched off.
//
// This file is how the desk writes that without touching the hand-authored bank. An
// entry is keyed by track id (see src/data/tracks.js) and carries:
//
//   {
//     order: [0, 0, { s: 1, bars: 1, off: ['snare', 'clap'] }, 1, 2, 3],
//     sections: [ { base: 1, lead: [...] } ],   // appended AFTER the bank's own
//     bpm: 104,                                 // the tempo it is played at
//     swing: 62,                                // how far off the grid it is played
//     loop: { startBar: 5, fromBar: 8, toBar: 12 },   // where it starts and repeats
//   }
//
// `bpm` is optional and overrides the bank's own. It is here rather than in the bank
// because the desk writes this file and never the composition: the song stays written
// at the tempo it was written at, and the arrangement says what it is played at —
// which is the same relationship `order` already has with the bank's own order.
// Absent means "the tempo it was composed at", so deleting it reverts exactly.
//
// `swing` is the same bargain about FEEL rather than speed. Every song here is written
// as a grid of sixteenths; this says how far off that grid it is played. The number is
// the on-grid sixteenth's share of its pair, as a percentage — 50 is the grid exactly,
// ~58 is where most funk and hip-hop sits, 66.7 is the triplet shuffle (2:1), 75 the
// dotted one. Only the ODD sixteenth moves, so downbeats, bar lines and anything sitting
// on a beat stay where they were composed, which is what lets one number cover a whole
// song. Absent — or 50 — means straight, so deleting it reverts exactly.
//
// It is a delay on the note and never on the clock: the sequencer still counts steps at
// a flat tempo, and the loop wrap, the bar plan and the desk's playhead go on counting
// with it. See the swing block in `scheduleStep`, src/engine/audio.js.
//
// `loop` is optional and is the song's INTRO AND REPEAT, in bars, counted from 1 and
// inclusive at both ends — the same way the desk's timeline counts and the same way
// anyone says "bars one to four". Playback begins at `startBar`, plays through to
// `toBar`, and then repeats `fromBar`–`toBar` for ever, so the bars between `startBar`
// and `fromBar` are heard exactly once. That is the whole point: a cabinet screen can
// arrive on a flourish without hearing it again every thirty seconds. All three parts
// are optional — `startBar` defaults to 1, and a `loop` with no `fromBar`/`toBar` is a
// skip-in with no repeat — and no `loop` at all is the whole form round and round,
// which is what every song did before this existed.
//
// A cabinet screen or a level can override the song's own markers with the same shape
// on its treatment (`variants[…].loop`, see src/data/mix.js) — so the select screen can
// start at bar 5 while the level starts at bar 1 and hears the intro in full.
//
// An order entry is either a NUMBER — section n, both its bars, as it has always
// been — or `{ s, bars, from, off }`:
//
//   s     which section
//   bars  how many bars of it (1 or 2; default 2). This is what makes the grid
//         bar-unit rather than two-bar-block-unit
//   from  which half to start at (0 or 1; default 0), so "the second bar of
//         section 3" is expressible
//   off   lane keys silenced for these bars — the mute mask. This is the whole
//         point: dropping the kit out of a repeat is an arrangement decision, and
//         duplicating a section to express it would bloat the file and hide it
//
// So a pure arrangement edit is one line of numbers, and reads as one in a diff.
//
// LAYER SECTIONS ARE DELTAS. A section in `sections` here may carry `base: n`,
// meaning "bank section n, with these keys replaced". That is what makes "replace
// the lead everywhere and leave the rest alone" expressible; fully materialised
// copies would both bloat the file and silently freeze every other lane at the
// moment of the edit. Indices in `order` address the combined list — the bank's own
// sections first, this file's after them.
//
// Deleting an entry from here reverts a song exactly. The bank keeps its notes and
// its ~200 lines of arrangement rationale; nothing in src/data/cabinets.js is ever
// machine-rewritten.

import { ARRANGEMENT_BY_ID } from './songs/index.js';

// Written by the desk, and rewritten WHOLE on every save — so nothing inside the
// object below survives, comments included. Anything worth saying about it is said
// up here, above the line the generator starts at.
//
// Empty means every song plays exactly as it was composed, which is also what keeps
// tests/null-test.js green.
// Assembled from src/data/songs/ — each song file carries its own arrangement.
const GENERATED_ARRANGEMENTS = ARRANGEMENT_BY_ID;
export const ARRANGEMENTS = Object.fromEntries(
  Object.entries(GENERATED_ARRANGEMENTS).filter(([, entry]) => entry),
);

// ---- THE FORMAT, IN CODE ----------------------------------------------------
// Everything from this line down is hand-written and is NOT machine-generated. The
// desk rewrites the object above it on every save (tools/lib/arrangements-source.js)
// and copies this half through verbatim — so this marker is load-bearing: move it or
// rename it and a save will eat the file's own code.

/**
 * A bank's order, defaulted the way the sequencer has always defaulted it: every
 * section once if there are sections, and a single block if there are not.
 */
export function orderOf(bank) {
  if (bank.order) return bank.order;
  return bank.sections ? bank.sections.map((_, i) => i) : [0];
}

/**
 * The tempo a song is actually played at: its arrangement's, else the bank's own.
 *
 * `applyArrangement` already answers this for anything holding the arranged bank —
 * the engine does. This is for the callers that only ever hold the composition and
 * one number: the jukebox's `(96 BPM)`, a render's buffer length, a MIDI file's tempo
 * meta. Every one of those read `bank.bpm` straight, so a song the desk had retuned
 * was listed, sized and exported at a tempo it no longer plays at.
 */
export function bpmOf(bank, id, table = ARRANGEMENTS) {
  const entry = id ? table[id] : null;
  return entry?.bpm ?? bank?.bpm ?? 112;
}

/** Swing at which a song is on the grid — the value that means "no swing at all". */
export const SWING_STRAIGHT = 50;

/** The hardest shuffle the desk will write: 3:1, the odd sixteenth halfway to the next. */
export const SWING_MAX = 75;

/**
 * How hard a song is played off its own grid: its arrangement's swing, else the bank's
 * own, else 50 — straight.
 *
 * The number is the on-grid sixteenth's share of its pair, as a percentage. 50 is the
 * grid exactly; 66.7 is the triplet shuffle; 75 the dotted one. The engine reads it as
 * a delay on every odd sixteenth (see `scheduleStep` in src/engine/audio.js), so only
 * the notes BETWEEN the beats move and a song's downbeats never do.
 *
 * The counterpart of `bpmOf`, and here for the same callers: the ones holding a
 * composition and a number rather than an arranged bank. The MIDI export is the one that
 * needs it most — it walks raw step blocks and would otherwise write a shuffled song out
 * dead straight.
 */
export function swingOf(bank, id, table = ARRANGEMENTS) {
  const entry = id ? table[id] : null;
  return entry?.swing ?? bank?.swing ?? SWING_STRAIGHT;
}

/**
 * Where a song starts and what it repeats — `{ startBar, fromBar, toBar }` in 1-based
 * inclusive bars, or null for the whole form round and round.
 *
 * Bars, not steps, and deliberately: this hands back what the file says, and the one
 * place that turns bars into sixteenths is the engine, which is also the only place
 * that knows how long the form actually is and can clamp against it. A second
 * conversion somewhere else is a second chance to be a bar out.
 */
export function loopOf(bank, id, table = ARRANGEMENTS) {
  const entry = id ? table[id] : null;
  return entry?.loop || null;
}

/**
 * A `{ startBar, fromBar, toBar }` as absolute 16th-steps, clamped to a song of `bars`
 * bars — `{ start, loop: { start, end } | null }`, or null for no markers at all.
 *
 * The one place bars become steps, so the engine, the timeline and the render tools
 * cannot disagree by a bar. The clamp is not politeness: the sequencer takes the bar
 * index modulo the plan length, so a `toBar` past the end of a song would quietly hand
 * the loop back to that modulo and the song would play whole with nothing to show for
 * it. Bars deleted from under a loop are the ordinary way that happens.
 *
 * The start comes back separately from the region because they are separate questions:
 * a song may come in late without repeating, and a region may be armed under a playhead
 * that is not to be moved.
 */
export function loopSteps(loop, bars) {
  if (!loop || !(bars > 0)) return null;
  const at = Math.min(bars, Math.max(1, Math.floor(loop.startBar ?? 1)));
  const start = (at - 1) * 16;
  if (loop.fromBar == null || loop.toBar == null) return { start, loop: null };
  const from = Math.min(bars, Math.max(at, Math.floor(loop.fromBar)));
  const to = Math.min(bars, Math.floor(loop.toBar));
  // The order was shortened under a loop that used to fit. Play the form from the start
  // bar rather than a region that is no longer there; the desk says so where it can be
  // fixed, and refusing to play at all would be a worse answer to a deleted bar.
  if (to < from) return { start, loop: null };
  return { start, loop: { start: (from - 1) * 16, end: to * 16 } };
}

/**
 * An order — a mix of numbers and `{s, bars, from, off}` — expanded into ONE ENTRY
 * PER BAR: `[{ sec, half, off }]`.
 *
 * `half` is which half of the section's 32 steps the bar reads (0 → steps 0–15,
 * 1 → steps 16–31), so a bar is addressable without any section carrying only one.
 *
 * The expansion of a legacy numeric order is provably what the engine does today:
 * `n` becomes two bars of section `n` with halves 0 and 1, so for any step in block
 * `k`, `sec` is `order[k]` and `half * 16 + step % 16` is `step % 32` — the two
 * numbers `scheduleStep` computes for itself. Numbers keep working; that is the
 * whole compatibility story.
 */
export function expandOrder(order, hasSections = true) {
  const plan = [];
  for (const e of order) {
    if (e == null) continue;
    if (typeof e === 'number') {
      const sec = hasSections ? e : null;
      plan.push({ sec, half: 0 }, { sec, half: 1 });
      continue;
    }
    const sec = hasSections ? e.s : null;
    const bars = Math.max(1, e.bars ?? 2);
    const from = e.from === 1 ? 1 : 0;
    for (let i = 0; i < bars; i++) {
      const bar = { sec, half: (from + i) % 2 };
      // Copied per bar rather than shared: these end up in a WeakMap-memoised plan
      // that the desk reads and the sequencer walks, and one `off` array on four
      // bars is four bars that change together the first time anything sorts it.
      if (e.off && e.off.length) bar.off = [...e.off];
      if (e.delete && e.delete.length) bar.delete = [...e.delete];
      for (const key of ['transpose', 'offset', 'gain']) {
        if (e[key] == null) continue;
        bar[key] = typeof e[key] === 'number' ? e[key] : { ...e[key] };
      }
      plan.push(bar);
    }
  }
  return plan;
}

// Resolved sections, per section list. `base:` chains are walked once and the answer
// kept: scheduleStep asks for one every sixteenth, and a delta that has to be merged
// eight times a second is a delta merged eight times a second.
const RESOLVED = new WeakMap();

/**
 * Section `idx` of a bank, with any `base:` delta merged over what it extends.
 *
 * The bank's own sections resolve to themselves — they are complete two-bar partial
 * banks. A layer section carrying `base: n` is `{...section n, ...itself}`, which is
 * what lets a note edit replace one lane and inherit the rest rather than freezing a
 * copy of every other lane at the moment it was written.
 */
export function resolveSection(bank, idx) {
  const list = bank.sections;
  if (!list || idx == null || idx < 0 || idx >= list.length) return null;
  let cache = RESOLVED.get(list);
  if (!cache) { cache = new Map(); RESOLVED.set(list, cache); }
  if (cache.has(idx)) return cache.get(idx);

  // Walked with a seen-set rather than a depth counter: a section based on itself is
  // a file someone hand-edited, and the honest answer is the section without its
  // base rather than a stack overflow at the first sixteenth of the song.
  const chain = [];
  const seen = new Set();
  let cur = idx;
  while (cur != null && !seen.has(cur) && cur >= 0 && cur < list.length) {
    seen.add(cur);
    const s = list[cur];
    if (!s) break;
    chain.push(s);
    cur = s.base;
  }
  let out = chain[chain.length - 1] || null;
  for (let i = chain.length - 2; i >= 0; i--) out = { ...out, ...chain[i] };
  if (out && 'base' in out) { out = { ...out }; delete out.base; }
  cache.set(idx, out);
  return out;
}

/**
 * A bank with its arrangement layer applied, or the SAME bank object when there is
 * no layer for it.
 *
 * Same object, deliberately: `trackIdOf` is identity-based, so a clone handed back
 * for a song nobody has arranged would lose the song its own mix. It is also what
 * makes an empty ARRANGEMENTS provably a no-op — every song renders the bank it
 * always did, which is what the null test checks.
 */
export function applyArrangement(bank, id, table = ARRANGEMENTS) {
  const entry = bank && id ? table[id] : null;
  if (!entry) return bank;
  const layer = entry.sections || [];
  const order = entry.order;
  // A tempo counts on its own: an entry that says nothing but `bpm: 104` is a song
  // played ten faster than it was written, and returning the bank here would hand
  // back the composed tempo and lose it. A swing counts on its own for exactly the
  // same reason — `{ swing: 62 }` is a song played with a shuffle it was not written
  // with, and it is the only thing many of them will ever say.
  if (!layer.length && !order && entry.bpm == null && entry.swing == null) return bank;
  const out = { ...bank };
  if (entry.bpm != null) out.bpm = entry.bpm;
  if (entry.swing != null) out.swing = entry.swing;
  // Only when there is something to add: a bank with no sections must keep having
  // none, or `songBlocks` starts reading `sections[0]` of an empty list and every
  // block becomes the bare bank by accident rather than on purpose.
  if (layer.length) out.sections = [...(bank.sections || []), ...layer];
  if (order) out.order = order;
  return out;
}

/**
 * What is wrong with an arrangement entry, as a list of sentences — for the desk to
 * show and for the tests to assert on. An empty list means it is playable.
 *
 * Nothing here is enforced at play time: a bad index makes a bar fall back to the
 * bare bank rather than crashing, and silently repairing a file someone hand-edited
 * is how an edit goes missing without a message.
 */
export function arrangementIssues(bank, entry, laneKeys = null) {
  const issues = [];
  if (!entry) return issues;
  const sections = [...(bank.sections || []), ...(entry.sections || [])];
  const order = entry.order || orderOf(bank);
  if (!order.length) issues.push('the order is empty — a song needs at least one bar');
  // A tempo of 0 divides by zero in every seconds-per-step in the engine, and a
  // negative one schedules backwards. Range rather than mere finiteness because this
  // is the one field a hand-edit can put a plausible-looking wrong number in — a
  // millisecond value, say — and 20–400 is what a song can be played at.
  if (entry.bpm != null && !(Number.isFinite(entry.bpm) && entry.bpm >= 20 && entry.bpm <= 400)) {
    issues.push(`the tempo is ${entry.bpm} — a song plays between 20 and 400 bpm`);
  }
  // Below 50 the odd sixteenth would land BEFORE the beat it belongs to, which is not a
  // swing but a lane offset written in the wrong field; at 100 it would land on the next
  // beat exactly and the pair would collapse into one. 75 is the dotted shuffle and the
  // far end of anything anyone plays.
  if (entry.swing != null
    && !(Number.isFinite(entry.swing) && entry.swing >= SWING_STRAIGHT && entry.swing <= SWING_MAX)) {
    issues.push(`the swing is ${entry.swing} — a song swings between ${SWING_STRAIGHT} (straight) and ${SWING_MAX}`);
  }
  if (entry.loop) {
    // Counted with `expandOrder` rather than `barPlan`: lanes.js imports this file, so
    // importing it back for one length would be a cycle. The two agree by construction —
    // barPlan IS expandOrder over the same order.
    const bars = expandOrder(order, !!sections.length).length;
    const { startBar = 1, fromBar = null, toBar = null } = entry.loop;
    const whole = [startBar, fromBar, toBar].filter((n) => n != null);
    if (!whole.every((n) => Number.isInteger(n))) {
      issues.push('the loop is not a set of bar numbers');
    } else if (startBar < 1) {
      issues.push(`the loop starts at bar ${startBar} — bars are counted from 1`);
    } else if ((fromBar == null) !== (toBar == null)) {
      issues.push('the loop names one end of itself and not the other');
    } else if (fromBar != null && fromBar < startBar) {
      issues.push(`the song starts at bar ${startBar} and loops back to bar ${fromBar}, which it never reaches`);
    } else if (fromBar != null && toBar < fromBar) {
      issues.push(`the loop plays bars ${fromBar} to ${toBar}, which is no bars at all`);
    } else if (Math.max(startBar, toBar ?? 0) > bars) {
      issues.push(`the loop ends at bar ${Math.max(startBar, toBar ?? 0)} and the song is ${bars} bars long`);
    }
  }
  order.forEach((e, i) => {
    const s = typeof e === 'number' ? e : e?.s;
    if (typeof s !== 'number' || !Number.isInteger(s)) {
      issues.push(`order[${i}] names no section`);
    } else if (sections.length && (s < 0 || s >= sections.length)) {
      issues.push(`order[${i}] points at section ${s}, and there are ${sections.length}`);
    }
    if (typeof e === 'object' && e) {
      if (e.bars != null && (e.bars < 1 || e.bars > 2)) {
        issues.push(`order[${i}] asks for ${e.bars} bars of a two-bar section`);
      }
      if (e.from != null && e.from !== 0 && e.from !== 1) {
        issues.push(`order[${i}] starts at half ${e.from}`);
      }
      for (const k of e.off || []) {
        if (laneKeys && !laneKeys.includes(k)) issues.push(`order[${i}] silences "${k}", which is not a lane`);
      }
      for (const k of e.delete || []) {
        if (laneKeys && !laneKeys.includes(k)) issues.push(`order[${i}] deletes "${k}", which is not a lane`);
      }
      for (const key of ['transpose', 'offset', 'gain']) {
        const map = e[key];
        if (map == null) continue;
        const values = typeof map === 'number' ? [['all', map]] : Object.entries(map);
        for (const [lane, value] of values) {
          if (lane !== 'all' && laneKeys && !laneKeys.includes(lane)) {
            issues.push(`order[${i}] edits "${lane}", which is not a lane`);
          }
          if (!Number.isFinite(value)) issues.push(`order[${i}] has a non-numeric ${key}`);
        }
      }
    }
  });
  (entry.sections || []).forEach((s, i) => {
    if (s && s.base != null && (s.base < 0 || s.base >= sections.length)) {
      issues.push(`layer section ${i} is based on section ${s.base}, which does not exist`);
    }
  });
  return issues;
}
