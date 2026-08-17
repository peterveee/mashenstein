// The arrangement editing seam: pure functions the desk's bar grid will call.
//
// Nothing here touches the DOM, the engine or a file — it is the shape of an edit,
// so that "duplicate these four bars and drop the kit out of the repeats" is a list
// operation with a test rather than a gesture with a hope.
//
// THE CANONICAL FORM IS ONE ENTRY PER BAR. A draft is
//
//   { plan: [{ sec, half, off }], sections: [...layer sections] }
//
// `plan` is the song as bars, which is what an editor can index, splice and mute.
// Section sharing — `plumber` playing section 0 for its first four bars — is a
// COMPACTION, applied on the way back out to a file (`entryOf`), never something the
// editor has to reason about. That distinction is the whole design: `order` reuses
// sections, so "change bar 3" on the file's own form silently changes bar 1 too.
//
// Two rules everything here obeys:
//
//   1. NEVER MUTATE A BANK, OR ANYTHING IN ONE. Lane arrays are shared by object
//      identity across sections AND across lane keys — in `finale`, one array is on
//      section 2's `hats` and on seven other sections' `ohats`; in `shop`, section 0
//      puts the same array on `lead`, `leadHarm`, `twinkle`, `bass` and `clap`.
//      Writing a note into one would write it into all of them. Every write clones.
//   2. AN EDIT FORKS ONE BAR. Note edits go into a new layer section carrying
//      `base:` — a delta over what the bar already played — and only that bar's plan
//      entry is repointed at it.
//
// Every function returns a NEW draft; none of them modify the one passed in, so the
// desk's undo is a snapshot and nothing more.
import {
  expandOrder, orderOf, resolveSection, BAR_MAPS, SWING_MAX, SWING_STRAIGHT,
  FINE_RESOLUTION, resolutionOf, RESOLUTIONS, LEGACY_RESOLUTION, promoteResolution,
} from '../../src/data/arrangements.js';

/**
 * A resolution worth writing down, or null.
 *
 * The sixteenth grid is the absence of a decision — every bank that has never been near
 * the desk omits the key, and an entry that wrote `resolution: 16` would be claiming a
 * choice nobody made. So only a finer grid is carried, and null means "as composed".
 */
const fineOr = (v) => (RESOLUTIONS.includes(v) && v !== LEGACY_RESOLUTION ? v : null);
import { LANES, LANE_KEYS, lenKey, validLen } from '../../src/engine/lanes.js';
import { createNoteFxProcessor, resolveNoteFx } from '../../src/engine/note-fx.js';

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

// Per-bar edits are deliberately lane-scoped. A number keeps the file compact for
// the common "all lanes" case, while the desk normally writes the explicit map so a
// bass edit cannot accidentally move the lead with it. Timing is measured in 1/32
// notes and may be fractional: +8 is a quarter-note delay, -1 is one 1/32 note early,
// and -0.5 — the desk's smallest step — is a 1/64. Pan is an OFFSET in
// pot units — the number the channel's pan knob shows, -100 to +100 — so a lane
// sitting at +10 with a bar of -20 plays that bar at -10.
//
// The list itself lives with the format (`src/data/arrangements.js`), because the
// engine's expander and the file's validator walk exactly these fields too.
// The other half of a bar's lane-scoped state: which lanes it does not pass on. Both
// lists hold literal lane keys, so anything that adds, removes or copies a lane has to
// walk both of them — see removeLanes and copyLaneArrangement.
const LANE_LISTS = ['off', 'delete'];
const copyBarMaps = (from, to) => {
  for (const key of BAR_MAPS) {
    if (from?.[key] == null) continue;
    if (typeof from[key] === 'number') to[key] = from[key];
    else if (typeof from[key] === 'object') {
      const map = Object.fromEntries(Object.entries(from[key])
        .filter(([, v]) => Number.isFinite(v) && v !== 0));
      if (Object.keys(map).length) to[key] = map;
    }
  }
};
const sameBarMap = (a, b, key) => JSON.stringify(a?.[key] || null) === JSON.stringify(b?.[key] || null);
const copyBar = (bar) => {
  const out = { sec: bar.sec, half: bar.half };
  if (bar.off?.length) out.off = [...bar.off];
  if (bar.delete?.length) out.delete = [...bar.delete];
  if (bar.noteFx && Object.keys(bar.noteFx).length) out.noteFx = clone(bar.noteFx);
  if (bar.inlineFx && Object.keys(bar.inlineFx).length) out.inlineFx = clone(bar.inlineFx);
  copyBarMaps(bar, out);
  return out;
};
const mapEdit = (draft, from, to, keys, field, value) => {
  const [a, b] = range(draft, from, to);
  const out = copy(draft);
  const lanes = [...new Set((keys || []).filter(Boolean))];
  for (let i = a; i <= b; i++) {
    const cur = typeof out.plan[i][field] === 'object' ? { ...out.plan[i][field] } : {};
    for (const k of lanes) {
      if (value == null || value === 0) delete cur[k];
      else cur[k] = value;
    }
    if (Object.keys(cur).length) out.plan[i][field] = cur;
    else delete out.plan[i][field];
  }
  return out;
};

/** The kit, in the order a build-up lets it back in: floor up. */
export const DRUM_LANES = LANES.filter((l) => l.group === 'drums').map((l) => l.key);
const BUILD_ORDER = ['kick', 'hats', 'snare', 'clap', 'ohats', 'rim', 'crash']
  .filter((k) => DRUM_LANES.includes(k));

/**
 * A bank plus its saved arrangement entry (or none) as an editable draft.
 *
 * A song with no `sections` at all — seven of the nine cabinets are a bare two-bar
 * loop — has bars whose `sec` is null: they play the bank itself. Nothing is
 * synthesised here on the way in, because a song that is merely OPENED must compact
 * back to no entry at all, and a placeholder section is a decision in the file about
 * a song nobody touched. The expansion happens on the first edit that needs
 * somewhere to write (`forkBar`), which is the first moment it is true.
 */
export function draftOf(bank, entry = null) {
  const layer = clone(entry?.sections || []);
  const hasSections = !!(bank.sections?.length || layer.length);
  return {
    plan: expandOrder(entry?.order || orderOf(bank), hasSections),
    sections: layer,
    // The tempo the song is played at, as one number beside the bars. Null means "as
    // composed" rather than 120: the bank's own tempo is not the draft's to restate,
    // and `entryOf` compares against it to decide whether there is anything to write.
    bpm: entry?.bpm ?? null,
    // How far off its own grid the song is played, on the same terms as the tempo: null
    // means "as composed" — straight, for every song in the game so far — rather than 50,
    // so `entryOf` can tell a song nobody has swung from one dragged back to straight.
    swing: entry?.swing ?? null,
    // Where the song starts and what it repeats. Carried through untouched rather than
    // edited here: no bar operation in this file has an opinion about it, and this
    // draft is round-tripped through `entryOf` on EVERY edit — so anything not carried
    // is not merely ignored, it is deleted by the next thing anyone does to a bar.
    loop: entry?.loop ? clone(entry.loop) : null,
    // Missing is the old 16-slot format. Once upgraded, a draft stays upgraded even
    // if its last off-grid note is erased: silently compacting it back would make the
    // next 1/32 edit repeatedly reshape every lane and would invalidate undo snapshots.
    // Two deliberate acts do put it back, and neither is silent: leaving the roll's 1/32
    // quantise, and saving. Both go through `normaliseArrangementResolution`, which
    // refuses outright while a single note sits on an odd slot.
    resolution: fineOr(resolutionOf(bank, entry)),
  };
}

/** How many bars the draft plays. */
export const barCount = (draft) => draft.plan.length;

/** The combined section list a draft's `sec` indices address. */
const sectionsOf = (bank, draft) => [...(bank.sections || []), ...draft.sections];

/**
 * Is this section index one of the bank's own — i.e. not ours to write into?
 * A null `sec` is a bar of a sectionless song: the bank itself, and equally not ours.
 */
const isBankSection = (bank, sec) => sec == null || sec < (bank.sections?.length || 0);

