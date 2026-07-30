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
import { LANES, LANE_KEYS, lenKey, validLen } from '../../src/engine/lanes.js';

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

// Per-bar edits are deliberately lane-scoped. A number keeps the file compact for
// the common "all lanes" case, while the desk normally writes the explicit map so a
// bass edit cannot accidentally move the lead with it. Timing is measured in 1/32
// notes: +8 is a quarter-note delay, -1 is one 1/32 note early.
const BAR_MAPS = ['transpose', 'offset', 'gain'];
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
 * The draft as a file entry — `{ order, sections, bpm }` — or **null** when it says
 * nothing the bank does not already say.
 *
 * Null is the important half: an arrangement nobody changed leaves no entry, the
 * way a mix nobody changed leaves none, so `src/data/arrangements.js` holds
 * decisions rather than a copy of every song's shape.
 *
 * A tempo equal to the bank's own is not a decision either — it is a drag that ended
 * back where it started — so it is dropped here, and a song whose ONLY change is its
 * tempo writes `{ bpm }` alone rather than restating an order identical to the bank's.
 */
export function entryOf(bank, draft) {
  const compacted = compactSections(bank, draft);
  const order = planToOrder(compacted.plan);
  const bpm = draft.bpm != null && draft.bpm !== bank.bpm ? draft.bpm : null;
  const same = JSON.stringify(order) === JSON.stringify(orderOf(bank));
  if (same && !compacted.sections.length) return bpm == null ? null : { bpm };
  const out = { order };
  if (compacted.sections.length) out.sections = compacted.sections;
  if (bpm != null) out.bpm = bpm;
  return out;
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
    && BAR_MAPS.every((key) => sameBarMap(a, b, key));
  const addBarBits = (e, bar) => {
    if (bar.off?.length) e.off = [...bar.off];
    if (bar.delete?.length) e.delete = [...bar.delete];
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
const copy = (draft) => ({
  plan: draft.plan.map(copyBar), sections: clone(draft.sections), bpm: draft.bpm ?? null,
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
    for (const field of ['off', 'delete']) {
      if (!bar[field]) continue;
      bar[field] = bar[field].filter((key) => !drop.has(key));
      if (!bar[field].length) delete bar[field];
    }
    for (const field of BAR_MAPS) {
      if (!bar[field] || typeof bar[field] !== 'object') continue;
      for (const key of drop) delete bar[field][key];
      if (!Object.keys(bar[field]).length) delete bar[field];
    }
  }
  return out;
}

/** Transpose one lane or a group of lanes by semitones over a bar range. */
export const transposeBars = (draft, from, to, keys, semitones) =>
  mapEdit(draft, from, to, keys, 'transpose', Number.isFinite(+semitones) ? +semitones : 0);

/** Move a lane's notes in 1/32-note units over a bar range. */
export const offsetBars = (draft, from, to, keys, units) =>
  mapEdit(draft, from, to, keys, 'offset', Number.isFinite(+units) ? +units : 0);

/** Apply a relative gain in dB to a lane over a bar range. */
export const gainBars = (draft, from, to, keys, db) =>
  mapEdit(draft, from, to, keys, 'gain', Number.isFinite(+db) ? +db : 0);

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
function laneWith(bank, sections, sec, half, lane, steps16) {
  const resolved = resolveSection({ ...bank, sections }, sec) || {};
  const current = resolved[lane] ?? bank[lane];
  const next = Array.from({ length: 32 }, (_, i) => (Array.isArray(current) ? clone(current[i] ?? null) : null));
  for (let i = 0; i < 16; i++) next[half * 16 + i] = steps16[i] ?? null;
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
 */
export function writeBarNotesShared(bank, draft, barIndex, lane, steps16, lengths16 = null) {
  const out = expandSectionless(bank, copy(draft));
  const bar = out.plan[barIndex];
  if (!bar) return out;
  const sec = bar.sec;
  const sections = sectionsOf(bank, out);
  if (!isBankSection(bank, sec)) {
    putLane(out.sections[sec - (bank.sections?.length || 0)], bank, sections,
      sec, bar.half, lane, steps16, lengths16);
    return out;
  }
  const idx = sections.length;
  const section = { base: sec };
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
