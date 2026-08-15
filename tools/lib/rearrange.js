// Temporary, deterministic song-rearrangement recipes.
//
// A recipe names ranges in the song's transport units (sixteenths) and says how
// many times each range is heard in the new output.  It deliberately contains no
// note data: the live engine resolves the current song/mix at playback time, so a
// recipe remains small, readable, and safe to discard without changing a song.

import { cutCost, chromaMatch, energyOver, detectKey } from './rearrange-profile.js';

export const REARRANGE_KIND = 'mashenstein-rearrangement';
export const REARRANGE_VERSION = 1;
export const REARRANGE_GRID = 'sixteenth';
export const REARRANGE_EXTREMENESS_DEFAULT = 0.35;
// The generator API keeps the full musical interval palette by default. The mixer
// deliberately starts lower and lets the player dial the lift back up before Generate.
export const REARRANGE_TRANSPOSE_DEFAULT = 1;
export const REARRANGE_PATTERN_DEFAULT = 0.5;
// New recipes move a whole pitched section by a gentle whole tone, perfect fourth, or
// perfect fifth. The older values remain accepted when loading a saved v1 file, so a
// recipe made before this change does not become unusable; generation never chooses
// octave jumps now.
export const REARRANGE_TRANSPOSES = Object.freeze([-12, -7, -5, -2, 0, 2, 5, 7, 12]);
export const REARRANGE_GENERATED_TRANSPOSES = Object.freeze([-7, -5, -2, 2, 5, 7]);
// How the collage treats percussion. Keep this in the recipe rather than in the song
// bank so the normal song, exports, and saved arrangements remain untouched.
//
//   original — percussion is chopped with everything else, at the mapped source
//              position. The drums go where the collage goes.
//   song     — the song's OWN authored percussion, read at the output clock, so the
//              groove runs straight underneath a rearranged top. This is what makes a
//              chopped arrangement sound played rather than assembled, and it is the
//              default for newly generated recipes.
//   basic4   — a deterministic four-on-the-floor kit built from the existing kit
//              sounds, also on the output clock, ignoring what the song wrote.
//
// A recipe with no `drums` field still means `original`, so every saved v1 file keeps
// the behaviour it was auditioned with.
export const REARRANGE_DRUM_MODES = Object.freeze(['original', 'song', 'basic4']);
export const REARRANGE_DRUM_DEFAULT = 'song';

export const REARRANGE_FORM_ROLES = Object.freeze([
  'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro',
]);

// How big each part of the form should feel, against the song's own busiest bar. Only
// consulted when a rich profile can measure energy; the ordering is the point rather
// than the exact numbers — a chorus above a verse, an intro and an outro below both.
const ROLE_ENERGY = Object.freeze({
  Intro: 0.35, Verse: 0.55, Chorus: 0.95, Bridge: 0.5, Outro: 0.3,
});

const PHRASE_STEPS = 64; // four bars at sixteen sixteenths per bar

const PHRASE_LENGTH_WEIGHTS = Object.freeze([
  [1, 2], [2, 4], [4, 7], [8, 34], [16, 42], [32, 10], [64, 1],
]);

/**
 * ---- STYLES ------------------------------------------------------------------
 *
 * The three ways this generator is asked to cut a song up. Each is a hard GATE on
 * cell length and on where in the source a cell may start — not a nudge, a gate, so
 * "Groove" can be relied on to produce bar and half-bar cells on eight-step
 * boundaries and nothing else. Musical taste beyond that is scored, not gated; see
 * `scoreOffset`.
 *
 * `grid` is applied to the ABSOLUTE source position, not to an offset within the
 * chosen phrase, because a phrase base is only aligned to four bars when the song
 * divides evenly into them. Aligning the offset would quietly let the last phrase of
 * an odd-length song cut anywhere.
 *
 * Glitches — one and two-sixteenth cuts, and starts off any musical boundary — are
 * not a style. They are an explicit switch, because they are the one thing here that
 * cannot be arrived at by accident and should not be.
 */
export const REARRANGE_STYLES = Object.freeze({
  phrase: {
    // Whole phrases: one to four bars, always on a bar line. The least chopped
    // setting the generator has, for songs whose melodies need room.
    cells: [[16, 30], [32, 45], [64, 25]],
    grid: 16,
    pairChance: 0.2,
    loopChance: 0.9,
    patterning: 0.6,
  },
  groove: {
    // Bar and half-bar cells on eight-step boundaries. The default: enough movement
    // to be an arrangement rather than an excerpt, aligned enough to stay danceable.
    cells: [[8, 38], [16, 52], [32, 10]],
    grid: 8,
    pairChance: 0.62,
    loopChance: 0.55,
    patterning: 0.65,
  },
  chop: {
    // Beat and half-bar cells, still on the beat. Busy, and still metrical.
    cells: [[4, 40], [8, 45], [16, 15]],
    grid: 4,
    pairChance: 0.7,
    loopChance: 0.3,
    patterning: 0.45,
  },
});
export const REARRANGE_STYLE_NAMES = Object.freeze(Object.keys(REARRANGE_STYLES));
export const REARRANGE_STYLE_DEFAULT = 'groove';
export const REARRANGE_VARIATION_DEFAULT = 0.45;

/**
 * ---- HARMONY: CHORD LOOPS --------------------------------------------------------
 *
 * A chromatic transpose moves the TAPE — every note by the same distance, so an Am
 * phrase shifted down four semitones comes back as Fm. Dance music does not do that.
 * It walks the same riff around a four-chord loop of the KEY: Am becomes F, C, G —
 * major chords, because that is what those degrees of A minor are. Getting there
 * needs diatonic movement: each note steps N degrees within the song's scale, and the
 * chord qualities fall out on their own (see `harmonicShift`).
 *
 * A progression here is therefore four SCALE-DEGREE OFFSETS, one per bar of a
 * four-bar section, applied to whatever slice sounds in that bar. Offset 0 is the
 * material as written; -2 plays it as the VI; the riff stays the riff throughout.
 * That one-chord-per-bar walk over a repeating cell IS the modern pop/EDM move, and
 * it needs no note data — which is what keeps it inside the recipe contract.
 *
 * The minor palettes are the standard club vocabulary; a song detected as MAJOR gets
 * the axis progression (I–V–vi–IV) whichever palette is asked for, because the minor
 * numerals do not mean anything there.
 */
export const REARRANGE_PROGRESSIONS = Object.freeze({
  edm: { label: 'i – VI – III – VII', minor: [0, -2, 2, -1] },     // Titanium, Animals
  house: { label: 'i – v – VI – iv', minor: [0, -3, -2, 3] },      // the nu-disco loop
  anthem: { label: 'VI – VII – i – i', minor: [-2, -1, 0, 0] },    // the festival build
  dark: { label: 'i – iv – VI – v', minor: [0, 3, -2, -3] },       // synthwave/dark pop
});
export const REARRANGE_PROGRESSION_NAMES = Object.freeze(Object.keys(REARRANGE_PROGRESSIONS));
// One major-key walk fits every request: the axis progression, pop's I–V–vi–IV.
const MAJOR_PROGRESSION = Object.freeze([0, -3, -2, 3]);
// How many bars of the four-bar loop actually move. Listening said a full walk is
// often too much: the riff loses its footing when every bar re-harmonises. The
// default holds home for two bars and moves on the back half; the turnaround holds
// three and lifts only into the bar line — the oldest trick in pop, and the subtlest.
export const REARRANGE_WALKS = Object.freeze({ full: 4, half: 2, turn: 1 });
export const REARRANGE_WALK_DEFAULT = 'half';

/**
 * A palette reduced to its walk amount: home for the held bars, then the palette's
 * MOVING chords, in order, at the end. Selected by movement rather than by bar
 * position, because the anthem palette (VI–VII–i–i) moves at the START — a
 * positional mask kept its two home bars and threw its lift away, leaving a
 * "walking" section of four identical tonic bars. This way every reduced walk still
 * walks: EDM gives i–i–III–VII, the anthem its classic i–i–VI–VII.
 */