/**
 * The sixteen raw values a bar plays on one bank key.
 *
 * Read through the delta chain, then fall through to the bank exactly as the sequencer
 * does: a section that overrides the snare says nothing about the kick, and the kick it
 * plays is the song's. Raw, not coerced — a boolean lane and a melodic one are the same
 * read, and only the caller knows which it wanted.
 *
 * Any key, not just a lane's notes, because a lane's note LENGTHS are read the same way
 * through the same chain.
 *
 * The read half of `laneWith`, which is the write. It lives here rather than in the
 * panel that first needed it because it is the same read anywhere a bar is being
 * edited, and a second copy is where an editor quietly starts reading the ARRANGED
 * bank instead of the written one — a difference only the second edit to a song shows.
 */
export function readBarLane(bank, draft, barIndex, key) {
  const bar = draft?.plan?.[barIndex];
  const slots = resolutionOf(null, draft);
  if (!bar || !bank) return new Array(slots).fill(null);
  const resolved = (bar.sec != null
    ? resolveSection({ ...bank, sections: sectionsOf(bank, draft) }, bar.sec)
    : null) || {};
  const arr = resolved[key] ?? bank[key];
  if (!Array.isArray(arr)) return new Array(slots).fill(null);
  // A fine draft can still inherit a hand-authored coarser lane. Its notes occupy every
  // stride'th slot; the ones between are true rests. A layer written by the fine editor
  // already has a slot per tick and is read directly. Same fold, same guards, as
  // `sequenceValue` in the engine — the two must agree or the roll draws a note the
  // scheduler will not play.
  const laneResolution = arr.length / 2;
  const stride = slots / laneResolution;
  if (arr.length < slots * 2 && Number.isInteger(stride) && RESOLUTIONS.includes(laneResolution)) {
    const at = bar.half * laneResolution;
    return Array.from({ length: slots }, (_, i) => (i % stride ? null : arr[at + i / stride] ?? null));
  }
  const at = bar.half * slots;
  return Array.from({ length: slots }, (_, i) => arr[at + i] ?? null);
}

/**
 * The draft as a file entry — `{ order, sections, bpm, swing, loop }` — or **null**
 * when it says nothing the bank does not already say.
 *
 * Null is the important half: an arrangement nobody changed leaves no entry, the
 * way a mix nobody changed leaves none, so `src/data/arrangements.js` holds
 * decisions rather than a copy of every song's shape.
 *
 * A tempo equal to the bank's own is not a decision either — it is a drag that ended
 * back where it started — so it is dropped here, and a song whose ONLY change is its
 * tempo writes `{ bpm }` alone rather than restating an order identical to the bank's.
 * A swing is dropped on the same test, against straight rather than against a written
 * tempo, because straight is what every song here is composed as.
 */
export function entryOf(bank, draft) {
  const compacted = compactSections(bank, draft);
  const order = planToOrder(compacted.plan);
  const bpm = draft.bpm != null && draft.bpm !== bank.bpm ? draft.bpm : null;
  const composedSwing = bank.swing ?? SWING_STRAIGHT;
  const swing = draft.swing != null && draft.swing !== composedSwing ? draft.swing : null;
  const same = JSON.stringify(order) === JSON.stringify(orderOf(bank));
  const loop = draft.loop || null;
  const resolution = fineOr(draft.resolution);
  // A loop counts on its own, exactly as a tempo does: a song played from bar 5 and
  // repeating bars 8-12 is arranged, even when it plays its sections in the order they
  // were composed in. Without this the markers would be unwritable on the seven songs
  // that are a bare two-bar loop with no order of their own. A swing is the same case
  // and the commonest one of all: shuffling a song is usually the ONLY thing done to it,
  // and `{ swing: 62 }` has to be a whole entry or the drag would not survive a save.
  if (same && !compacted.sections.length) {
    if (bpm == null && swing == null && !loop && resolution == null) return null;
    return {
      ...(bpm == null ? {} : { bpm }),
      ...(swing == null ? {} : { swing }),
      ...(loop ? { loop } : {}),
      ...(resolution == null ? {} : { resolution }),
    };
  }
  const out = { order };
  if (compacted.sections.length) out.sections = compacted.sections;
  if (bpm != null) out.bpm = bpm;
  if (swing != null) out.swing = swing;
  if (loop) out.loop = loop;
  if (resolution != null) out.resolution = resolution;
  return out;
}

// Keys that are not a lane. A section is otherwise a partial bank, so every other array
// on it is a lane's notes or a lane's lengths and is measured in slots. `order` and a
// draft's `plan` are one entry per BAR and pass 64 on any song over thirty bars, which is
// the trap `_wideLaneKeys` names in the engine; counting them made every long song look
// as though it had content between the sixteenths. `plan` is here because these helpers
// are handed a live draft as well as a file entry — see the piano roll's quantise picker.
const NOT_A_LANE = new Set(['order', 'plan', 'sections']);
const laneArrays = function* (obj) {
  for (const [key, value] of Object.entries(obj || {})) {
    if (!NOT_A_LANE.has(key) && Array.isArray(value)) yield [key, value];
  }
};

/**
 * Is a slot occupied? A rest is null; a percussion lane writes `false` for a step it
 * does not strike, and `.` is what `seq` leaves behind for one.
 */
const occupied = (v) => v !== null && v !== undefined && v !== false && v !== '.';

// `fineContent`, `anyFineContent` and `anyWideLane` used to live here. They each asked a
// yes/no question about the 32nd grid — "does anything sound on an ODD slot", "is any
// lane 64 long" — which is the right shape only while there are two grids to choose
// between. With four, the question is not whether a song is fine but HOW fine, so
// `laneNeeds` / `contentNeeds` / `bankFloor` below answer with a resolution instead.

/** A lane array back down to a coarser grid, keeping every `stride`th slot. */
const narrow = (arr, stride = 2) => arr.filter((_, i) => i % stride === 0);

/**
 * Which grids this ONE lane could sit under, as a set.
 *
 * Two ways a lane is compatible with a grid, and the difference is what makes this a set
 * rather than a single number:
 *
 *   · COARSER than the lane — the lane is narrowed onto it, which needs the stride to
 *     divide evenly AND every occupied slot to survive the thinning;
 *   · AT OR FINER than the lane — the lane is left alone and `sequenceValue` folds it on
 *     read, which needs the grid to be a whole multiple of the lane's own.
 *
 * `rewritable` is false for the composition half of a song file, which the desk never
 * rewrites: those lanes can only be folded, never narrowed. That asymmetry is the whole
 * reason a bank can hold an entry off a grid it would otherwise be happy on.
 *
 * A lane whose length is not two bars of a known grid is not ours to judge, so it
 * accepts anything rather than vetoing every option.
 */
function laneTargets(arr, rewritable) {
  const laneRes = arr.length / 2;
  if (!RESOLUTIONS.includes(laneRes)) return new Set(RESOLUTIONS);
  const out = new Set();
  for (const target of RESOLUTIONS) {
    if (target >= laneRes) {
      if (target % laneRes === 0) out.add(target);
      continue;
    }
    if (!rewritable || laneRes % target) continue;
    const stride = laneRes / target;
    let fits = true;
    for (let i = 0; i < arr.length && fits; i++) if (occupied(arr[i]) && i % stride) fits = false;
    if (fits) out.add(target);
  }
  return out;
}

/** Every lane array in an object and its sections. */
const allLanes = function* (obj) {
  for (const o of [obj, ...(obj?.sections || [])]) if (o) yield* laneArrays(o);
};

/**
 * The coarsest grid EVERY lane can live on — the entry's, which may be rewritten, and
 * the bank's, which may not.
 *
 * An intersection rather than an LCM, and that distinction is a bug's worth of
 * difference: the LCM of "this lane wants 16" and "that lane forces 32" is 32, but a
 * 96-slot triplet lane cannot be expressed at 32 at all, and demoting to it leaves a lane
 * whose length and whose flag disagree. Only a grid every lane separately accepts is
 * safe. Null when there is no such grid, meaning "leave it exactly as it is".
 */
function commonResolution(bank, entry) {
  let allowed = new Set(RESOLUTIONS);
  const narrowTo = (set) => { allowed = new Set([...allowed].filter((r) => set.has(r))); };
  for (const [, arr] of allLanes(entry)) narrowTo(laneTargets(arr, true));
  for (const [, arr] of allLanes(bank)) narrowTo(laneTargets(arr, false));
  for (const target of RESOLUTIONS) if (allowed.has(target)) return target;
  return null;
}

