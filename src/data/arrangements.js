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
//   }
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

// Written by the desk, and rewritten WHOLE on every save — so nothing inside the
// object below survives, comments included. Anything worth saying about it is said
// up here, above the line the generator starts at.
//
// Empty means every song plays exactly as it was composed, which is also what keeps
// tests/null-test.js green.
export const ARRANGEMENTS = {
  "after-hours-layaway-gary-organ": {
    order: [
      { s: 0, bars: 1, from: 1, off: ["hats","kick","ohats","snare"] }, 0, 0, 0, 1, 1,
    ],
  },
  "basket-bounce-dolores": {
    order: [
      { s: 0, off: ["hats","rim"] }, { s: 0, off: ["hats","rim"] }, { s: 0, off: ["hats"] }, { s: 0, off: ["hats"] }, { s: 0, off: ["hats"] }, { s: 0, off: ["hats"] }, 0, 0,
      1, 1,
    ],
  },
};

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
  if (!layer.length && !order) return bank;
  const out = { ...bank };
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
    }
  });
  (entry.sections || []).forEach((s, i) => {
    if (s && s.base != null && (s.base < 0 || s.base >= sections.length)) {
      issues.push(`layer section ${i} is based on section ${s.base}, which does not exist`);
    }
  });
  return issues;
}