function walkedChords(palette, walk) {
  const bars = REARRANGE_WALKS[walk] ?? REARRANGE_WALKS[REARRANGE_WALK_DEFAULT];
  if (bars >= palette.length) return palette;
  const moving = palette.filter((chord) => chord !== 0);
  const tail = moving.slice(-Math.max(1, Math.min(bars, moving.length)));
  return [...new Array(palette.length - tail.length).fill(0), ...tail];
}
// Degree offsets a recipe may carry: within one octave of scale degrees.
export const REARRANGE_HARMONY_RANGE = 7;

const MINOR_SCALE = Object.freeze([0, 2, 3, 5, 7, 8, 10]);
const MAJOR_SCALE = Object.freeze([0, 2, 4, 5, 7, 9, 11]);
const MINOR_NUMERALS = Object.freeze(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
const MAJOR_NUMERALS = Object.freeze(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);

/** The roman numeral a degree offset lands on, for labels: -2 in minor is 'VI'. */
export function harmonyNumeral(degrees, minor = true) {
  const numerals = minor ? MINOR_NUMERALS : MAJOR_NUMERALS;
  return numerals[((degrees % 7) + 7) % 7];
}

/**
 * Move one frequency by whole SCALE DEGREES within a key.
 *
 * This is the note-level mechanics of the chord loop: A stepped -2 degrees in A minor
 * is F, C is A, E is C — the Am triad has become an F major triad, no note having
 * moved the same distance as its neighbours. A note outside the scale keeps its
 * colour by riding with the nearest scale tone below it, staying the same distance
 * sharp of wherever that tone lands.
 *
 * Pure and exact per note: octaves are preserved through the degree arithmetic, and
 * degree 0 returns the frequency untouched.
 */
export function harmonicShift(freq, key, degrees) {
  if (!degrees || !(typeof freq === 'number') || !(freq > 0) || !key) return freq;
  const scale = key.minor ? MINOR_SCALE : MAJOR_SCALE;
  const semis = Math.round(12 * Math.log2(freq / 440)) + 57; // exact for tempered input
  const rel = (((semis % 12) - (key.tonic % 12)) % 12 + 12) % 12;
  let index = scale.indexOf(rel);
  let chromatic = 0;
  if (index < 0) {
    // Between scale tones: hold on to the one below and keep the sharpness.
    index = scale.findLastIndex((tone) => tone < rel);
    if (index < 0) index = scale.length - 1;
    chromatic = rel - scale[index];
  }
  const target = index + degrees;
  const octaves = Math.floor(target / 7);
  const landed = scale[((target % 7) + 7) % 7];
  const delta = landed + chromatic - rel + octaves * 12;
  return freq * 2 ** (delta / 12);
}

/**
 * Walk a section's slices through a four-chord loop, one chord per output bar.
 *
 * Each operation takes the degree offset of the bar it sounds in. An operation whose
 * repeats cross a chord change is split so each pass carries its own bar's chord —
 * the split moves no audio, it only lets two passes wear two harmonies. A single
 * unrepeated slice longer than a bar is left alone: there is nothing to split, and
 * re-pitching half a phrase mid-note is exactly the artefact this feature avoids.
 * Output duration is untouched throughout.
 */
function applyHarmonyLoop(operations, chords) {
  const out = [];
  let cursor = 0;
  for (const operation of operations) {
    const span = operation.length * operation.repeats;
    if (operation.length > 16 || operation.favourite) {
      out.push(operation);
      cursor += span;
      continue;
    }
    let run = null;
    for (let pass = 0; pass < operation.repeats; pass++) {
      const chord = chords[Math.floor(cursor / 16) % chords.length] || 0;
      if (run && run.chord === chord) run.repeats++;
      else {
        if (run) out.push(run.chord ? { ...operation, repeats: run.repeats, harmony: run.chord }
          : { ...operation, repeats: run.repeats });
        run = { chord, repeats: 1 };
      }
      cursor += operation.length;
    }
    if (run) out.push(run.chord ? { ...operation, repeats: run.repeats, harmony: run.chord }
      : { ...operation, repeats: run.repeats });
  }
  return out;
}

// What Allow glitches adds: sub-beat cells, and an unaligned grid to place them on.
const GLITCH_CELLS = Object.freeze([[1, 3], [2, 6]]);

// How the scorer weighs one candidate slice against another. The cut penalty is the
// heaviest by a distance, and deliberately: a phrase chosen slightly wrong still
// sounds like music, and a cut through a held chord sounds like a fault in the file.
const CUT_WEIGHT = 1;
const CHROMA_WEIGHT = 0.5;
const ENERGY_WEIGHT = 0.35;
const CONTINUITY_WEIGHT = 0.3;
// Held voices a boundary may cross before the generator would rather lengthen the
// phrase than take it. One is a single sustained note under a cut, which is usually
// inaudible; beyond that it is a chord being sliced.
const CUT_TOLERANCE = 1;

const int = (value) => Number.isInteger(value) ? value : null;

function clampExtremeness(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(1, number))
    : REARRANGE_EXTREMENESS_DEFAULT;
}

function clampControl(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function repeatWeights(patterning = REARRANGE_PATTERN_DEFAULT) {
  const amount = clampControl(patterning, REARRANGE_PATTERN_DEFAULT);
  // A high Patterning setting makes two-pass cells and occasional three/four-pass
  // figures more likely; a low setting leaves more room for one-off source changes.
  return [
    [1, 58 - amount * 28],
    [2, 28 + amount * 22],
    [3, 10 + amount * 4],
    [4, 4 + amount * 2],
  ];
}

/** Return the session-only drum treatment carried by a recipe. */
export function rearrangementDrumMode(recipe) {
  return recipe?.drums == null ? 'original' : recipe.drums;
}

// A cheap, allocation-free hash for the generated kit.  It deliberately mixes the
// recipe seed, output sixteenth, and lane name so a loop repeats exactly while each
// percussion voice gets its own little variation.
function drumRandom(lane, step, seed = 0) {
  let hash = (Number(seed) >>> 0) ^ Math.imul((Math.floor(step) + 1) | 0, 0x9E3779B1);
  const name = String(lane || '');
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 0x45D9F3B);
    hash ^= hash >>> 16;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x45D9F3B);
  hash = Math.imul(hash ^ (hash >>> 13), 0x45D9F3B);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0x100000000;
}

/**
 * The musical, steady replacement pattern used by the Rearrange drum mode.
 *
 * `step` is the output transport position, not the mapped source position. Integer
 * sixteenths carry the hits; 32nd-only scheduler passes stay silent. The kick is a
 * straight four-on-the-floor, snare/clap land only on beats 2 and 4, and hats provide
 * the eighth-note grid. Open hats, rims, toms and crashes supply the occasional fill
 * without moving the backbeat.
 */
export function rearrangementDrumHit(lane, step, seed = 0) {
  if (!Number.isInteger(step)) return false;
  const phase = ((step % 16) + 16) % 16;
  const chance = drumRandom(lane, step, seed);
  switch (String(lane || '')) {
    case 'kick':
      return phase % 4 === 0;
    case 'snare':
      return phase === 4 || phase === 12;
    case 'clap':
      return phase === 4 || phase === 12;
    case 'rim':
      return (phase === 2 || phase === 10) && chance < 0.18;
    case 'hats':
      return phase % 2 === 0 || chance < 0.12;
    case 'ohats':
      return (phase === 6 || phase === 14) && chance < 0.68;
    case 'crash':
      return phase === 0 && chance < 0.32;
    case 'tom':
      return (phase === 3 || phase === 7 || phase === 11 || phase === 15) && chance < 0.24;
    default:
      return phase % 4 === 0 && chance < 0.3;
  }
}