/**
 * Drop `resolution: 32` from an entry that never uses it, and narrow its lanes to match.
 *
 * A song is promoted the moment the piano roll's quantise picker is set to 1/32 — it has
 * to be, because a note cannot be placed on a grid that is not drawn. Nothing demoted it
 * again, so picking the fine grid once and not using it left the song fine FOREVER, and
 * that flag is not free: `refreshTransportResolution` reads it as `native-32-step-bank`,
 * which sets `_fineBars` to null and turns off the whole-tick fast path for the whole
 * song. Measured on SMW All Instruments NEWEST — 27 lanes carrying notes, 65 bars, not
 * one note on an odd slot — that was 1,040 extra scheduler passes over two minutes, each
 * running the full bar preamble to find nothing.
 *
 * Deliberately NOT done in `draftOf` or `entryOf`: a draft round-trips through `entryOf`
 * on every single edit, and compacting a live draft would reshape every lane the moment
 * a 1/32 note was erased and invalidate the undo snapshots beside it (see the note on
 * `draftOf`'s `resolution`). A save is the one moment the question is settled, and a
 * demoted file promotes again cleanly the next time the picker is touched.
 *
 * Refuses in the two cases where 32 is load-bearing:
 *
 *   · something is written on an odd slot — the song is genuinely fine;
 *   · the BANK carries a 64-slot lane. The composition is above the desk's marker and is
 *     never rewritten, so its arrays would stay wide while the flag said sixteenths, and
 *     `sequenceValue` would index them directly and play the first bar twice as fast.
 *
 * A track-level 1/32 arpeggiator does NOT block the demotion: it promotes the transport
 * through `trackFine` on its own, independently of the bank's `resolution`.
 *
 * With no bank to check, nothing is demoted — the same answer `_wideLaneKeys` gives when
 * it has not been handed one. A save that cannot see the music does not get to decide
 * how finely that music is written.
 */
export function normaliseArrangementResolution(bank, entry) {
  const stored = entry?.resolution;
  if (!RESOLUTIONS.includes(stored) || stored === LEGACY_RESOLUTION) return entry;
  if (!bank) return entry;
  const need = commonResolution(bank, entry);
  if (need == null || need >= stored) return entry;
  const out = { ...entry };
  if (need === LEGACY_RESOLUTION) delete out.resolution; else out.resolution = need;
  // Only lanes FINER than the target move. A lane already coarser than the song is the
  // ordinary case — a hand-authored sixteenth lane under a triplet arrangement — and
  // `sequenceValue` folds it on read; rewriting it would be churn for no change.
  const narrowed = (obj) => {
    const next = { ...obj };
    for (const [key, arr] of laneArrays(obj)) {
      const laneRes = arr.length / 2;
      if (!RESOLUTIONS.includes(laneRes) || laneRes <= need || laneRes % need) continue;
      next[key] = narrow(arr, laneRes / need);
    }
    return next;
  };
  if (out.sections) out.sections = out.sections.map(narrowed);
  return narrowed(out);
}

/**
 * Play this song at `bpm` — or, with null, at the tempo it was composed at.
 *
 * An arrangement edit like any other, so it lands in the same draft, undoes with the
 * same ⌘Z and is written by the same Save. The clamp is the engine's playable range
 * rather than the desk's drag range: a value typed or restored from a snapshot has to
 * arrive somewhere the sequencer can divide by.
 */
export function setTempo(draft, bpm) {
  const out = copy(draft);
  out.bpm = bpm == null ? null : Math.min(400, Math.max(20, Math.round(bpm)));
  return out;
}

/**
 * Play this song with `swing` — or, with null, straight, on the grid it was written on.
 *
 * The percentage the on-grid sixteenth takes of its pair: 50 is the grid, 66.7 the
 * triplet shuffle, 75 the dotted one. The same kind of edit as the tempo above and it
 * travels the same way — the same draft, the same ⌘Z, the same Save.
 *
 * The clamp is the range the ENGINE can mean, not the range the desk's drag offers.
 * Below straight is a lane offset written in the wrong field, and above the dotted
 * shuffle the odd sixteenth is closer to the next beat than to its own.
 */
export function setSwing(draft, swing) {
  const out = copy(draft);
  out.swing = swing == null
    ? null
    : Math.min(SWING_MAX, Math.max(SWING_STRAIGHT, Math.round(swing)));
  return out;
}

/**
 * Where the song starts and what it repeats — `{ startBar, fromBar, toBar }` in 1-based
 * inclusive bars, or null for the whole form round and round.
 *
 * Clamped to the bars the draft actually has, and in the order the three numbers depend
 * on each other: the start cannot be past the end of the song, the loop cannot begin
 * before the song does — it would never be reached — and it cannot end before it
 * begins. A caller that hands in nonsense gets the nearest thing that plays rather than
 * an exception, because the caller is a number input somebody is still typing in.
 *
 * An arrangement edit like any other: same draft, same ⌘Z, written by the same Save.
 */
export function setSongLoop(draft, loop) {
  const out = copy(draft);
  const bars = out.plan.length;
  if (!loop || !bars) { out.loop = null; return out; }
  const whole = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.round(n)));
  const startBar = whole(loop.startBar ?? 1, 1, bars);
  if (loop.fromBar == null || loop.toBar == null) {
    out.loop = startBar === 1 ? null : { startBar };
    return out;
  }
  const fromBar = whole(loop.fromBar, startBar, bars);
  const toBar = whole(loop.toBar, fromBar, bars);
  out.loop = { ...(startBar === 1 ? {} : { startBar }), fromBar, toBar };
  return out;
}

/**
 * Bars back into order entries, folding what can be folded.
 *
 * Two bars of the same section, in their natural order, with the same mute mask
 * become one entry — and with no mask at all, a plain number, which is what every
 * hand-written song is already made of. So a file the desk has been through reads
 * like a file a person wrote, and a song that only had bars muted keeps its shape.
 */
export function planToOrder(plan) {
  const order = [];
  const sameOff = (a, b) => JSON.stringify(a?.off || null) === JSON.stringify(b?.off || null)
    && JSON.stringify(a?.delete || null) === JSON.stringify(b?.delete || null)
    && JSON.stringify(a?.noteFx || null) === JSON.stringify(b?.noteFx || null)
    && JSON.stringify(a?.inlineFx || null) === JSON.stringify(b?.inlineFx || null)
    && BAR_MAPS.every((key) => sameBarMap(a, b, key));
  const addBarBits = (e, bar) => {
    if (bar.off?.length) e.off = [...bar.off];
    if (bar.delete?.length) e.delete = [...bar.delete];
    if (bar.noteFx && Object.keys(bar.noteFx).length) e.noteFx = clone(bar.noteFx);
    if (bar.inlineFx && Object.keys(bar.inlineFx).length) e.inlineFx = clone(bar.inlineFx);
    copyBarMaps(bar, e);
    return e;
  };
  for (let i = 0; i < plan.length; i++) {
    const bar = plan[i];
    const next = plan[i + 1];
    const pairs = next && next.sec === bar.sec && bar.half === 0 && next.half === 1
      && sameOff(bar, next);
    if (pairs) {
      // `sec` is null on a song with no sections, where the order has always been a
      // list of zeroes the engine never looks up. It writes back out as one.
      if (!bar.off?.length && !bar.delete?.length
          && !bar.noteFx
          && !bar.inlineFx
          && BAR_MAPS.every((key) => bar[key] == null)) order.push(bar.sec ?? 0);
      else order.push(addBarBits({ s: bar.sec ?? 0 }, bar));
      i++;
      continue;
    }
    order.push(addBarBits({ s: bar.sec ?? 0, bars: 1, ...(bar.half ? { from: bar.half } : {}) }, bar));
  }
  return order;
}

// ---- arrangement edits: what plays where -------------------------------------

// Every edit below builds its result with this, which is why the tempo is carried
// here rather than by each of them: a bar edit made after a tempo change must not
// quietly put the song back to the tempo it was composed at.
// Every edit in this file goes through here, and it rebuilds the draft from the keys it
// knows rather than spreading — deliberately, so a stray key cannot ride along inside an
// edit. That means anything genuinely part of a draft has to be named here as well as in
// `draftOf`, or it survives being read and not being edited: set a loop, move a bar, and
// the loop is gone.
const copy = (draft) => ({
  plan: draft.plan.map(copyBar), sections: clone(draft.sections), bpm: draft.bpm ?? null,
  swing: draft.swing ?? null, loop: clone(draft.loop ?? null),
  resolution: fineOr(draft.resolution),
});
const range = (draft, from, to) => {
  const a = Math.max(0, Math.min(from, to));
  const b = Math.min(draft.plan.length - 1, Math.max(from, to));
  return [a, b];
};

