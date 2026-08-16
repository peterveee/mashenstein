// WHAT THE GENERATOR IS ALLOWED TO BELIEVE ABOUT THE SOURCE SONG.
//
// The profile decides where Rearrange is willing to cut, so a wrong number here does
// not crash anything — it quietly makes worse music, which is the hardest kind of bug
// to notice. Every claim below is therefore about a fixture whose right answer can be
// read off the notes by hand.
//
// The sustain array is the one that matters most and the one that is deliberately
// approximate: it is what stops a cut landing in the middle of a held chord. Its rule
// is "explicit drawn length where the lane has one, otherwise until this lane plays
// again, capped at a bar", and that rule is asserted here rather than left implied.
import {
  buildRearrangeProfile, cutCost, chromaMatch, energyOver, pitchClass, profileEnergyArray,
  detectPhraseGrid,
  detectKey,
} from '../tools/lib/rearrange-profile.js';

let failed = false;
const assert = (ok, message) => {
  if (ok) console.log(`ok: ${message}`);
  else { console.error(`FAIL: ${message}`); failed = true; }
};

const REST = null;
/** 32 slots — one two-bar pattern — with the named slots filled. */
const lane = (map) => Array.from({ length: 32 }, (_, i) => (i in map ? map[i] : REST));
const hits = (...slots) => {
  const on = new Set(slots);
  return Array.from({ length: 32 }, (_, i) => on.has(i));
};

// Equal temperament from A440, so these are exact pitch classes: A=9, C=0, E=4, G=7.
const A4 = 440;
const C5 = 523.2511;
const E5 = 659.2551;
const G5 = 783.9909;
const D5 = 587.3295;

// ---- pitch classes -----------------------------------------------------------

assert(pitchClass(A4) === 9 && pitchClass(C5) === 0 && pitchClass(E5) === 4,
  'frequencies resolve to their pitch classes');
assert(pitchClass(A4 / 2) === 9 && pitchClass(A4 * 2) === 9,
  'octaves share a pitch class');
assert(pitchClass(0) === null && pitchClass(null) === null && pitchClass(true) === null,
  'a rest or a percussion trigger has no pitch class');

// ---- onsets, and lanes that are not there ------------------------------------

{
  const bank = {
    bpm: 120,
    kick: hits(0, 8, 16, 24),
    lead: lane({ 0: C5, 4: E5 }),
    order: [0],
  };
  const p = buildRearrangeProfile(bank);
  assert(p.steps === 32 && p.bars === 2, 'a one-block song profiles as two bars of sixteen');
  assert(p.onsets[0] === 2, 'a step where the kick and the lead both start counts both');
  assert(p.onsets[4] === 1 && p.onsets[1] === 0,
    'and a step with one lane, or none, counts what is there');
  assert(p.percussion[0] > 0 && p.percussion[4] === 0,
    'the accent curve follows the kit, not the melody');
  assert(p.percussion[16] > 0, 'and it is found in the second bar of the block as well');
}

// ---- sustain: the cut hazard --------------------------------------------------

{
  // Two lead notes, the first drawn eight sixteenths long, so it is sounding through
  // steps 1-7 and a cut there would enter or leave in the middle of it.
  const bank = {
    bpm: 120,
    lead: lane({ 0: C5, 8: E5 }),
    leadLen: lane({ 0: 8, 8: 8 }),
    order: [0],
  };
  const p = buildRearrangeProfile(bank);
  assert(p.sustains[0] === 0, 'the step a note STARTS on is not a hazard — that is a clean entry');
  assert(p.sustains[1] === 1 && p.sustains[7] === 1,
    'the steps it holds through are hazards: a cut there enters or leaves mid-note');
  assert(p.sustains[8] === 0, 'and the next onset clears it again');
  assert(cutCost(p, 0) === 0 && cutCost(p, 8) === 0, 'cutting on an onset is free');
  assert(cutCost(p, 4) > 0, 'cutting inside a held note is not');
}