/** A small seeded PRNG. The bitwise operations intentionally keep the state uint32. */
export function seededRandom(seed) {
  let state = (Number(seed) >>> 0);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

export function randomSeed(random = Math.random) {
  return (Math.floor(Math.max(0, Math.min(0.9999999999999999, Number(random()) || 0))
    * 0x100000000) >>> 0);
}

const weighted = (items, random) => {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let pick = random() * total;
  for (const [value, weight] of items) {
    pick -= weight;
    if (pick < 0) return value;
  }
  return items[items.length - 1][0];
};

function sourceStart(maxStart, random, extremeness = REARRANGE_EXTREMENESS_DEFAULT) {
  if (maxStart <= 0) return 0;
  let start = Math.floor(random() * (maxStart + 1));
  const intensity = clampExtremeness(extremeness);
  // A smooth recipe favours whole-bar starts. The wild end keeps the original
  // beat-weighted behavior, with occasional odd sixteenth boundaries.
  const snapUnit = intensity < 0.34 ? 16 : 4;
  const snapChance = 0.98 - intensity * 0.28;
  if (random() < snapChance) start = Math.floor(start / snapUnit) * snapUnit;
  return Math.min(maxStart, start);
}

/**
 * The style a generation runs under, as one object.
 *
 * With a named style this is that style, plus glitch cells if they were asked for.
 * Without one it is the continuous Extremeness behaviour this generator has always
 * had, expressed in the same shape — which is what lets there be a single code path
 * rather than a legacy generator kept alive beside a new one. A caller passing
 * `extremeness` and nothing else gets exactly the distribution it always got: the
 * weights below ARE the old `PHRASE_LENGTH_WEIGHTS`, and `grid: null` means the old
 * `sourceStart` snapping rather than an aligned candidate list.
 */
function resolveStyle(style, allowGlitches) {
  const named = style && REARRANGE_STYLES[style] ? REARRANGE_STYLES[style] : null;
  if (!named) {
    return {
      name: null,
      cells: PHRASE_LENGTH_WEIGHTS.map(([value, weight]) => [value, weight]),
      grid: null,
      pairChance: null,
      loopChance: null,
      patterning: null,
      glitches: true,
    };
  }
  return {
    name: style,
    cells: allowGlitches ? [...GLITCH_CELLS, ...named.cells] : named.cells,
    // Glitches are allowed to land anywhere; that is what makes them glitches.
    grid: allowGlitches ? 1 : named.grid,
    pairChance: named.pairChance,
    loopChance: named.loopChance,
    patterning: named.patterning,
    glitches: !!allowGlitches,
  };
}

/** Cell lengths this style permits that also fit the space and the source. */
function styleCells(style, maxLength, sourceSpan, { divides = 0 } = {}) {
  return style.cells.filter(([value]) => value <= maxLength && value <= sourceSpan
    && (!divides || divides % value === 0));
}

/**
 * The source positions a cell of this length may start at, in absolute steps.
 *
 * A styled generation gets an aligned candidate list; an unstyled one gets null,
 * meaning "use the old weighted-snap random instead".
 */
function offsetCandidates(style, sourceBase, sourceSpan, length) {
  const maxOffset = Math.max(0, sourceSpan - length);
  if (!style.grid || !maxOffset) return null;
  const out = [];
  const first = ((style.grid - (sourceBase % style.grid)) % style.grid);
  for (let offset = first; offset <= maxOffset; offset += style.grid) out.push(offset);
  return out.length ? out : [0];
}

/**
 * How good a slice sounds where it is, higher being better.
 *
 * Four questions, in the order they matter. Does taking it cut through anything that
 * is still sounding, at either end? Do its pitches agree with what the listener just
 * heard? Is it as big as this part of the form wants to feel? And does it simply carry
 * on from the previous slice, which is the cheapest continuity there is.
 *
 * Everything is a preference. The one hard rule lives in `pickCell`, which would
 * rather take a longer phrase than a boundary that slices a chord in half.
 */
function scoreOffset(from, length, ctx) {
  const profile = ctx.profile;
  if (!profile) return 0;
  let score = -CUT_WEIGHT * (cutCost(profile, from) + cutCost(profile, from + length));
  if (ctx.previousEnd != null) {
    score += CHROMA_WEIGHT * chromaMatch(profile, ctx.previousEnd, from);
    if (from === ctx.previousEnd) score += CONTINUITY_WEIGHT;
  }
  if (ctx.energyTarget != null) {
    const energy = energyOver(profile, from, length);
    if (energy != null) score += ENERGY_WEIGHT * (1 - Math.abs(energy - ctx.energyTarget));
  }
  return score;
}

/** The held voices a slice would cross at its two boundaries. */
function boundaryCut(from, length, profile) {
  if (!profile) return 0;
  return cutCost(profile, from) + cutCost(profile, from + length);
}

/**
 * Choose where a cell of `length` comes from.
 *
 * With no rich profile this is the generator's original weighted snap, unchanged —
 * an unscored choice is not a worse choice when there is nothing to score against.
 * With one, the aligned candidates are ranked and the pick is taken from the top of
 * that ranking, `variation` deciding how far down the ranking it is allowed to reach.
 * At Familiar that pool is one candidate and the result is the best available slice;
 * at Different it widens, and the recipe finds material the safe answer would miss.
 */
function pickOffset(length, ctx, { exclude = null } = {}) {
  const { style, sourceBase, sourceSpan, random, intensity } = ctx;
  const maxOffset = Math.max(0, sourceSpan - length);
  if (!maxOffset) return 0;
  const candidates = offsetCandidates(style, sourceBase, sourceSpan, length);
  // Unstyled and unscored: the original weighted snap, untouched.
  if (!candidates) return sourceStart(maxOffset, random, intensity);
  // Styled but unscored — no profile to rank against, so any aligned candidate will do.
  if (!ctx.profile) {
    const open = candidates.filter((offset) => offset !== exclude);
    const pool = open.length ? open : candidates;
    return pool[Math.floor(random() * pool.length)];
  }
  const usable = candidates.filter((offset) => offset !== exclude);
  const pool = usable.length ? usable : candidates;
  const scored = pool
    .map((offset) => ({ offset, score: scoreOffset(sourceBase + offset, length, ctx) }))
    .sort((a, b) => b.score - a.score || a.offset - b.offset);
  const reach = Math.max(1, Math.round(scored.length * (0.02 + ctx.variation * 0.5)));
  return scored[Math.floor(random() * Math.min(reach, scored.length))].offset;
}

/**
 * Choose a cell length AND where it comes from, refusing to slice a chord in half.
 *
 * The length is rolled from the style's weights, as it always was. What is new is what
 * happens when the best slice at that length still crosses too much held material:
 * rather than take it, the generator reaches for the next longer cell the style allows
 * and asks again. A longer phrase is the one repair that always works — it moves the
 * boundary rather than disguising it — and it is why the default output has fewer
 * chopped holes in it without sounding more timid.
 *
 * Returns null only when the style permits no cell that fits at all.
 */
function pickCell(lengths, ctx, options = {}) {
  if (!lengths.length) return null;
  const length = weighted(lengths, ctx.random);
  const ordered = [length, ...lengths.map(([value]) => value)
    .filter((value) => value > length).sort((a, b) => a - b)];
  let fallback = null;
  for (const candidate of ordered) {
    const offset = pickOffset(candidate, ctx, options);
    const cut = boundaryCut(ctx.sourceBase + offset, candidate, ctx.profile);
    if (cut <= CUT_TOLERANCE) return { length: candidate, offset };
    if (!fallback || cut < fallback.cut) fallback = { length: candidate, offset, cut };
  }
  return fallback ? { length: fallback.length, offset: fallback.offset } : null;
}

/**
 * Move a slice off a duplicate of the one before it, without leaving the grid.
 *
 * The nudge has always been a flat four sixteenths — a beat, which was a fine answer
 * while nothing promised where cuts could land. A style promises exactly that, so a
 * styled generation steps to its own next candidate instead: a Groove recipe cannot
 * acquire an off-beat slice by way of a duplicate that had to be broken. Unstyled, it
 * is the same four sixteenths it always was.
 */
function nudgeOffset(offset, length, style, sourceBase, sourceSpan) {
  const maxOffset = Math.max(0, sourceSpan - length);
  if (!maxOffset) return offset;
  const candidates = offsetCandidates(style, sourceBase, sourceSpan, length);
  if (!candidates || candidates.length < 2) return (offset + 4) % (maxOffset + 1);
  const index = candidates.indexOf(offset);
  return candidates[(index < 0 ? 0 : index + 1) % candidates.length];
}

function operationEqual(a, b) {
  return !!a && !!b && a.from === b.from && a.length === b.length
    && a.repeats === b.repeats && a.transpose === b.transpose
    && (a.harmony || 0) === (b.harmony || 0);
}

function anchoredOperations(anchor, sectionSteps, sourceSteps) {
  if (!Array.isArray(anchor?.operations) || !anchor.operations.length) return null;
  let total = 0;
  const operations = [];
  for (const raw of anchor.operations) {
    const from = int(raw?.from);
    const length = int(raw?.length);
    const repeats = int(raw?.repeats);
    const transpose = raw?.transpose == null ? 0 : int(raw.transpose);
    if (from == null || length == null || repeats == null || transpose == null
      || from < 0 || length < 1 || from + length > sourceSteps
      || repeats < 1 || repeats > 4 || !REARRANGE_TRANSPOSES.includes(transpose)) return null;
    total += length * repeats;
    operations.push({ from, length, repeats, transpose });
  }
  return total === sectionSteps ? operations : null;
}

function findAnchor(anchors, sectionIndex, section) {
  if (!Array.isArray(anchors)) return null;
  return anchors.find((anchor) => anchor?.index === sectionIndex
    && anchor.steps === section.steps)
    || anchors.find((anchor) => anchor?.role === section.role
      && anchor.steps === section.steps)
    || null;
}

function formRoles(units) {
  if (units <= 1) return ['Verse'];
  if (units === 2) return ['Verse', 'Chorus'];
  if (units === 3) return ['Verse', 'Chorus', 'Bridge'];
  if (units === 4) return ['Intro', 'Verse', 'Chorus', 'Verse'];
  if (units === 5) return ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus'];
  if (units === 6) return ['Intro', 'Verse', 'Chorus', 'Verse', 'Bridge', 'Chorus'];
  if (units === 7) return ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus'];
  const roles = ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus'];
  const extension = ['Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus'];
  while (roles.length < units - 1) roles.push(extension[(roles.length - 7) % extension.length]);
  roles.push('Outro');
  return roles;
}

function formFor(sourceSteps) {
  const units = Math.floor(sourceSteps / PHRASE_STEPS);
  const remainder = sourceSteps % PHRASE_STEPS;
  const roles = formRoles(units);
  const sections = roles.map((role) => ({ role, name: role, steps: PHRASE_STEPS }));
  if (!units) sections[0].steps = sourceSteps;
  else if (remainder) sections.push({ role: 'Outro', name: 'Outro', steps: remainder });
  return sections;
}

function profileScore(profile, start, span) {
  if (!Array.isArray(profile) || !profile.length) return null;
  const first = Math.max(0, Math.floor(start / 16));
  const count = Math.max(1, Math.ceil(span / 16));
  let total = 0;
  let seen = 0;
  for (let i = 0; i < count && first + i < profile.length; i++) {
    const value = Number(profile[first + i]);
    if (Number.isFinite(value)) { total += value; seen++; }
  }
  return seen ? total / seen : null;
}

function sourceCandidates(sourceSteps, span) {
  const maxStart = Math.max(0, sourceSteps - span);
  const out = [];
  for (let start = 0; start <= maxStart; start += PHRASE_STEPS) out.push(start);
  if (out[out.length - 1] !== maxStart) out.push(maxStart);
  return out.length ? out : [0];
}

function candidateBlocked(start, span, blocked) {
  return Array.isArray(blocked) && blocked.some((entry) => {
    const source = int(entry?.source);
    const from = int(entry?.from);
    return (source != null && start === source)
      || (from != null && from >= start && from < start + span);
  });
}

function chooseSource(role, candidates, span, profile, used, random, blocked = null,
  extremeness = REARRANGE_EXTREMENESS_DEFAULT) {
  const availableCandidates = candidates.filter((start) => !candidateBlocked(start, span, blocked));
  const candidatePool = availableCandidates.length ? availableCandidates : candidates;
  if (role === 'Intro') return candidatePool[0];
  if (role === 'Outro') return candidatePool[candidatePool.length - 1];
  const scored = candidatePool.map((start, index) => ({
    start,
    index,
    score: profileScore(profile, start, span),
  }));
  const hasProfile = scored.some((entry) => entry.score != null);
  const preferred = role === 'Chorus' ? 1 : role === 'Verse' ? -1 : 0;
  scored.sort((a, b) => {
    if (hasProfile && a.score !== b.score) return preferred * (b.score - a.score);
    // With no density profile, later source phrases make a useful chorus contrast,
    // while verses favour the opening material. The random pick below still keeps
    // each recipe seed different.
    if (role === 'Chorus' && a.start !== b.start) return b.start - a.start;
    if (role === 'Verse' && a.start !== b.start) return a.start - b.start;
    return a.index - b.index;
  });
  const available = scored.filter((entry) => !candidateBlocked(entry.start, span, blocked));
  const choices = available.length ? available : scored;
  const fresh = choices.filter((entry) => !used.has(entry.start));
  const intensity = clampExtremeness(extremeness);
  const pool = (fresh.length ? fresh : choices)
    .slice(0, Math.max(1, Math.ceil(choices.length * (0.18 + intensity * 0.27))));
  return pool[Math.floor(random() * pool.length)].start;
}

function findAvoid(avoid, sectionIndex, section) {
  if (!Array.isArray(avoid)) return null;
  return avoid.find((anchor) => anchor?.index === sectionIndex
    && anchor.steps === section.steps) || null;
}

function chooseTranspose(role, random, extremeness = REARRANGE_EXTREMENESS_DEFAULT,
  transposeAmount = REARRANGE_TRANSPOSE_DEFAULT, profile = null,
  previousEnd = null, source = null) {
  // Keep the occasional shift phrase-wide. A chorus landing by a whole tone, fourth,
  // or fifth is a recognisable lift; transposing every tiny slice independently is not.
  const intensity = clampExtremeness(extremeness);
  const amount = clampControl(transposeAmount, REARRANGE_TRANSPOSE_DEFAULT);
  if (role === 'Intro' || role === 'Outro' || amount <= 0) return 0;
  const chance = (0.02 + intensity * 0.18) * (0.12 + amount * 0.88);
  if (random() >= chance) return 0;
  const choices = amount < 0.34
    ? [-2, 2]
    : amount < 0.7
      ? [-5, -2, 2, 5]
      : REARRANGE_GENERATED_TRANSPOSES;
  // WHETHER to lift is still a roll — a lift that arrived every time would stop being
  // a lift. WHICH one is not, where the song can be asked: the interval that leaves
  // this section agreeing best with what the listener just heard is the one that sounds
  // like a modulation rather than like a mistake.
  if (profile && previousEnd != null && source != null) {
    let best = null;
    for (const value of choices) {
      const match = chromaMatch(profile, previousEnd, source, value);
      if (!best || match > best.match) best = { value, match };
    }
    if (best) return best.value;
  }
  return weighted(choices.map((value) => [value, 1]), random);
}

function sectionOperations(sectionSteps, transpose, previous, favourites, ctx) {
  const { style, sourceBase, sourceSpan, random, intensity, pattern } = ctx;
  // Favourites are exact source slices the player asked to hear in every new recipe.
  // They consume output space once, then the remaining space is filled with the normal
  // musical cell/loop choices. Keep them untransposed so the selected phrase remains
  // recognisable; the surrounding filler can still carry the section's gentle lift.
  if (Array.isArray(favourites) && favourites.length) {
    const fixed = favourites.map((favourite) => ({
      from: favourite.from,
      length: favourite.length,
      repeats: 1,
      transpose: 0,
      favourite: true,
    }));
    const used = fixed.reduce((sum, operation) => sum + operation.length, 0);
    const remaining = sectionSteps - used;
    if (remaining <= 0) return fixed;
    const filler = sectionOperations(remaining, transpose, fixed[fixed.length - 1], [], ctx);
    return fixed.concat(filler);
  }
  // A four-bar section is more useful as a pattern of smaller cells than as one
  // unbroken two-bar grab. The common case alternates two adjacent half-bars (or
  // bars) and then repeats that pair: A, B, A, B. This keeps the phrase musical while
  // making the rearrangement audibly different from simply looping a long excerpt.
  //
  // A/B alternation is a MOTIF, so Familiar reaches for it more readily than Different
  // does — the pair coming back is the thing a listener recognises.
  const pairChance = style.pairChance == null
    ? Math.min(0.95, 0.28 + intensity * 0.34 + pattern * 0.25)
    : Math.max(0, Math.min(0.95, style.pairChance + (0.5 - ctx.variation) * 0.2));
  if (sectionSteps >= 32 && random() < pairChance) {
    const cellChoices = style.name
      ? styleCells(style, sectionSteps, sourceSpan, { divides: sectionSteps })
      : [
        [8, 4 + intensity * 58],
        [16, 40],
        [32, (1 - intensity) * 20],
        [64, (1 - intensity) * 12],
      ].filter(([value, weight]) => weight > 0 && sectionSteps % value === 0
        && value <= sourceSpan);
    if (cellChoices.length) {
      // A and its length together, so that a cell whose boundaries can only land in
      // held material gets lengthened rather than taken. Every candidate length here
      // divides the section, so a longer motif is still a whole number of cells.
      const scoredCell = ctx.profile || style.name ? pickCell(cellChoices, ctx) : null;
      const length = scoredCell ? scoredCell.length : weighted(cellChoices, random);
      const maxStart = Math.max(0, sourceSpan - length);
      // The two halves of the motif. `first` is scored where a profile exists, and
      // `second` is normally the cell straight after it — an A/B built out of adjacent
      // source material is a phrase answering itself rather than two unrelated grabs.
      const first = scoredCell
        ? scoredCell.offset
        : sourceStart(Math.max(0, sourceSpan - length * 2) || maxStart, random, intensity);
      // B is normally the cell straight after A — a phrase answering itself, rather
      // than two unrelated grabs. Normally, not always: if carrying straight on would
      // put the answer's boundaries through held material, a scored cell elsewhere is
      // the better musician's choice. Without a profile there is nothing to check
      // against and the adjacent cell stands, as it always did.
      const adjacent = first + length <= maxStart ? first + length : null;
      let second = adjacent;
      if (adjacent == null) second = pickOffset(length, ctx, { exclude: first });
      else if (ctx.profile
        && boundaryCut(sourceBase + adjacent, length, ctx.profile) > CUT_TOLERANCE) {
        const scored = pickOffset(length, ctx, { exclude: first });
        if (boundaryCut(sourceBase + scored, length, ctx.profile)
          < boundaryCut(sourceBase + adjacent, length, ctx.profile)) second = scored;
      }
      if (second === first && maxStart > 0) second = nudgeOffset(first, length, style, sourceBase, sourceSpan);
      ctx.previousEnd = sourceBase + second + length;
      const operations = [];
      for (let output = 0; output < sectionSteps; output += length) {
        const fromOffset = ((output / length) % 2) ? second : first;
        const operation = { from: sourceBase + fromOffset, length, repeats: 1, transpose };
        const prior = operations[operations.length - 1] || previous;
        if (operationEqual(prior, operation)) {
          operation.from = sourceBase + nudgeOffset(fromOffset, length, style, sourceBase, sourceSpan);
          // If the transpose dial is Off, keep the source key rather than using a
          // pitch change merely to disguise a duplicate at a one-cell boundary.
          if (operationEqual(prior, operation) && transpose !== 0) {
            operation.transpose = operation.transpose === 0 ? 2 : 0;
          }
        }
        operations.push(operation);
      }
      return operations;
    }
  }
  // Most sections are one recognisable loop: a four-bar phrase, a two-bar phrase
  // twice, or a one-bar figure four times. Only a minority opens up into smaller
  // collage cuts, so the form remains audible instead of becoming a list of tiny
  // unrelated edits.
  const loopChoices = style.name
    ? styleCells(style, sectionSteps, sourceSpan)
      .filter(([value]) => sectionSteps % value === 0 && sectionSteps / value <= 4)
    : PHRASE_LENGTH_WEIGHTS
      .map(([value, weight]) => [value, weight * (
        value >= 32 ? 1 + (1 - intensity) * 8
          : value === 16 ? 1 + (1 - intensity) * 2 : 1)])
      .filter(([value]) => value <= sourceSpan
        && value <= sectionSteps && sectionSteps / value <= 4);
  // One recognisable loop is the most Familiar shape a section can take, so the dial
  // moves this too: at Different the generator opens the section up into cells instead.
  const loopChance = style.loopChance == null
    ? 0.96 - intensity * 0.12
    : Math.max(0, Math.min(0.95, style.loopChance + (0.5 - ctx.variation) * 0.3));
  if (loopChoices.length && random() < loopChance) {
    // Every candidate `pickCell` may escalate to comes out of `loopChoices`, which is
    // already filtered to lengths that divide the section — so a longer, safer phrase
    // is still a whole number of passes.
    const { length, offset } = pickCell(loopChoices, ctx);
    const repeats = sectionSteps / length;
    ctx.previousEnd = sourceBase + offset + length;
    const operation = { from: sourceBase + offset, length, repeats, transpose };
    if (!operationEqual(previous, operation)) return [operation];
    const shifted = sourceSpan > length
      ? sourceBase + nudgeOffset(offset, length, style, sourceBase, sourceSpan) : operation.from;
    if (shifted !== operation.from) return [{ ...operation, from: shifted }];
    return transpose === 0
      ? [operation]
      : [{ ...operation, transpose: operation.transpose === 0 ? 2 : 0 }];
  }
  const operations = [];
  // Cells this section has already established. Reusing one is what makes a section
  // hang together rather than reading as a list of unrelated edits, so Familiar reaches
  // back into this often and Different rarely.
  const motifs = [];
  let output = 0;
  while (output < sectionSteps) {
    const remaining = sectionSteps - output;
    const choices = style.name
      ? styleCells(style, remaining, sourceSpan)
      : PHRASE_LENGTH_WEIGHTS.filter(([value]) => value <= remaining && value <= sourceSpan);
    const lengths = choices.length ? choices : [[Math.min(1, remaining), 1]];
    let length = null;
    let offset = null;
    // A motif returning, in preference to new material. Only where it fits the space
    // that is left, and never as the very first cell — there is nothing to return to.
    const reuse = style.name ? motifs.filter((motif) => motif.length <= remaining) : [];
    if (reuse.length && random() < (1 - ctx.variation) * 0.55) {
      const motif = reuse[Math.floor(random() * reuse.length)];
      length = motif.length;
      offset = motif.offset;
    } else {
      // Glitches are still possible, but only as an occasional subdivision inside a
      // phrase. The normal choices are beat/half-bar/bar lengths. In a styled
      // generation they exist at all only because Allow glitches was switched on.
      if (style.glitches && remaining > 8 && random() < 0.01 + intensity * 0.09) {
        const glitches = [[1, 4], [2, 6], [4, 10], [8, 12]]
          .filter(([value]) => value <= remaining && value <= sourceSpan);
        if (glitches.length) {
          length = weighted(glitches, random);
          offset = pickOffset(length, ctx);
        }
      }
      if (length == null) {
        // Every length `pickCell` may escalate to comes out of `lengths`, which is
        // already filtered to what fits the space left, so it cannot overrun.
        ({ length, offset } = pickCell(lengths, ctx));
        motifs.push({ length, offset });
      }
    }
    const maxRepeats = Math.min(4, Math.max(1, Math.floor(remaining / length)));
    const repeats = weighted(repeatWeights(pattern).filter(([value]) => value <= maxRepeats), random);
    const op = { from: sourceBase + offset, length, repeats, transpose };
    const previousOp = operations[operations.length - 1] || previous;
    if (operationEqual(previousOp, op)) {
      if (sourceSpan > length) op.from = sourceBase + nudgeOffset(offset, length, style, sourceBase, sourceSpan);
      else if (transpose !== 0) op.transpose = op.transpose === 0 ? 2 : 0;
    }
    ctx.previousEnd = op.from + op.length;
    operations.push(op);
    output += length * repeats;
  }
  return operations;
}

function validateForm(form, sourceSteps) {
  if (form == null) return null;
  if (!Array.isArray(form) || !form.length) throw new Error('Rearrange JSON has an invalid form');
  let cursor = 0;
  const out = form.map((raw, index) => {
    const start = int(raw?.start);
    const end = int(raw?.end);
    const source = raw?.source == null ? null : int(raw.source);
    const role = typeof raw?.role === 'string' ? raw.role : '';
    const name = typeof raw?.name === 'string' ? raw.name : '';
    if (start == null || end == null || !name || !REARRANGE_FORM_ROLES.includes(role)) {
      throw new Error(`Form section ${index + 1} has invalid fields`);
    }
    if (start !== cursor || end <= start || end > sourceSteps) {
      throw new Error(`Form section ${index + 1} is not a contiguous output range`);
    }
    if (source != null && (source < 0 || source >= sourceSteps)) {
      throw new Error(`Form section ${index + 1} has an invalid source range`);
    }
    cursor = end;
    return { name, role, start, end, ...(source == null ? {} : { source }) };
  });
  if (cursor !== sourceSteps) throw new Error('Rearrange form does not cover the output');
  return out;
}

/**
 * Generate a same-length recipe for a source song.
 *
 * TWO WAYS IN, ONE GENERATOR.
 *
 * Pass a `style` — 'phrase', 'groove' or 'chop' — and cell lengths and source
 * alignment become hard gates, which is what the desk does. Pass the older continuous
 * `extremeness`/`patterning` instead and the behaviour is exactly what it always was;
 * that path is not a separate generator kept alive beside this one, it is this one
 * with `grid: null` and the original weights. See `resolveStyle`.
 *
 * Pass a rich `sourceProfile` (see lib/rearrange-profile.js) and every source choice
 * is SCORED rather than rolled: boundaries avoid held notes, neighbours are chosen to
 * agree harmonically, and section energy follows the form. Pass the old flat array of
 * per-bar densities, or nothing, and the choices fall back to the weighted random this
 * has always used — an unscored choice is not a worse choice when there is nothing to
 * score against.
 *
 * Deterministic for a given seed and set of inputs, with no dependency on browser APIs.
 */
export function generateRearrangement(sourceSteps, {
  seed = randomSeed(), random = null, sourceProfile = null, anchors = null, avoid = null,
  favourites = null, extremeness = REARRANGE_EXTREMENESS_DEFAULT,
  transposeAmount = REARRANGE_TRANSPOSE_DEFAULT, patterning = REARRANGE_PATTERN_DEFAULT,
  style = null, variation = REARRANGE_VARIATION_DEFAULT, allowGlitches = false,
  progression = 'off', key = null, walk = REARRANGE_WALK_DEFAULT,
} = {}) {
  if (!Number.isInteger(sourceSteps) || sourceSteps <= 0) {
    throw new RangeError('sourceSteps must be a positive integer');
  }
  const rng = random || seededRandom(seed);
  const actualSeed = Number(seed) >>> 0;
  const transpose = clampControl(transposeAmount, REARRANGE_TRANSPOSE_DEFAULT);
  const resolvedStyle = resolveStyle(style, allowGlitches);
  const varied = clampControl(variation, REARRANGE_VARIATION_DEFAULT);
  // With a style in charge, Variation IS the intensity dial. Everything Extremeness
  // still reaches — how widely source phrases are sampled, how often a lift is taken,
  // how often a permitted glitch fires — moves with the one control the desk shows,
  // so there is no second dial quietly deciding things from behind a preset.
  const intensity = resolvedStyle.name ? varied : clampExtremeness(extremeness);
  // Variation replaces Patterning where a style is in charge: the two are the same
  // question asked from opposite ends, so the dial is mapped rather than added to.
  const pattern = resolvedStyle.patterning == null
    ? clampControl(patterning, REARRANGE_PATTERN_DEFAULT)
    : clampControl(resolvedStyle.patterning + (0.5 - varied) * 0.5, REARRANGE_PATTERN_DEFAULT);
  // A rich profile is what turns scoring on. A plain array is still read for section
  // energy by `profileScore`, exactly as before.
  const rich = sourceProfile && !Array.isArray(sourceProfile) && sourceProfile.steps > 0
    ? sourceProfile : null;
  const energyProfile = Array.isArray(sourceProfile) ? sourceProfile
    : rich ? Array.from(rich.energy) : null;
  // CHORD LOOPS need a key to move degrees in. A caller-supplied `key` wins outright —
  // the person at the desk saying "this is in D minor" outranks any analysis. Failing
  // that, the analysis's BEST key is taken even when the song does not settle clearly:
  // an ambiguous reading is nearly always the relative major/minor pair, which share a
  // scale, so the walk comes out the same notes either way — and a low-confidence
  // guess that walks is more musical than a refusal that leaves the dial dead. The
  // desk shows the guess as a guess; only a song with no pitched content at all has
  // genuinely nothing to walk in.
  const wantProgression = progression && progression !== 'off';
  const overrideKey = key && Number.isInteger(key.tonic) && key.tonic >= 0 && key.tonic <= 11
    ? { tonic: key.tonic, minor: !!key.minor } : null;
  const detected = wantProgression && !overrideKey && rich ? detectKey(rich) : null;
  const keyed = wantProgression
    ? overrideKey || (detected ? { tonic: detected.tonic, minor: detected.minor } : null)
    : null;
  // ONE PITCH SYSTEM PER RECIPE. While chord loops are walking, the chromatic dial is
  // ignored entirely — not just in the walking sections. A verse lifted a whole tone
  // chromatically next to a chorus walking diatonic chords is two unrelated pitch
  // grammars fighting over one song, and the same reading on the dial has to mean the
  // same thing every time: with a chord loop on, it means nothing, and the desk says
  // so on the control itself.
  const chromatic = keyed ? 0 : transpose;
  // One walk per ROLE, chosen once so every returning Chorus takes the same trip. A
  // major-key song takes the axis progression whatever was asked; the minor palettes
  // are the club vocabulary and their numerals only mean something in minor.
  const roleChords = new Map();
  const chordsForRole = (role) => {
    if (!keyed || role === 'Intro' || role === 'Outro') return null;
    if (roleChords.has(role)) return roleChords.get(role);
    let chords = null;
    if (!keyed.minor) chords = MAJOR_PROGRESSION;
    else if (REARRANGE_PROGRESSIONS[progression]) chords = REARRANGE_PROGRESSIONS[progression].minor;
    else {
      const names = REARRANGE_PROGRESSION_NAMES;
      chords = REARRANGE_PROGRESSIONS[names[Math.floor(rng() * names.length)]].minor;
    }
    roleChords.set(role, chords);
    return chords;
  };
  const operations = [];
  const form = [];
  const roleSources = new Map();
  const roleTemplates = new Map();
  const usedSources = new Set();
  const sections = formFor(sourceSteps);
  const phraseSpan = Math.min(PHRASE_STEPS, sourceSteps);
  const candidates = sourceCandidates(sourceSteps, phraseSpan);
  const normalizedFavourites = Array.isArray(favourites)
    ? favourites.map((raw) => ({
      from: int(raw?.from), length: int(raw?.length),
    })).filter((favourite) => favourite.from != null && favourite.length != null
      && favourite.from >= 0 && favourite.length > 0
      && favourite.from + favourite.length <= sourceSteps)
      .filter((favourite, index, list) => list.findIndex((other) =>
        other.from === favourite.from && other.length === favourite.length) === index)
    : [];
  const favouriteTotal = normalizedFavourites.reduce((sum, favourite) => sum + favourite.length, 0);
  if (favouriteTotal > sourceSteps) {
    throw new RangeError('Rearrange favourites exceed the song duration');
  }
  // Fit the requested slices into real form sections. Longest-first keeps a selected
  // half-bar/bar together even when the source ends with a shorter outro section.
  const favouriteBuckets = sections.map(() => []);
  const remainingSectionSteps = sections.map((section) => section.steps);
  for (const favourite of [...normalizedFavourites].sort((a, b) => b.length - a.length)) {
    const sectionIndex = remainingSectionSteps.findIndex((remaining) => remaining >= favourite.length);
    if (sectionIndex < 0) throw new RangeError('A Rearrange favourite does not fit the song form');
    favouriteBuckets[sectionIndex].push(favourite);
    remainingSectionSteps[sectionIndex] -= favourite.length;
  }
  let output = 0;
  let previous = null;
  for (const [sectionIndex, section] of sections.entries()) {
    const rejected = findAvoid(avoid, sectionIndex, section);
    let source = roleSources.get(section.role);
    if (source == null || rejected) {
      source = chooseSource(section.role, candidates, phraseSpan, energyProfile, usedSources, rng,
        rejected ? [rejected] : null, intensity);
      roleSources.set(section.role, source);
      usedSources.add(source);
    }
    const sourceSpan = Math.min(phraseSpan, sourceSteps - source);
    const preserved = anchoredOperations(findAnchor(anchors, sectionIndex, section),
      section.steps, sourceSteps);
    const hasFavourites = favouriteBuckets[sectionIndex].length > 0;
    let sectionOps = preserved && !hasFavourites ? { steps: section.steps, operations: preserved }
      : (rejected ? null : roleTemplates.get(section.role));
    if (preserved && !hasFavourites) {
      // A kept Verse/Chorus should remain the motif for its returning sections too;
      // that preserves the form's identity while the unkept roles are regenerated.
      roleTemplates.set(section.role, sectionOps);
    } else if (!sectionOps || sectionOps.steps !== section.steps || hasFavourites) {
      // Does this section walk a chord loop? Every four-bar Verse/Chorus/Bridge with a
      // key does. A repeated cell sitting on one chord for four bars is exactly the
      // material a progression exists for — the same riff walked around the loop IS
      // the arrangement — and an earlier draft that left some sections plain "for
      // contrast" read as the feature not working. Contrast comes from Intro/Outro
      // staying put and from the i bars the walk mask holds. A section that walks
      // takes NO chromatic lift on top: two pitch systems moving one phrase is mud.
      const palette = section.steps === PHRASE_STEPS && !hasFavourites
        ? chordsForRole(section.role) : null;
      const chords = palette ? walkedChords(palette, walk) : null;
      const sectionTranspose = chords ? 0 : chooseTranspose(section.role, rng, intensity, chromatic,
        rich, previous ? previous.from + previous.length : null, source);
      // What every source choice inside this section is scored against. `previousEnd`
      // moves as cells are laid down, so "does this agree with what came before" is
      // asked about the slice actually just heard rather than the section's opening.
      const ctx = {
        style: resolvedStyle,
        sourceBase: source,
        sourceSpan,
        random: rng,
        intensity,
        pattern,
        variation: varied,
        profile: rich,
        previousEnd: previous ? previous.from + previous.length : null,
        // A chorus should feel bigger than a verse. With no profile this is null and
        // energy simply stops being one of the things a slice is judged on.
        energyTarget: rich ? ROLE_ENERGY[section.role] ?? null : null,
      };
      // ONE CHUNK, REPEATED, WALKED. A section that carries chords is built as a
      // single bar cell played four times — the club shape. Walking an A/B pair
      // re-harmonises a phrase that is already answering itself, and listening said
      // exactly that: disjointed. The A/B and collage shapes still happen, in the
      // sections that play their written harmony.
      let built;
      if (chords) {
        const cell = pickCell([[16, 1]], ctx) || { length: 16, offset: 0 };
        built = [{ from: source + cell.offset, length: 16, repeats: 4, transpose: 0 }];
        ctx.previousEnd = source + cell.offset + 16;
      } else {
        built = sectionOperations(section.steps, sectionTranspose, previous,
          favouriteBuckets[sectionIndex], ctx);
      }
      sectionOps = {
        steps: section.steps,
        operations: chords ? applyHarmonyLoop(built, chords) : built,
        walked: !!chords,
      };
      // A favourite is a one-shot user request, not a new Verse/Chorus template. Do
      // not silently repeat it in every returning section of the same role.
      if (!hasFavourites) roleTemplates.set(section.role, sectionOps);
    } else {
      sectionOps = {
        steps: sectionOps.steps,
        operations: sectionOps.operations.map((operation) => ({ ...operation })),
      };
    }
    const sectionStart = output;
    const sectionOperationStart = operations.length;
    for (const operation of sectionOps.operations) {
      const copy = { ...operation };
      const prior = operations[operations.length - 1];
      // A walked section's repeats are the SAME cell on purpose — nudging one run to
      // break a "duplicate" would swap the riff mid-walk, which is worse than any
      // adjacent repetition could be.
      if (operationEqual(prior, copy) && !copy.favourite && !sectionOps.walked) {
        const maxOffset = Math.max(0, sourceSpan - copy.length);
        const offset = copy.from - source;
        copy.from = source + (maxOffset
          ? nudgeOffset(offset, copy.length, resolvedStyle, source, sourceSpan) : 0);
        // Never disguise a duplicate with a pitch change on a slice that already
        // carries a chord — that would stack both pitch systems on one operation.
        if (operationEqual(prior, copy) && chromatic > 0 && !copy.harmony) {
          copy.transpose = copy.transpose === 0 ? 2 : 0;
        }
      }
      const outputOperation = { ...copy };
      delete outputOperation.favourite;
      operations.push(outputOperation);
      output += copy.length * copy.repeats;
      previous = outputOperation;
    }
    const sectionOutputOperations = operations.slice(sectionOperationStart);
    form.push({
      name: section.name,
      role: section.role,
      start: sectionStart,
      end: output,
      source: sectionOutputOperations.length
        ? Math.min(...sectionOutputOperations.map((operation) => operation.from))
        : source,
    });
  }
  return {
    kind: REARRANGE_KIND,
    version: REARRANGE_VERSION,
    source: { steps: sourceSteps },
    seed: actualSeed,
    grid: REARRANGE_GRID,
    // The key rides in the recipe because harmony offsets mean nothing without it —
    // a saved file must replay the same chords on a desk that never ran the analysis.
    ...(keyed && operations.some((op) => op.harmony) ? { key: keyed } : {}),
    form,
    operations,
  };
}

function splitOperation(operation) {
  if (operation.length < 2) return [operation];
  const firstLength = Math.floor(operation.length / 2);
  const secondLength = operation.length - firstLength;
  const out = [];
  // Expand the repeat count so the two halves stay interleaved: A/B/A/B rather
  // than all of A followed by all of B. This is the useful musical result when
  // a joined eighth- or sixteenth-note cell is chopped into pieces.
  for (let repeat = 0; repeat < operation.repeats; repeat++) {
    out.push(
      { ...operation, from: operation.from, length: firstLength, repeats: 1 },
      { ...operation, from: operation.from + firstLength, length: secondLength, repeats: 1 },
    );
  }
  return out;
}

function rerollFrom(operation, sourceSteps, random) {
  const maxStart = Math.max(0, sourceSteps - operation.length);
  if (!maxStart) return operation.from;
  let next = operation.from;
  for (let attempt = 0; attempt < 8 && next === operation.from; attempt++) {
    next = Math.floor(random() * (maxStart + 1));
  }
  return next === operation.from ? (operation.from + 4) % (maxStart + 1) : next;
}

function compactAdjacentOperations(operations) {
  const out = [];
  for (const operation of operations) {
    const previous = out[out.length - 1];
    if (!previous || previous.from !== operation.from || previous.length !== operation.length
      || previous.transpose !== operation.transpose) {
      out.push({ ...operation });
      continue;
    }
    const room = 4 - previous.repeats;
    const joined = Math.min(room, operation.repeats);
    previous.repeats += joined;
    if (joined < operation.repeats) {
      out.push({ ...operation, repeats: operation.repeats - joined });
    }
  }
  return out;
}

/** Replace selected output time with a neighbouring slice, preserving song length. */
function removeSelectedOperations(operations, selected, sourceSteps, random) {
  const templates = operations
    .map((operation, index) => selected.has(index) ? null : operation);
  if (!templates.some(Boolean)) return null;
  const replacement = operations.map((operation, index) => {
    if (!selected.has(index)) return { ...operation };
    let template = null;
    for (let distance = 1; distance < operations.length && !template; distance++) {
      const left = index - distance;
      const right = index + distance;
      if (left >= 0 && !selected.has(left)) template = operations[left];
      else if (right < operations.length && !selected.has(right)) template = operations[right];
    }
    if (!template) return { ...operation };
    const duration = operation.length * operation.repeats;
    // When the neighbour divides the removed time, let it fill the gap as one compact
    // repeated row. Otherwise retain the selected row's shape but point it at new
    // neighbouring material; either way the old source slice is gone and duration stays
    // exact.
    if (duration % template.length === 0 && duration / template.length <= 4) {
      return {
        ...template,
        repeats: duration / template.length,
      };
    }
    return {
      ...operation,
      from: rerollFrom({ from: template.from, length: operation.length }, sourceSteps, random),
      transpose: template.transpose,
    };
  });
  return compactAdjacentOperations(replacement);
}

/**
 * Apply a small, exact-duration edit to selected recipe rows.
 *
 * These are audition controls rather than song edits. Every supported transform
 * preserves each selected row's output duration, so the recipe remains the same
 * length and its form boundaries stay valid.
 */
export function transformRearrangement(recipe, indices, action, { seed = recipe?.seed || 0 } = {}) {
  const sourceSteps = int(recipe?.source?.steps);
  if (!sourceSteps || !Array.isArray(recipe?.operations) || !recipe.operations.length) {
    throw new Error('Rearrange has no operations to transform');
  }
  const selected = new Set((Array.isArray(indices) ? indices : [indices])
    .map((index) => int(index)).filter((index) => index != null && index >= 0
      && index < recipe.operations.length));
  if (!selected.size) throw new Error('Select one or more Rearrange slices first');
  const random = seededRandom(seed);
  if (action === 'remove') {
    const operations = removeSelectedOperations(recipe.operations, selected, sourceSteps, random);
    if (!operations) return { recipe: { ...recipe }, changed: 0 };
    return {
      recipe: {
        ...recipe,
        seed: Number(seed) >>> 0,
        operations,
      },
      changed: selected.size,
    };
  }
  let changed = 0;
  const operations = [];
  recipe.operations.forEach((raw, index) => {
    const operation = { ...raw };
    if (!selected.has(index)) { operations.push(operation); return; }
    let replacement = [operation];
    if (action === 'split') replacement = splitOperation(operation);
    else if (action === 'unroll' && operation.repeats > 1) {
      replacement = new Array(operation.repeats).fill(null)
        .map(() => ({ ...operation, repeats: 1 }));
    }
    else if (action === 'double-repeats' && operation.length % 2 === 0
      && operation.length >= 2 && operation.repeats * 2 <= 4) {
      replacement = [{ ...operation, length: operation.length / 2, repeats: operation.repeats * 2 }];
    } else if (action === 'half-repeats' && operation.repeats % 2 === 0
      && operation.from + operation.length * 2 <= sourceSteps) {
      replacement = [{ ...operation, length: operation.length * 2, repeats: operation.repeats / 2 }];
    } else if (action === 'reroll') {
      replacement = [{ ...operation, from: rerollFrom(operation, sourceSteps, random) }];
    }
    if (replacement.length !== 1 || !operationEqual(replacement[0], operation)) changed++;
    operations.push(...replacement);
  });
  return {
    recipe: {
      ...recipe,
      seed: Number(seed) >>> 0,
      operations,
    },
    changed,
  };
}

/** Validate and clone a recipe before it reaches the audio engine. */
export function validateRearrangement(value, sourceSteps, { songId = null } = {}) {
  if (!value || value.kind !== REARRANGE_KIND || value.version !== REARRANGE_VERSION) {
    throw new Error('Not a supported Rearrange JSON file');
  }
  if (value.grid !== REARRANGE_GRID) throw new Error('Rearrange JSON uses an unsupported grid');
  if (!Number.isInteger(sourceSteps) || sourceSteps <= 0) {
    throw new RangeError('The current song has no playable steps');
  }
  if (value.source?.steps !== sourceSteps) {
    throw new Error(`This recipe needs ${value.source?.steps || '?'} steps; the current song has ${sourceSteps}`);
  }
  const form = validateForm(value.form, sourceSteps);
  if (songId && value.source?.song && value.source.song !== songId) {
    throw new Error(`This recipe belongs to ${value.source.song}`);
  }
  if (!Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff) {
    throw new Error('Rearrange JSON has an invalid seed');
  }
  const drums = value.drums == null ? 'original' : value.drums;
  if (!REARRANGE_DRUM_MODES.includes(drums)) {
    throw new Error('Rearrange JSON has an unsupported drum mode');
  }
  // The key is optional, but harmony offsets are meaningless without one: degrees
  // only name notes once a tonic and a mode say which scale they are degrees OF.
  let key = null;
  if (value.key != null) {
    const tonic = int(value.key.tonic);
    if (tonic == null || tonic < 0 || tonic > 11 || typeof value.key.minor !== 'boolean') {
      throw new Error('Rearrange JSON has an invalid key');
    }
    key = { tonic, minor: value.key.minor };
  }
  if (!Array.isArray(value.operations) || !value.operations.length) {
    throw new Error('Rearrange JSON has no operations');
  }
  let total = 0;
  const operations = value.operations.map((raw, index) => {
    const from = int(raw?.from);
    const length = int(raw?.length);
    const repeats = int(raw?.repeats);
    const transpose = raw?.transpose == null ? 0 : int(raw.transpose);
    const harmony = raw?.harmony == null ? 0 : int(raw.harmony);
    if (from == null || length == null || repeats == null || transpose == null
      || harmony == null) {
      throw new Error(`Operation ${index + 1} has a non-integer field`);
    }
    if (from < 0 || length < 1 || from + length > sourceSteps) {
      throw new Error(`Operation ${index + 1} is outside the source song`);
    }
    if (repeats < 1 || repeats > 4) throw new Error(`Operation ${index + 1} has invalid repeats`);
    if (!REARRANGE_TRANSPOSES.includes(transpose)) {
      throw new Error(`Operation ${index + 1} has an unsupported transpose`);
    }
    if (harmony && (!key || Math.abs(harmony) > REARRANGE_HARMONY_RANGE)) {
      throw new Error(`Operation ${index + 1} has a chord offset ${key ? 'out of range' : 'but the recipe names no key'}`);
    }
    total += length * repeats;
    return { from, length, repeats, transpose, ...(harmony ? { harmony } : {}) };
  });
  if (total !== sourceSteps) {
    throw new Error(`Rearrange output is ${total} steps, expected ${sourceSteps}`);
  }
  return {
    kind: REARRANGE_KIND,
    version: REARRANGE_VERSION,
    source: {
      ...(value.source?.song ? { song: String(value.source.song) } : {}),
      ...(value.source?.title ? { title: String(value.source.title) } : {}),
      steps: sourceSteps,
    },
    seed: value.seed >>> 0,
    grid: REARRANGE_GRID,
    ...(drums === 'original' ? {} : { drums }),
    ...(key ? { key } : {}),
    ...(form ? { form } : {}),
    operations,
  };
}

/** Return the source mapping and operation/repeat row for an output step. */
export function rearrangementPosition(recipe, outputStep) {
  const total = recipe?.source?.steps || 0;
  if (!(total > 0) || !Number.isFinite(outputStep)) return null;
  const wrapped = ((outputStep % total) + total) % total;
  let cursor = 0;
  for (let index = 0; index < recipe.operations.length; index++) {
    const operation = recipe.operations[index];
    const duration = operation.length * operation.repeats;
    if (wrapped < cursor + duration || index === recipe.operations.length - 1) {
      const local = wrapped - cursor;
      const repeat = Math.min(operation.repeats - 1, Math.floor(local / operation.length));
      return {
        outputStep: wrapped,
        sourceStep: operation.from + (local % operation.length),
      operationIndex: index,
      repeatIndex: repeat,
      operation,
      outputStart: cursor,
      outputEnd: cursor + duration,
      ...(Array.isArray(recipe.form) ? (() => {
        const formIndex = recipe.form.findIndex((section) => wrapped >= section.start && wrapped < section.end);
        return formIndex < 0 ? {} : { formIndex, form: recipe.form[formIndex] };
      })() : {}),
    };
    }
    cursor += duration;
  }
  return null;
}

export function rearrangementOutputSteps(recipe) {
  return recipe?.operations?.reduce((sum, operation) => sum + operation.length * operation.repeats, 0) || 0;
}