/**
 * Silence lanes across a range of bars, or let them back in.
 *
 * The mute mask is per bar and lives on the arrangement, not on the notes: the bank
 * keeps playing what it was written to play, and this bar simply does not pass some
 * of it on. That is why it costs one array on one order entry and reverts to nothing.
 */
export function setLanesOff(draft, from, to, keys, off = true) {
  const [a, b] = range(draft, from, to);
  const out = copy(draft);
  for (let i = a; i <= b; i++) {
    const cur = new Set(out.plan[i].off || []);
    for (const k of keys) { if (off) cur.add(k); else cur.delete(k); }
    if (cur.size) out.plan[i].off = [...cur].sort();
    else delete out.plan[i].off;
  }
  return out;
}

/** Mark lanes absent for a bar without destroying their authored notes. */
export const setLanesDeleted = (draft, from, to, keys, deleted = true) => {
  const [a, b] = range(draft, from, to);
  const out = copy(draft);
  for (let i = a; i <= b; i++) {
    const cur = new Set(out.plan[i].delete || []);
    for (const k of keys || []) { if (deleted) cur.add(k); else cur.delete(k); }
    if (cur.size) out.plan[i].delete = [...cur].sort();
    else delete out.plan[i].delete;
  }
  return out;
};

/**
 * Give a duplicated lane the arrangement its source is playing.
 *
 * The NOTES come across on their own: deskBank materialises a layer as the very array
 * its source plays, so a note deleted in the editor is already gone from the copy and
 * stays gone. The per-BAR decisions do not — the mute mask, the absent-lane mask and
 * the transpose/offset/gain maps are all keyed by the literal lane name, and a new key
 * appears in none of them. A duplicate of a bass that drops out for the middle eight
 * therefore played straight through it, which is not a duplicate of anything: the two
 * strips were audibly different parts from the moment the copy was made.
 *
 * Copied, not shared. The copy gets its own row in the grid with its own mute on every
 * bar of it — that is what a second strip is for, and dropping the source out while the
 * layer carries the bar is a real arrangement move. What it starts from is what the
 * source sounds like at the moment it is made.
 *
 * A bar-wide number in a BAR_MAP applies to everything in the bar, the new lane
 * included, so there is nothing to copy there; only the explicit per-lane maps.
 *
 * Not `copyLaneBars`, which reads a lane's NOTES out of a bar range for the clipboard.
 * This one never touches a note.
 */
export function copyLaneArrangement(draft, from, to) {
  if (!draft || !from || !to || from === to) return draft;
  // Most duplicates are of a lane no bar has anything to say about. Hand the draft
  // straight back for those, the way removeLanes does: `copy` would otherwise return a
  // new object that is not a new arrangement, and the desk writes what it is handed —
  // so duplicating a track on an unarranged song would give it an arrangement entry.
  const names = (bar) => LANE_LISTS.some((field) => bar[field]?.includes(from))
    || BAR_MAPS.some((field) => Number.isFinite(bar[field]?.[from]))
    || bar.noteFx?.[from] != null || bar.inlineFx?.[from] != null;
  if (!draft.plan?.some(names)) return draft;
  const out = copy(draft);
  for (const bar of out.plan) {
    for (const field of LANE_LISTS) {
      if (!bar[field]?.includes(from)) continue;
      bar[field] = [...new Set([...bar[field], to])].sort();
    }
    for (const field of BAR_MAPS) {
      const map = bar[field];
      if (map == null || typeof map !== 'object') continue;
      if (Number.isFinite(map[from])) map[to] = map[from];
    }
    if (bar.noteFx?.[from] != null) {
      bar.noteFx = { ...bar.noteFx, [to]: clone(bar.noteFx[from]) };
    }
    if (bar.inlineFx?.[from] != null) {
      bar.inlineFx = { ...bar.inlineFx, [to]: clone(bar.inlineFx[from]) };
    }
  }
  return out;
}

/**
 * Snapshot one lane's complete musical content under another key.
 *
 * A duplicated track must stop depending on its source the instant it is made: later
 * erasing, drawing or resizing notes on either strip cannot reach across to the other.
 * The mix marks the new lane `independent`; this function supplies the other half of
 * that contract by materialising every played bar (notes and per-note lengths) into
 * arrangement-owned sections, then copying the lane-scoped bar decisions as values.
 *
 * Read every bar from the original draft while writes accumulate in a separate draft.
 * That matters for repeated and delta-based sections, and also makes a duplicate of a
 * duplicate capture what that exact row plays rather than its engine-family fallback.
 */
export function duplicateLaneContent(bank, draft, from, to) {
  if (!bank || !draft || !from || !to || from === to) return draft;
  const source = draft;
  let out = copyLaneArrangement(source, from, to);
  for (let bar = 0; bar < source.plan.length; bar++) {
    // Preserve the source's pattern sharing while filling both halves. Forking each
    // bar separately creates a run of one-bar sections; although the arrangement
    // format can describe those, the live Mixer treats the ordinary musical unit as
    // a two-bar pattern and the copy can surface as only every second bar. A shared
    // write repoints every occurrence once, then the other half completes that same
    // private destination section.
    out = writeBarNotesShared(bank, out, bar, to,
      readBarLane(bank, source, bar, from),
      readBarLane(bank, source, bar, lenKey(from)));
  }
  return out;
}

/**
 * Remove lanes that no longer exist from every part of an arrangement draft.
 *
 * Independent percussion channels own their notes, unlike an ordinary layer that
 * doubles its source. Deleting one therefore has to remove both its layer definition
 * from the mix and its note deltas here. Leaving the latter behind makes the sound
 * reappear if the same generated lane key is added later.
 */
// `keys` is anything you can iterate — the caller in the desk already holds the lane
// and its layers as a Set, and a `.filter` on that throws where an array would not.
// The whole of Delete track lives downstream of this call, so the failure was the
// track staying on screen with nothing to say why.
export function removeLanes(draft, keys) {
  const drop = new Set([...(keys || [])].filter(Boolean));
  if (!drop.size) return draft;
  const out = copy(draft);
  for (const section of out.sections) {
    // The lengths go with the lane, or deleting a track and adding it back gives the
    // new one the old one's note lengths — for notes that are not there any more.
    for (const key of drop) { delete section[key]; delete section[lenKey(key)]; }
  }
  for (const bar of out.plan) {
    for (const field of LANE_LISTS) {
      if (!bar[field]) continue;
      bar[field] = bar[field].filter((key) => !drop.has(key));
      if (!bar[field].length) delete bar[field];
    }
    for (const field of BAR_MAPS) {
      if (!bar[field] || typeof bar[field] !== 'object') continue;
      for (const key of drop) delete bar[field][key];
      if (!Object.keys(bar[field]).length) delete bar[field];
    }
    if (bar.noteFx) {
      for (const key of drop) delete bar.noteFx[key];
      if (!Object.keys(bar.noteFx).length) delete bar.noteFx;
    }
    if (bar.inlineFx) {
      for (const key of drop) delete bar.inlineFx[key];
      if (!Object.keys(bar.inlineFx).length) delete bar.inlineFx;
    }
  }
  return out;
}

/** Set one lane's nondestructive Note FX override across a bar range. */
export function setBarNoteFx(draft, from, to, lane, override = null) {
  if (!draft || !lane) return draft;
  const [a, b] = range(draft, from, to);
  const out = copy(draft);
  for (let i = a; i <= b; i++) {
    const map = { ...(out.plan[i].noteFx || {}) };
    if (!override || override.mode === 'inherit') delete map[lane];
    else map[lane] = clone(override);
    if (Object.keys(map).length) out.plan[i].noteFx = map;
    else delete out.plan[i].noteFx;
  }
  return out;
}

/** Snapshot an insert chain onto one lane in a range of bars. */
export function setBarEffects(draft, from, to, lane, list = null) {
  if (!draft || !lane) return draft;
  const [a, b] = range(draft, from, to);
  const out = copy(draft);
  const chain = Array.isArray(list) ? clone(list.slice(0, 6)) : null;
  for (let i = a; i <= b; i++) {
    const map = { ...(out.plan[i].inlineFx || {}) };
    if (!chain?.length) delete map[lane]; else map[lane] = clone(chain);
    if (Object.keys(map).length) out.plan[i].inlineFx = map;
    else delete out.plan[i].inlineFx;
  }
  return out;
}

