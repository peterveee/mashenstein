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
import { expandOrder, orderOf, resolveSection } from '../../src/data/arrangements.js';
import { LANES, LANE_KEYS } from '../../src/engine/lanes.js';

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

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
  return { plan: expandOrder(entry?.order || orderOf(bank), hasSections), sections: layer };
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
 * The draft as a file entry — `{ order, sections }` — or **null** when it says
 * nothing the bank does not already say.
 *
 * Null is the important half: an arrangement nobody changed leaves no entry, the
 * way a mix nobody changed leaves none, so `src/data/arrangements.js` holds
 * decisions rather than a copy of every song's shape.
 */
export function entryOf(bank, draft) {
  const compacted = compactSections(bank, draft);
  const order = planToOrder(compacted.plan);
  const same = JSON.stringify(order) === JSON.stringify(orderOf(bank));
  if (same && !compacted.sections.length) return null;
  const out = { order };
  if (compacted.sections.length) out.sections = compacted.sections;
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
  const sameOff = (a, b) => JSON.stringify(a?.off || null) === JSON.stringify(b?.off || null);
  for (let i = 0; i < plan.length; i++) {
    const bar = plan[i];
    const next = plan[i + 1];
    const pairs = next && next.sec === bar.sec && bar.half === 0 && next.half === 1
      && sameOff(bar, next);
    if (pairs) {
      // `sec` is null on a song with no sections, where the order has always been a
      // list of zeroes the engine never looks up. It writes back out as one.
      if (!bar.off?.length) order.push(bar.sec ?? 0);
      else order.push({ s: bar.sec ?? 0, off: [...bar.off] });
      i++;
      continue;
    }
    const e = { s: bar.sec ?? 0, bars: 1 };
    if (bar.half) e.from = bar.half;
    if (bar.off?.length) e.off = [...bar.off];
    order.push(e);
  }
  return order;
}

// ---- arrangement edits: what plays where -------------------------------------

const copy = (draft) => ({ plan: draft.plan.map((b) => ({ ...b, ...(b.off ? { off: [...b.off] } : {}) })), sections: clone(draft.sections) });
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

export function forkBar(bank, draft, barIndex) {
  const out = expandSectionless(bank, copy(draft));
  const bar = out.plan[barIndex];
  if (!bar) return out;
  const all = sectionsOf(bank, out);
  // Already ours AND nobody else's — nothing to fork.
  const shared = out.plan.some((b, i) => i !== barIndex && b.sec === bar.sec);
  if (!isBankSection(bank, bar.sec) && !shared) return out;
  // A bar of a sectionless song is based on nothing: the sequencer merges a section
  // over the bank, so a layer section with no `base` already inherits every lane the
  // song has. This is the auto-expansion — invisible, and only on the first edit
  // that needs it.
  out.sections.push(bar.sec == null ? {} : { base: bar.sec });
  bar.sec = all.length;
  return out;
}

/**
 * Write sixteen steps of one lane into one bar.
 *
 * The bar forks first, then the lane is rebuilt as a fresh 32-step array — the bar
 * being written takes the new steps, its other half keeps what it played — and only
 * then does anything land in the draft. `steps16` is whatever the lane holds:
 * `true` for a percussion hit, a frequency, an array of them for a chord, `null` for
 * a rest.
 */
export function writeBarNotes(bank, draft, barIndex, lane, steps16) {
  const forked = forkBar(bank, draft, barIndex);
  const bar = forked.plan[barIndex];
  if (!bar) return forked;
  const idx = bar.sec - (bank.sections?.length || 0);
  const section = forked.sections[idx];
  // What the bar plays NOW, resolved through the delta chain and the bank beneath it.
  const resolved = resolveSection({ ...bank, sections: sectionsOf(bank, forked) }, bar.sec) || {};
  const current = resolved[lane] ?? bank[lane];
  // Cloned, never written through: this array is very likely the same object as some
  // other section's, and on some other lane besides.
  const next = Array.from({ length: 32 }, (_, i) => (Array.isArray(current) ? clone(current[i] ?? null) : null));
  for (let i = 0; i < 16; i++) next[bar.half * 16 + i] = steps16[i] ?? null;
  section[lane] = next;
  return forked;
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
  const used = new Set();
  for (const bar of out.plan) {
    if (bar.sec == null || isBankSection(bank, bar.sec)) continue;
    const li = canonical(bar.sec - base);
    const through = passthrough(li);
    if (through !== undefined) { bar.sec = through; continue; }
    bar.sec = base + li;
    used.add(li);
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