{
  // A shorter drawn length is a shorter hazard: the same two notes written as two
  // sixteenths each, so steps 2-7 are silent and free to cut at.
  const bank = {
    bpm: 120,
    lead: lane({ 0: C5, 8: E5 }),
    leadLen: lane({ 0: 2, 8: 2 }),
    order: [0],
  };
  const p = buildRearrangeProfile(bank);
  assert(p.sustains[1] === 1, 'a drawn two-step note still holds through its second step');
  assert(p.sustains[2] === 0 && p.sustains[6] === 0,
    'but the gap after it is clean, because the length was written down');
}

{
  // A lane's own default length is a real answer, not a missing one. An organ chord
  // holds most of a bar where a lead barely holds at all, and the hazard curve has to
  // show that difference or every lane would read as equally safe to cut through.
  const held = buildRearrangeProfile({ bpm: 120, organChords: lane({ 0: [C5, E5, G5] }), order: [0] });
  const brief = buildRearrangeProfile({ bpm: 120, lead: lane({ 0: C5 }), order: [0] });
  assert(held.sustains[4] > 0, 'an organ chord with no drawn length still reads as held');
  assert(brief.sustains[4] === 0, 'while a lead note with no drawn length has already stopped');
}

{
  // Percussion is a trigger, not a gate: a kit lane never creates a sustain hazard.
  const bank = { bpm: 120, kick: hits(0), order: [0] };
  const p = buildRearrangeProfile(bank);
  let anyHeld = false;
  for (let i = 0; i < p.steps; i++) if (p.sustains[i]) anyHeld = true;
  assert(!anyHeld, 'a drum hit never holds a note across the steps after it');
}

{
  // A kit accent partly masks a seam, so the same sustain costs less over a backbeat.
  const notes = { lead: lane({ 0: C5, 8: E5 }), leadLen: lane({ 0: 8, 8: 8 }) };
  const bare = buildRearrangeProfile({ bpm: 120, ...notes, order: [0] });
  const marked = buildRearrangeProfile({ bpm: 120, ...notes, snare: hits(4), order: [0] });
  assert(cutCost(marked, 4) < cutCost(bare, 4) && cutCost(marked, 4) > 0,
    'a cut under a snare hit costs less than the same cut in the open, but is not free');
}

{
  // The cap. A note drawn absurdly long must not smear a hazard down the whole song.
  const bank = { bpm: 120, lead: lane({ 0: C5 }), leadLen: lane({ 0: 999 }), order: [0, 0, 0, 0] };
  const p = buildRearrangeProfile(bank);
  assert(p.steps === 128, 'four blocks of the same section profile as eight bars');
  assert(p.sustains[15] === 1 && p.sustains[16] === 0,
    'an unbounded note is held for at most one bar, then stops being a hazard');
}

// ---- the arrangement is respected --------------------------------------------

{
  const bank = {
    bpm: 120,
    kick: hits(0, 4, 8, 12, 16, 20, 24, 28),
    sections: [{}],
    order: [0, { sec: 0, off: ['kick'] }],
  };
  const p = buildRearrangeProfile(bank);
  assert(p.onsets[0] === 1 && p.percussion[0] > 0, 'the first block plays its kick');
  assert(p.onsets[32] === 0 && p.percussion[32] === 0,
    'a block that arranges the kick out contributes nothing there');
}

{
  // Sections really are read: the second block writes a different melody.
  const bank = {
    bpm: 120,
    sections: [{ lead: lane({ 0: C5 }) }, { lead: lane({ 0: D5 }) }],
    order: [0, 1],
  };
  const p = buildRearrangeProfile(bank);
  assert(p.chroma[0 * 12 + pitchClass(C5)] === 1, 'bar 0 is about the note section 0 writes');
  assert(p.chroma[2 * 12 + pitchClass(D5)] === 1, 'bar 2 is about the note section 1 writes');
  assert(p.chroma[0 * 12 + pitchClass(D5)] === 0, 'and the two do not bleed into each other');
}