/** Transpose one lane or a group of lanes by semitones over a bar range. */
export const transposeBars = (draft, from, to, keys, semitones) =>
  mapEdit(draft, from, to, keys, 'transpose', Number.isFinite(+semitones) ? +semitones : 0);

/** Move a lane's notes in 1/32-note units — halves allowed — over a bar range. */
export const offsetBars = (draft, from, to, keys, units) =>
  mapEdit(draft, from, to, keys, 'offset', Number.isFinite(+units) ? +units : 0);

/** Apply a relative gain in dB to a lane over a bar range. */
export const gainBars = (draft, from, to, keys, db) =>
  mapEdit(draft, from, to, keys, 'gain', Number.isFinite(+db) ? +db : 0);

/**
 * Shift a lane's PAN over a bar range, in the pot's own units.
 *
 * An offset, never a position, and that is the whole design: the channel's knob still
 * says where the instrument lives in the room, and the bar says how far this bar moves
 * from there. A lane panned +10 with a bar offset of -20 plays that bar at -10, and
 * re-panning the channel later carries every bar edit along with it rather than
 * stranding them against a position that no longer exists.
 *
 * Clamped to the pot's own range so a bar cannot ask for somewhere there is no speaker;
 * the SUM is clamped again in the mixer, which is where the channel's own pan is known.
 */
export const panBars = (draft, from, to, keys, units) =>
  mapEdit(draft, from, to, keys, 'pan',
    Number.isFinite(+units) ? Math.max(-100, Math.min(100, Math.round(+units))) : 0);

/** Copy a complete structural bar range, including any song-owned note sections. */
export function copyBars(bank, draft, from, to) {
  const [a, b] = range(draft, from, to);
  const base = bank.sections?.length || 0;
  const bars = draft.plan.slice(a, b + 1).map(copyBar);
  const used = [...new Set(bars.map((bar) => bar.sec).filter((sec) => sec != null && sec >= base))];
  const remap = new Map(used.map((sec, i) => [sec, base + i]));
  for (const bar of bars) if (remap.has(bar.sec)) bar.sec = remap.get(bar.sec);
  return { bars, sections: used.map((sec) => clone(draft.sections[sec - base])) };
}

/** Paste copied structural bars at a bar boundary, preserving section deltas. */
export function pasteBars(bank, draft, at, clip, times = 1) {
  if (!clip?.bars?.length) return copy(draft);
  const out = copy(draft);
  const index = Math.max(0, Math.min(out.plan.length, at));
  const base = bank.sections?.length || 0;
  const pasted = [];
  for (let t = 0; t < Math.max(1, times); t++) {
    const layerMap = new Map();
    const sectionStart = base + out.sections.length;
    for (let i = 0; i < (clip.sections || []).length; i++) layerMap.set(base + i, sectionStart + i);
    const sections = clone(clip.sections || []);
    for (const sec of sections) if (sec?.base != null && layerMap.has(sec.base)) sec.base = layerMap.get(sec.base);
    out.sections.push(...sections);
    pasted.push(...clip.bars.map((bar) => {
      const next = copyBar(bar);
      if (layerMap.has(next.sec)) next.sec = layerMap.get(next.sec);
      return next;
    }));
  }
  out.plan.splice(index, 0, ...pasted);
  return out;
}

/** Insert bars of silence, retaining the section identity but muting every lane. */
export function insertSilence(draft, at, count, keys = LANE_KEYS) {
  const out = copy(draft);
  const n = Math.max(1, Math.floor(count || 1));
  const index = Math.max(0, Math.min(out.plan.length, at));
  const template = out.plan[Math.min(index, out.plan.length - 1)] || { sec: null, half: 0 };
  const bars = Array.from({ length: n }, (_, i) => ({
    sec: template.sec ?? null,
    half: (template.half + i) % 2,
    delete: [...keys].sort(),
  }));
  out.plan.splice(index, 0, ...bars);
  return out;
}

/**
 * Read one lane's sixteen steps for every bar in a range, ready for cross-lane paste.
 *
 * The note LENGTHS come with them, and they have to: a clip carrying notes alone
 * would land on whatever lengths the destination bars already had, so pasting a
 * bassline over a part somebody had drawn long notes into would play the new notes
 * at the old one's lengths. Always present, so a paste always says something about
 * length — sixteen nulls where the source had none, which clears the destination.
 */
export function copyLaneBars(bank, draft, from, to, lane) {
  const [a, b] = range(draft, from, to);
  const sections = sectionsOf(bank, draft);
  const bars = [];
  const lengths = [];
  for (let i = a; i <= b; i++) {
    const bar = draft.plan[i];
    const sec = bar.sec != null ? resolveSection({ ...bank, sections }, bar.sec) : null;
    const read = (key) => {
      const arr = sec?.[key] ?? bank[key];
      return Array.from({ length: 16 }, (_, j) => clone(arr?.[bar.half * 16 + j] ?? null));
    };
    bars.push(read(lane));
    lengths.push(read(lenKey(lane)));
  }
  return { lane, bars, lengths };
}

/**
 * Snapshot one lane as a complete track clip.
 *
 * Notes alone are not a track: the lane can be muted, transposed, nudged, gained,
 * panned, or have a bar-level Note FX/effect override. Keep those decisions beside
 * the resolved notes so a track can be pasted as a new independent lane, including
 * when the destination is a different song with a different section table.
 */
export function copyLaneTrack(bank, draft, from, to, lane) {
  const [a, b] = range(draft, from, to);
  const bars = [];
  const lengths = [];
  const edits = [];
  for (let i = a; i <= b; i++) {
    const bar = draft.plan[i];
    bars.push(readBarLane(bank, draft, i, lane).map(clone));
    lengths.push(readBarLane(bank, draft, i, lenKey(lane)).map(clone));
    const edit = {};
    for (const field of LANE_LISTS) {
      if (bar[field]?.includes(lane)) edit[field] = true;
    }
    for (const field of BAR_MAPS) {
      const value = typeof bar[field] === 'number' ? bar[field] : bar[field]?.[lane];
      if (Number.isFinite(value) && value !== 0) edit[field] = value;
    }
    if (bar.noteFx?.[lane] != null) edit.noteFx = clone(bar.noteFx[lane]);
    if (bar.inlineFx?.[lane] != null) edit.inlineFx = clone(bar.inlineFx[lane]);
    edits.push(edit);
  }
  return { lane, bars, lengths, edits };
}

/** Paste a complete track clip onto a fresh lane without changing song length. */
export function pasteLaneTrack(bank, draft, at, lane, clip) {
  if (!bank || !draft || !lane || !clip?.bars?.length) return draft;
  const start = Math.max(0, Math.floor(at));
  const count = Math.min(clip.bars.length, Math.max(0, draft.plan.length - start));
  // A clip's bars were copied at some grid and must be pasted at one that can hold them.
  const clipGrid = promoteResolution(...clip.bars.map((bar) => (
    RESOLUTIONS.includes(bar.length) ? bar.length : LEGACY_RESOLUTION)));
  const pasteAt = promoteResolution(resolutionOf(null, draft), clipGrid);
  let out = pasteAt !== resolutionOf(null, draft)
    ? { ...copy(draft), resolution: pasteAt } : draft;
  for (let i = 0; i < count; i++) {
    const bar = start + i;
    out = writeBarNotesShared(bank, out, bar, lane, clip.bars[i], clip.lengths?.[i] || null);
    const edit = clip.edits?.[i] || {};
    out = setLanesOff(out, bar, bar, [lane], !!edit.off);
    out = setLanesDeleted(out, bar, bar, [lane], !!edit.delete);
    for (const [field, writer] of [
      ['transpose', transposeBars], ['offset', offsetBars],
      ['gain', gainBars], ['pan', panBars],
    ]) {
      out = writer(out, bar, bar, [lane], edit[field] || 0);
    }
    out = setBarNoteFx(out, bar, bar, lane, edit.noteFx || null);
    out = setBarEffects(out, bar, bar, lane, edit.inlineFx || null);
  }
  return out;
}

