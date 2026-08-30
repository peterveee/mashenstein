// What a bar holds, and where a lane's content repeats.
//
// Lifted out of mixer-entry.js: ten pure functions over a bank and an arrangement draft.
// They read a bar's field, decide whether a range agrees about it, lift a lane's share of
// a bar out and put it back, and work out how far a pattern could be replicated before it
// would overwrite something.
//
// Nothing here touches the desk. Every one of them is handed the bank and the draft it
// works on, which is the only reason a file this deep in the arrangement could leave
// without a seam — and what makes them checkable without a browser.

import {
  barCount, readBarLane, writeBarNotes, setLanesOff, setLanesDeleted, transposeBars,
  offsetBars, gainBars, panBars, setBarNoteFx, setBarEffects,
} from './lib/arrangement-edit.js';
import { lenKey } from '../src/engine/lanes.js';

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

/**
 * Everything one lane does in one bar, as a single comparable value.
 *
 * The notes, the lengths that go with them — see copyLaneBars on why those are never
 * left behind — and the bar-level decisions the desk calls EDITS: the mute, the absent
 * flag, the transpose/timing/gain/pan offsets, the Note FX override and the insert
 * snapshot. A bar is all of it. Copying the notes alone would land a figure on
 * whatever mute and arpeggiator the destination happened to be carrying, which plays
 * as neither bar.
 *
 * Read through `readBarLane`, so it is what the bar PLAYS — resolved through the
 * section chain and the bank under it — at the grid the draft is on.
 */
const laneBarPart = (bank, draft, bar, lane) => {
  const entry = draft.plan[bar] || null;
  return {
    notes: readBarLane(bank, draft, bar, lane),
    lengths: readBarLane(bank, draft, bar, lenKey(lane)),
    edits: {
      off: (entry?.off || []).includes(lane),
      delete: (entry?.delete || []).includes(lane),
      transpose: barFieldValue(entry, 'transpose', lane),
      offset: barFieldValue(entry, 'offset', lane),
      gain: barFieldValue(entry, 'gain', lane),
      pan: barFieldValue(entry, 'pan', lane),
      noteFx: entry?.noteFx?.[lane] ?? null,
      inlineFx: entry?.inlineFx?.[lane] ?? null,
    },
  };
};

/** Two bars of one lane, compared as values — chords and length arrays included. */
const sameLaneBarPart = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Is there anything here to lose?
 *
 * A rest is `null` on a pitched lane and `false` on a percussion one, and an empty
 * chord array is a step nobody drew on. Anything else is a note. An edit counts too:
 * a bar muted on this track is a decision somebody made, and replacing it is worth
 * being told about even where there are no notes underneath.
 */
const laneBarHasContent = (part) => part.notes.some((v) => v != null && v !== false
  && !(Array.isArray(v) && !v.length))
  || Object.values(part.edits).some(Boolean);

/**
 * Put a lane's bar down somewhere else, notes and edits together.
 *
 * `current` is what the destination holds now, and it is an optimisation with teeth:
 * every one of these writers copies the WHOLE draft, and the longest song in the game
 * is 290 bars carrying a hundred and forty sections to copy with it. Running all nine
 * per bar when eight of them write the value that is already there cost a fifth of a
 * second of held main thread on that song — which on this desk is a hole in the music,
 * not a slow button. Skip what already agrees; without `current`, write everything.
 */
const writeLaneBarPart = (bank, draft, bar, lane, part, current = null) => {
  const was = current?.edits;
  const now = part.edits;
  const same = (field) => was && JSON.stringify(was[field]) === JSON.stringify(now[field]);
  // Forked, never shared: the bar is written for itself, so laying a figure over bar 9
  // cannot reach back through a shared section into bar 1 — which is behind the
  // selection and explicitly not being replicated over.
  let out = current && JSON.stringify(current.notes) === JSON.stringify(part.notes)
    && JSON.stringify(current.lengths) === JSON.stringify(part.lengths)
    ? draft : writeBarNotes(bank, draft, bar, lane, part.notes, part.lengths);
  if (!same('off')) out = setLanesOff(out, bar, bar, [lane], now.off);
  if (!same('delete')) out = setLanesDeleted(out, bar, bar, [lane], now.delete);
  if (!same('transpose')) out = transposeBars(out, bar, bar, [lane], now.transpose);
  if (!same('offset')) out = offsetBars(out, bar, bar, [lane], now.offset);
  if (!same('gain')) out = gainBars(out, bar, bar, [lane], now.gain);
  if (!same('pan')) out = panBars(out, bar, bar, [lane], now.pan);
  if (!same('noteFx')) out = setBarNoteFx(out, bar, bar, lane, now.noteFx);
  if (!same('inlineFx')) out = setBarEffects(out, bar, bar, lane, now.inlineFx);
  return out;
};

/** Bar numbers as a sentence, with a tail rather than a paragraph of them. */
const barListText = (bars) => {
  const shown = bars.slice(0, 8).map((bar) => bar + 1).join(', ');
  return bars.length > 8
    ? `bars ${shown} and ${bars.length - 8} more`
    : `bar${bars.length === 1 ? '' : 's'} ${shown}`;
};

/**
 * Where a replicate stops: the first bar after the selection that already has
 * something on this lane, or the end of the song if it never hits one.
 *
 * This is the whole idea of the button. A track is not a blank page — it is a part
 * with holes in it, and the hole is what you are pointing at when you ask for a figure
 * to carry on. Bar 3 to bar 20, with bar 20 already written, means bars 4 to 19: the
 * empty run, and not one bar further. What the track does from 20 on was decided by
 * whoever wrote bar 20, and a fill that ran over it would be answering a question
 * nobody asked.
 *
 * The corollary is that the ordinary case has nothing to warn about. There is only one
 * bar of doubt in the whole gesture — the one immediately after the selection — and
 * `replicateLaneBars` is the only thing that ever asks about it.
 */
const replicationStop = (bank, draft, lane, to) => {
  for (let bar = to + 1; bar < barCount(draft); bar++) {
    if (laneBarHasContent(laneBarPart(bank, draft, bar, lane))) return bar;
  }
  return barCount(draft);
};

/**
 * Which bars a replicate would write, up to `until`, and which of them hold something.
 *
 * The source bars repeat end to end and IN PHASE from `to + 1`: a two-bar selection
 * lands 3, 4, 3, 4 and never 3, 4, 4, 3, however far it runs. A destination already
 * playing exactly what it would be given is left out entirely — that is what makes a
 * replicate you ask for twice a no-op rather than a second edit.
 *
 * `clobbered` is only ever non-empty on the overwrite path: the fill stops before the
 * first bar with anything on it, so there is nothing there to count.
 */
const replicationTargets = (bank, draft, lane, from, to, until) => {
  const n = to - from + 1;
  const start = to + 1;
  const source = Array.from({ length: n }, (_, i) => laneBarPart(bank, draft, from + i, lane));
  const targets = [];
  const clobbered = [];
  for (let bar = start; bar < Math.min(until, barCount(draft)); bar++) {
    const part = source[(bar - start) % n];
    const current = laneBarPart(bank, draft, bar, lane);
    if (sameLaneBarPart(current, part)) continue;
    targets.push({ bar, part, current });
    if (laneBarHasContent(current)) clobbered.push(bar);
  }
  return { targets, clobbered };
};

export {
  uniformRegionValue, rangeHasEveryFlag, writeLaneBarPart, barListText,
  replicationStop, replicationTargets,
  // Not called from the desk, but the arrangement suite drives the replication
  // arithmetic through it directly rather than through the button.
  laneBarPart,
};