// ---- chroma comparison --------------------------------------------------------

{
  // Two bars of C major triad, two bars a whole tone up. Same shape, different notes.
  const triad = [C5, E5, G5];
  const up = triad.map((hz) => hz * 2 ** (2 / 12));
  const bank = {
    bpm: 120,
    sections: [{ chords: lane({ 0: triad, 16: triad }) }, { chords: lane({ 0: up, 16: up }) }],
    order: [0, 1],
  };
  const p = buildRearrangeProfile(bank);
  assert(chromaMatch(p, 0, 16) > 0.99, 'two bars of the same chord agree completely');
  assert(chromaMatch(p, 0, 32) < 0.2, 'a whole-tone-apart chord does not agree with it');
  assert(chromaMatch(p, 0, 32, 2) > 0.99,
    'and shifting the comparison by that whole tone makes them agree again — which is '
    + 'how a transposition earns its place instead of being rolled for');
  assert(chromaMatch(p, 0, 0) > 0.99, 'a bar always agrees with itself');
}

{
  // Silence never clashes: refusing to cut to a drum break would be a strange rule.
  const bank = { bpm: 120, sections: [{ chords: lane({ 0: [C5, E5, G5] }) }, { kick: hits(0) }], order: [0, 1] };
  const p = buildRearrangeProfile(bank);
  assert(chromaMatch(p, 0, 32) === 1, 'a bar with no pitched content agrees with everything');
}

// ---- energy -------------------------------------------------------------------

{
  const bank = {
    bpm: 120,
    sections: [
      { lead: lane({ 0: C5 }) },
      { lead: lane({ 0: C5, 2: D5, 4: E5, 6: G5, 8: C5, 10: D5, 12: E5, 14: G5 }) },
    ],
    order: [0, 1],
  };
  const p = buildRearrangeProfile(bank);
  assert(p.energy[2] > p.energy[0], 'a busier bar reads as higher energy');
  assert(Math.max(...p.energy) === 1, 'energy is normalised against the song\'s own busiest bar');
  assert(energyOver(p, 32, 16) > energyOver(p, 0, 16),
    'and a range spanning that bar reads higher than a range over the quiet one');
  assert(profileEnergyArray(p).length === p.bars,
    'the legacy per-bar density array is still available from a rich profile');
  assert(profileEnergyArray([0.1, 0.2])[1] === 0.2,
    'and a caller that already has a plain array gets it back untouched');
}

// ---- key detection ------------------------------------------------------------

{
  // A minor, stated the way a song states it: tonic chord heavily, scale around it.
  const bank = {
    bpm: 120,
    chords: lane({ 0: [A4, C5, E5], 8: [A4, C5, E5], 16: [A4, C5, E5], 24: [D5, A4] }),
    lead: lane({ 0: A4, 4: C5, 8: E5, 12: D5, 16: A4, 20: G5, 24: E5, 28: C5 }),
    order: [0],
  };
  const key = detectKey(buildRearrangeProfile(bank));
  assert(key?.tonic === 9 && key.minor === true,
    'a song living on Am with its scale around it detects as A minor');
  assert(key.confidence > 0, 'and says how clearly it won');
}

{
  // C major: same pitch-class SET as A minor apart from emphasis — which is the whole
  // test. The tonic triad carrying the weight is what separates the relative pair.
  const bank = {
    bpm: 120,
    chords: lane({ 0: [C5, E5, G5], 8: [C5, E5, G5], 16: [C5, E5, G5], 24: [G5, D5] }),
    lead: lane({ 0: C5, 4: E5, 8: G5, 12: D5, 16: C5, 20: E5, 24: G5, 28: C5 }),
    order: [0],
  };
  const key = detectKey(buildRearrangeProfile(bank));
  assert(key?.tonic === 0 && key.minor === false,
    'the same scale weighted onto C detects as C major, not A minor');
}