/** Move or copy a lane's note bars onto another lane without changing song length. */
export function moveLaneBars(bank, draft, from, to, sourceLane, targetLane, targetAt, {
  copy: shouldCopy = false,
} = {}) {
  const clip = copyLaneBars(bank, draft, from, to, sourceLane);
  const count = clip.bars.length;
  const start = Math.max(0, Math.min(draft.plan.length - count, Math.floor(targetAt)));
  if (!count || (sourceLane === targetLane && start === from)) return copy(draft);
  let out = copy(draft);
  if (!shouldCopy) {
    const rest = Array.from({ length: 16 }, () => null);
    for (let i = from; i <= to; i++) out = writeBarNotes(bank, out, i, sourceLane, rest, rest);
  }
  for (let i = 0; i < count; i++) {
    out = writeBarNotes(bank, out, start + i, targetLane, clip.bars[i], clip.lengths[i]);
  }
  return out;
}

/** Every lane off, for a breakdown that keeps its bar count. */
export const silenceBars = (draft, from, to, keys = LANE_KEYS) => setLanesOff(draft, from, to, keys, true);

/**
 * Take bars out of the song. Everything after moves earlier and the song gets
 * shorter — the other half of "delete", the one that is a cut rather than a rest.
 *
 * A song needs at least one bar: `scheduleStep` indexes `plan[n % plan.length]`, so
 * an empty plan is a division by zero, silence, and a playhead reading NaN. The last
 * bar is refused rather than allowed to produce that.
 */
export function deleteBars(draft, from, to) {
  const [a, b] = range(draft, from, to);
  if (b - a + 1 >= draft.plan.length) return { ...copy(draft), refused: 'a song needs at least one bar' };
  const out = copy(draft);
  out.plan.splice(a, b - a + 1);
  return out;
}

/** The build-up workhorse: the range again, immediately after itself. */
export function duplicateBars(draft, from, to, times = 1) {
  const [a, b] = range(draft, from, to);
  const out = copy(draft);
  const block = out.plan.slice(a, b + 1);
  const repeats = [];
  for (let t = 0; t < times; t++) repeats.push(...clone(block));
  out.plan.splice(b + 1, 0, ...repeats);
  return out;
}

/**
 * Repeat a range and let the kit back in across the repeats — the move that is
 * currently hand-typed into an order array.
 *
 * The build-up is AUTHORITATIVE over the lanes it is given: on each pass the ones
 * that have arrived play and the rest do not, whatever those bars said before. That
 * is the whole gesture — you select bars, often bars you have just silenced, and ask
 * for the kit to come in over them. An earlier version only ever added to the mute
 * mask, so building up over a silenced range left everything silent for every pass
 * and the "build-up" was sixteen bars of nothing.
 *
 * Lanes NOT in the list keep whatever they had: a build-up is about the kit, and the
 * pad you muted in bar 7 is not part of the question.
 */
export function buildUp(draft, from, to, passes = 4, lanes = BUILD_ORDER) {
  const [a, b] = range(draft, from, to);
  const width = b - a + 1;
  const out = copy(draft);
  const block = out.plan.slice(a, b + 1);
  const built = [];
  for (let p = 0; p < passes; p++) {
    // Lane i arrives on the pass where it has earned its place: the first pass holds
    // lanes[0] alone, the last holds all of them.
    const admitted = new Set(lanes.slice(0, Math.max(1, Math.round(((p + 1) / passes) * lanes.length))));
    for (const bar of clone(block)) {
      const off = new Set(bar.off || []);
      for (const k of lanes) { if (admitted.has(k)) off.delete(k); else off.add(k); }
      if (off.size) bar.off = [...off].sort(); else delete bar.off;
      built.push(bar);
    }
  }
  out.plan.splice(a, width, ...built);
  return out;
}

/** A breakdown is a build-up read backwards: the full kit first, thinning out. */
export function breakdown(draft, from, to, passes = 4, lanes = BUILD_ORDER) {
  const [a, b] = range(draft, from, to);
  const width = (b - a + 1) * passes;
  const out = buildUp(draft, from, to, passes, lanes);
  // Reversed a pass at a time, not a bar at a time: a two-bar phrase played
  // backwards is a different phrase, and only the order of the passes is the point.
  const grown = out.plan.slice(a, a + width);
  const size = b - a + 1;
  const passesOut = [];
  for (let p = passes - 1; p >= 0; p--) passesOut.push(...grown.slice(p * size, (p + 1) * size));
  out.plan.splice(a, width, ...passesOut);
  return out;
}

// ---- the note-writing seam ---------------------------------------------------
//
// Not exposed on the desk yet: the piano roll is read-only and MIDI import mints a
// whole song. Both land here, which is why it is built and tested now — they are the
// same write path, and it is the path with the traps in it.

/**
 * Give one bar a layer section of its own, and point only that bar at it.
 *
 * `plumber` plays section 0 for its first four bars, so editing "bar 3" without this
 * edits bars 1, 2 and 4 as well. The fork is a delta — `{ base: 0 }` — so every lane
 * the edit does not name goes on inheriting rather than being frozen as a copy.
 */
/**
 * Give a sectionless song a section to be edited against.
 *
 * Seven cabinets are a bare two-bar loop, and their bars carry `sec: null` — they
 * play the bank. The moment one of those bars is written into, the OTHERS need an
 * index of their own: they are written to the file as numbers, and a number that
 * means "no section" and a number that means "the section I just edited" cannot both
 * be 0. So an identity section — `{}`, which merges over the bank and changes
 * nothing — is materialised for them, once, on the first edit that needs it.
 *
 * It compacts straight back out again if the edit is undone (`compactSections`).
 */
function expandSectionless(bank, draft) {
  if (bank.sections?.length) return draft;
  if (!draft.plan.some((b) => b.sec == null)) return draft;
  const out = copy(draft);
  const idx = out.sections.length;
  out.sections.push({});
  for (const bar of out.plan) if (bar.sec == null) bar.sec = idx;
  return out;
}

/**
 * A layer section as a delta over the BANK, carrying its own overrides with it.
 *
 * `base:` may only ever point into the bank, and this is what enforces it. A bank
 * section is a fixed thing — nothing on the desk can write into one — so a delta over
 * it means exactly what it says for as long as the song exists. A delta over another
 * LAYER section is a delta over something still being edited, and it inherits every
 * later edit to it: fork bar 26 off the loop bar 4 is playing, then edit bar 4, and
 * bar 26 quietly changes too. That is a note appearing in a bar nobody touched, and on
 * an imported song — where the lanes live only in sections and there is no bank part
 * underneath to fall back to — the same chain is how a whole track can vanish.
 *
 * So a fork off a layer section copies that section's overrides in as literals and
 * bases itself on whatever the section ultimately extends. The bar keeps precisely
 * what it was playing, and from then on it is its own: an edit to the bar it was
 * forked from stops reaching it, which is what forking a bar means.
 */
function detachedFrom(bank, sections, sec) {
  const base = bank.sections?.length || 0;
  // Down the chain to the bank section underneath — or to nothing, which is what a
  // sectionless song's identity section extends.
  const chain = [];
  const seen = new Set();
  let cur = sec;
  while (cur != null && cur >= base && !seen.has(cur)) {
    seen.add(cur);
    const s = sections[cur];
    if (!s) break;
    chain.push(s);
    cur = s.base;
  }
  // Base first, so the section reads in the file the way every other one does.
  const out = cur != null && cur < base ? { base: cur } : {};
  // Nearest last: a section's own keys win over the ones it inherited.
  for (let i = chain.length - 1; i >= 0; i--) {
    for (const [k, v] of Object.entries(chain[i])) if (k !== 'base') out[k] = clone(v);
  }
  return out;
}

/**
 * Is another section a delta over this one?
 *
 * Nothing the seam writes makes one of these any more — see `detachedFrom` — but every
 * arrangement saved before that rule has them, and a section with a dependent is a
 * section that cannot be written in place: the write lands in a bar the gesture never
 * named. So it counts as shared, and the bar forks instead.
 */
const hasDependents = (draft, sec) => sec != null
  && draft.sections.some((s) => s?.base === sec);

export function forkBar(bank, draft, barIndex) {
  const out = expandSectionless(bank, copy(draft));
  const bar = out.plan[barIndex];
  if (!bar) return out;
  const all = sectionsOf(bank, out);
  // Already ours AND nobody else's — nothing to fork.
  const shared = out.plan.some((b, i) => i !== barIndex && b.sec === bar.sec)
    || hasDependents(out, bar.sec);
  if (!isBankSection(bank, bar.sec) && !shared) return out;
  // A bar of a sectionless song is based on nothing: the sequencer merges a section
  // over the bank, so a layer section with no `base` already inherits every lane the
  // song has. This is the auto-expansion — invisible, and only on the first edit
  // that needs it.
  out.sections.push(bar.sec == null ? {}
    : isBankSection(bank, bar.sec) ? { base: bar.sec }
      : detachedFrom(bank, all, bar.sec));
  bar.sec = all.length;
  return out;
}

/**
 * The 32 steps a lane holds once `steps16` has gone into one half of it.
 *
 * Everything NOT being written is cloned out of what the bar plays now — resolved
 * through the delta chain and the bank beneath it — because that array is very
 * likely the same object as some other section's, and on some other lane besides.
 *
 * A section override replaces the WHOLE lane; the format has no half-lane. So
 * writing the second bar of a section also freezes the first bar's half of that lane
 * as a literal. It is inaudible — those sixteen values are copied verbatim — and only
 * shows if the bank's own line for the lane is hand-edited afterwards, at which point
 * these bars go on playing what they were given.
 */
function laneWith(bank, sections, sec, half, lane, steps) {
  const resolved = resolveSection({ ...bank, sections }, sec) || {};
  const current = resolved[lane] ?? bank[lane];
  // The incoming bar's length IS the grid being written at — the caller read it out of
  // the same draft through `readBarLane`.
  const slots = RESOLUTIONS.includes(steps.length) ? steps.length : LEGACY_RESOLUTION;
  const laneResolution = Array.isArray(current) ? current.length / 2 : slots;
  const stride = slots / laneResolution;
  const fold = Array.isArray(current) && current.length < slots * 2
    && Number.isInteger(stride) && RESOLUTIONS.includes(laneResolution);
  const next = Array.from({ length: slots * 2 }, (_, i) => {
    if (!Array.isArray(current)) return null;
    if (fold) return i % stride ? null : clone(current[i / stride] ?? null);
    return clone(current[i] ?? null);
  });
  for (let i = 0; i < slots; i++) next[half * slots + i] = clone(steps[i] ?? null);
  return next;
}

/**
 * Put the notes AND their lengths into a section, in one operation.
 *
 * Two keys, written together, because a section holding new notes against old
 * lengths is a section that plays a chord whose top note is four steps long
 * because the note that used to be there was. Nothing may observe that state, not
 * even between two statements — so both are computed and both are assigned here,
 * or the lengths key is removed.
 *
 * `lengths16` is optional and usually absent: a drum grid, a groove figure and a
 * pasted clip all say nothing about length. Absent means "leave the lengths as
 * they are" — which for every song in the game is "there are none".
 *
 * An all-null result DELETES the key rather than writing 32 nulls. Three reasons,
 * and the first is the one that matters: with no key at all the engine takes the
 * path it took before per-note lengths existed, and tests/null-test.js stays
 * sample-exact. `compactSections` cannot drop it for us — it only removes keys
 * equal to what is inherited, and `undefined` never equals an array — so the file
 * would silt up with `bassLen: [null × 32]` on every song anybody drew a note in.
 */
function putLane(section, bank, sections, sec, half, lane, steps16, lengths16) {
  section[lane] = laneWith(bank, sections, sec, half, lane, steps16);
  if (!lengths16) return;
  const key = lenKey(lane);
  const next = laneWith(bank, sections, sec, half, key, lengths16);
  if (next.some((v) => (Array.isArray(v) ? v.some(validLen) : validLen(v)))) section[key] = next;
  else delete section[key];
}

/**
 * Write sixteen steps of one lane into one bar.
 *
 * The bar forks first, then the lane is rebuilt as a fresh 32-step array — the bar
 * being written takes the new steps, its other half keeps what it played — and only
 * then does anything land in the draft. `steps16` is whatever the lane holds:
 * `true` for a percussion hit, a frequency, an array of them for a chord, `null` for
 * a rest. A drum grid should pass `false` rather than `null` for a step that is off,
 * so the lane stays all-boolean and writes back out as `seq(...)` shorthand.
 *
 * `lengths16` is the same sixteen steps as note LENGTHS, in steps — a number, an
 * array of them on a chord lane (one per tone, aligned with the frequencies), or
 * null for "as long as the lane says". Omit it entirely and the lengths are left
 * alone; it is a sixth positional argument rather than a change of shape because
 * every caller that has nothing to say about length should not have to say it.
 */
export function writeBarNotes(bank, draft, barIndex, lane, steps16, lengths16 = null) {
  const forked = forkBar(bank, draft, barIndex);
  const bar = forked.plan[barIndex];
  if (!bar) return forked;
  const idx = bar.sec - (bank.sections?.length || 0);
  putLane(forked.sections[idx], bank, sectionsOf(bank, forked), bar.sec, bar.half,
    lane, steps16, lengths16);
  return forked;
}

/**
 * Materialise an arpeggiator into ordinary 1/32-capable notes.
 *
 * The processor is walked from the beginning of the song so continuous/latching
 * patterns arrive in the selected range in the same state as live playback. Only the
 * selected bars are written.
 *
 * A rendered bar must not be arpeggiated a second time, and the old guarantee was an
 * `arp: { enabled: false }` override stamped on every one of them. That stamp lies in
 * the grid: a bar carrying it wears an NFX badge for an effect it no longer has. So a
 * stamp is written only where it changes what the bar plays. `trackArpCleared` is how
 * a whole-song render says the caller is about to retire the track arpeggiator itself —
 * with the arp gone from the track there is nothing left to suppress, and the bars
 * inherit clean.
 */
export function renderArpToNotes(bank, draft, from, to, lane, trackNoteFx = {},
  { trackArpCleared = false } = {}) {
  if (!bank || !draft || !lane) return draft;
  const [a, b] = range(draft, from, to);
  let source = copy(draft);
  // The arp's finest rate is a 1/32, so rendering it to notes needs at least that grid.
  // PROMOTE rather than assign: a triplet song forced to 32 would have its 96-slot lanes
  // read as though they were 64, and every note after the first would land on the wrong
  // slot. 16 -> 32 as before; 48 -> 96, the grid that holds both.
  source.resolution = promoteResolution(resolutionOf(null, draft), FINE_RESOLUTION);
  const processor = createNoteFxProcessor();
  const rendered = new Map();
  for (let barIndex = 0; barIndex <= b; barIndex++) {
    const bar = source.plan[barIndex];
    const notes = readBarLane(bank, source, barIndex, lane);
    const lengths = readBarLane(bank, source, barIndex, lenKey(lane));
    const slots = source.resolution;
    const outNotes = new Array(slots).fill(null);
    const outLengths = new Array(slots).fill(null);
    const config = resolveNoteFx(trackNoteFx, bar, lane);
    for (let slot = 0; slot < slots; slot++) {
      const value = notes[slot];
      const len = lengths[slot];
      const events = processor.process({ laneKey: lane, value, len,
        step: barIndex * 16 + slot * 16 / slots, spb: 1, config: {
          ...config, strum: { ...(config.strum || {}), enabled: false },
        }, barIndex });
      if (barIndex < a || !events.length) continue;
      const freqs = events.map((event) => event.freq);
      const lens = events.map((event) => event.len);
      outNotes[slot] = freqs.length === 1 ? freqs[0] : freqs;
      outLengths[slot] = lens.length === 1 ? lens[0] : lens;
    }
    // A bar whose arp is off — inherited off, or an explicit `mode: 'off'` — renders
    // to the notes it already had, so writing it back would fork the section to say
    // nothing. The processor still walked it above; only the write is skipped.
    if (barIndex >= a && config.arp?.enabled) {
      rendered.set(barIndex, { notes: outNotes, lengths: outLengths, config });
    }
  }
  // Two strums play the same iff both are off, or they agree on the direction and gap
  // the processor will actually use — see `process`, which floors a missing gap to 0
  // and reads anything but down/random as up.
  const strumSig = (fx) => (fx?.strum?.enabled
    ? `${['down', 'random'].includes(fx.strum.direction) ? fx.strum.direction : 'up'}`
      + `/${Math.max(0, Math.min(250, Number(fx.strum.gapMs) || 0))}`
    : 'off');
  const trackAfter = trackArpCleared
    ? { ...trackNoteFx, arp: { ...(trackNoteFx?.arp || {}), enabled: false } }
    : (trackNoteFx || {});
  let out = source;
  for (const [barIndex, material] of rendered) {
    out = writeBarNotes(bank, out, barIndex, lane, material.notes, material.lengths);
    const strum = material.config.strum || {};
    // Inheriting the track already leaves the arp off and the same strum on, so the
    // override has nothing to say. Clear it rather than stamp it.
    const inherits = !trackAfter.arp?.enabled
      && strumSig(trackAfter) === strumSig(material.config);
    out = setBarNoteFx(out, barIndex, barIndex, lane, inherits ? null : {
      mode: 'on',
      ...(strum.enabled ? { strum } : {}),
      arp: { enabled: false },
    });
  }
  return out;
}