assert(detectKey(null) === null
  && detectKey(buildRearrangeProfile({ bpm: 120, kick: hits(0, 8), order: [0] })) === null,
  'no profile, or a song with no pitched content, yields no key rather than a guess');

// ---- degenerate input ---------------------------------------------------------

{
  const empty = buildRearrangeProfile({ bpm: 120, order: [0] });
  assert(empty.steps === 32 && cutCost(empty, 5) === 0,
    'a song with no notes profiles cleanly and offers no reason to avoid any cut');
  assert(chromaMatch(null, 0, 0) === 1 && cutCost(null, 0) === 0 && energyOver(null, 0, 4) === null,
    'and every accessor answers safely with no profile at all');
}

// ---- where the phrases start --------------------------------------------------
//
// The bug this exists to stop: a song with a three-bar intro has every phrase on an ODD
// bar, and a four-bar grid measured from bar 0 cuts all of them a bar out of phase.
// These fixtures put the harmony changes on a KNOWN grid and check that the grid is the
// one that comes back.

/** A song whose harmony turns over every four bars, starting at `offset`. */
const phraseSong = (offset, bars = 24) => {
  const chords = [[C5, E5, G5], [A4, C5, E5], [D5, G5], [G5, D5]];
  const sections = [];
  const order = [];
  // Two bars to a section, and one section per pair, so each bar can carry its own
  // chord — the fixture has to be able to change harmony on an odd bar.
  for (let bar = 0; bar < bars; bar += 2) {
    const chordAt = (b) => chords[Math.floor(Math.max(0, b - offset) / 4) % chords.length];
    sections.push({
      chords: [...lane({ 0: chordAt(bar), 8: chordAt(bar) }).slice(0, 16),
        ...lane({ 0: chordAt(bar + 1), 8: chordAt(bar + 1) }).slice(0, 16)],
    });
    order.push(sections.length - 1);
  }
  return { bpm: 120, chords: lane({}), sections, order };
};

for (const offset of [0, 1, 2, 3]) {
  const grid = detectPhraseGrid(buildRearrangeProfile(phraseSong(offset)));
  assert(grid.offset === offset,
    `a song whose harmony moves every four bars from bar ${offset} reports that grid`);
  assert(grid.confident,
    `and is confident about it (margin ${grid.confidence.toFixed(3)})`);
}

{
  // The conservative half of the contract. A song with no harmonic movement gives the
  // estimator nothing to prefer, and a caller must get "offset 0, not confident" rather
  // than a coin toss it would then act on.
  const flat = buildRearrangeProfile({
    bpm: 120,
    chords: lane({ 0: [C5, E5, G5], 16: [C5, E5, G5] }),
    order: [0, 0, 0, 0, 0, 0, 0, 0],
  });
  const grid = detectPhraseGrid(flat);
  assert(!grid.confident && grid.offset === 0,
    'a song whose harmony never moves reports no confident phrase grid');
}

assert(detectPhraseGrid(null).offset === 0 && detectPhraseGrid(null).confident === false,
  'and no profile at all yields the safe answer rather than throwing');

{
  // Silence must not read as a chord change: two empty bars are the SAME harmony, not
  // maximally different. Without that rule an empty intro invents a phrase grid.
  const sparse = buildRearrangeProfile({
    bpm: 120, chords: lane({ 0: [C5, E5, G5] }), order: [0, 0, 0, 0, 0, 0, 0, 0],
  });
  const grid = detectPhraseGrid(sparse);
  assert(Number.isFinite(grid.confidence),
    'a song that is mostly silence still yields a finite confidence');
}

console.log(failed ? 'REARRANGE PROFILE: FAILED' : 'REARRANGE PROFILE: PASSED');
process.exit(failed ? 1 : 0);