/**
 * The same write, but to every bar playing the same part.
 *
 * `writeBarNotes` forks, which is right when you are fixing one bar. This is the
 * other gesture — "the hats are wrong in this loop" — where forking is exactly wrong:
 * plumber plays section 0 for four bars, and editing the loop should change all four
 * rather than leave three of them behind.
 *
 * The group forks ONCE. A bank section is not ours to write into, so a single delta
 * is created and every bar that played that section is repointed at it together; a
 * section that is already ours is written in place, and the bars pointing at it
 * change with it, which is the whole point. Bars that were forked individually have a
 * `sec` of their own and are deliberately left alone.
 *
 * Unless one of those forks is an OLD one, based on this section rather than detached
 * from it — see `hasDependents`. Written in place, this edit would reach through the
 * base into a bar that is not part of the loop and was deliberately taken out of it. So
 * that case forks too: the bars playing the loop move to a detached copy and change
 * together, and the bar that left stays where it was put.
 */
export function writeBarNotesShared(bank, draft, barIndex, lane, steps16, lengths16 = null) {
  const out = expandSectionless(bank, copy(draft));
  const bar = out.plan[barIndex];
  if (!bar) return out;
  const sec = bar.sec;
  const sections = sectionsOf(bank, out);
  const dependents = hasDependents(out, sec);
  if (!isBankSection(bank, sec) && !dependents) {
    putLane(out.sections[sec - (bank.sections?.length || 0)], bank, sections,
      sec, bar.half, lane, steps16, lengths16);
    return out;
  }
  const idx = sections.length;
  const section = dependents ? detachedFrom(bank, sections, sec) : { base: sec };
  putLane(section, bank, sections, sec, bar.half, lane, steps16, lengths16);
  out.sections.push(section);
  for (const b of out.plan) if (b.sec === sec) b.sec = idx;
  return out;
}

/**
 * Pattern boundaries in an expanded bar plan.
 *
 * A section is the musical pattern and normally spans two bars. Comparing bars by
 * index or half would put a divider through the middle of every pattern; comparing
 * `sec` marks only the point where the arrangement actually changes to another one.
 */
export function patternStarts(plan) {
  return plan.map((bar, i) => i > 0 && bar?.sec !== plan[i - 1]?.sec);
}

/**
 * Drop layer sections nothing points at any more, fold identical ones together, and
 * renumber the plan to match.
 *
 * On the way to the file rather than on the keystroke: a section orphaned by a
 * delete is what undo and paste both need to still be there while you are editing.
 */
export function compactSections(bank, draft) {
  const base = bank.sections?.length || 0;
  const out = copy(draft);
  // A lane holding exactly what it would have inherited is not a decision — it is an
  // edit that was undone. Dropped here rather than on the keystroke, for the same
  // reason orphaned sections are: undo needs it to still be there while you edit.
  //
  // This is what makes "toggle a step on, then off again" leave NOTHING in the file.
  // Without it the section keeps `{ base: 0, hats: [...] }`, two keys rather than one,
  // the passthrough below never fires, and a song silts up with arrangement entries
  // that change nothing about it. Muting never hit this — `setLanesOff` writes the
  // plan's `off` mask — so note editing is the first thing to put lane data in a
  // section, and the first thing that can put back exactly what was already there.
  //
  // Resolved against the section list as it stands: only keys equal to what is
  // inherited are removed, so nothing any section resolves to changes as we go.
  //
  // "Inherited" falls through to the BANK, the way the sequencer does and the way
  // `laneWith` reads a lane to begin with — a section that overrides the snare says
  // nothing about the kick, and the kick it plays is the bank's. Comparing against
  // the resolved section alone would find `kick: undefined` there and keep every
  // write for ever.
  const view = { ...bank, sections: [...(bank.sections || []), ...out.sections] };
  for (const s of out.sections) {
    if (!s) continue;
    const inherited = (s.base != null ? resolveSection(view, s.base) : null) || {};
    for (const k of Object.keys(s)) {
      if (k !== 'base' && JSON.stringify(s[k]) === JSON.stringify(inherited[k] ?? bank[k])) delete s[k];
    }
  }
  // Identical layer sections become one. Content, not identity: two bars given the
  // same edit by two separate gestures are the same bar as far as the file goes.
  const byContent = new Map();
  const dedupe = new Map();
  out.sections.forEach((s, i) => {
    const key = JSON.stringify(s);
    if (byContent.has(key)) dedupe.set(i, byContent.get(key));
    else byContent.set(key, i);
  });
  const canonical = (i) => (dedupe.has(i) ? dedupe.get(i) : i);
  // A delta that changes nothing is whatever it was based on — a fork nobody wrote
  // into. `undefined` means "a real section, keep it".
  //
  // An identity `{}` is NOT collapsed here even though it also changes nothing: on a
  // sectionless song it is what the unedited bars point at, and they need an index
  // as long as any edited bar has one. It goes at the end, when it turns out to be
  // the only thing left.
  const passthrough = (i) => {
    const s = out.sections[i];
    if (!s) return undefined;
    return Object.keys(s).length === 1 && s.base != null ? s.base : undefined;
  };
  /**
   * Where a section index ends up: past any duplicate it was folded into, and through
   * any delta that turned out to change nothing.
   *
   * Walked to a fixed point rather than resolved once. A passthrough can point at
   * another passthrough — undo two edits to a bar and it has two of them — and
   * stopping half way leaves an index that is about to be renumbered out of
   * existence. The seen-set is for a file someone hand-edited into a loop.
   */
  const settled = (sec) => {
    const seen = new Set();
    let cur = sec;
    while (cur != null && cur >= base && !seen.has(cur)) {
      seen.add(cur);
      const li = canonical(cur - base);
      const through = passthrough(li);
      if (through === undefined) return base + li;
      cur = through;
    }
    return cur;
  };
  const used = new Set();
  for (const bar of out.plan) {
    if (bar.sec == null || isBankSection(bank, bar.sec)) continue;
    bar.sec = settled(bar.sec);
    if (bar.sec != null && bar.sec >= base) used.add(bar.sec - base);
  }
  // A section nothing PLAYS can still be one the song needs: a delta carries `base:`,
  // and what it is based on has to survive with it. Older entries — written before a
  // fork stopped basing itself on another layer section — can be a chain of them, so
  // this is a walk to closure rather than one more pass. Without it the base is
  // renumbered against a section that is no longer in the list, and the bar comes back
  // inheriting nothing at all: on a song whose lanes live only in its sections, every
  // other track in that bar goes silent.
  for (const li of used) {
    let s = out.sections[li];
    while (s?.base != null && s.base >= base) {
      s.base = settled(s.base);
      if (s.base == null || s.base < base) break;
      const next = s.base - base;
      if (used.has(next)) break;
      used.add(next);
      s = out.sections[next];
    }
  }
  // Renumber what is left, oldest first, so the file's sections read in the order
  // they are first played rather than in the order they happened to be created.
  const keep = [...used].sort((a, b) => a - b);
  const remap = new Map(keep.map((li, i) => [li, i]));
  out.sections = keep.map((li) => out.sections[li]);
  for (const bar of out.plan) {
    if (bar.sec == null || isBankSection(bank, bar.sec)) continue;
    bar.sec = base + remap.get(bar.sec - base);
  }
  // A base pointing into the layer has moved too.
  for (const s of out.sections) {
    if (s.base != null && s.base >= base) s.base = base + remap.get(s.base - base);
  }
  // And if all that is left of a sectionless song's layer is the identity section
  // its unedited bars were given, the edit that needed it is gone: the song goes
  // back to having no sections, and to leaving no entry in the file at all.
  if (!base && out.sections.length === 1 && !Object.keys(out.sections[0]).length) {
    out.sections = [];
    for (const bar of out.plan) bar.sec = null;
  }
  return out;
}
