// Temporary, deterministic song-rearrangement recipes.
//
// A recipe names ranges in the song's transport units (sixteenths) and says how
// many times each range is heard in the new output.  It deliberately contains no
// note data: the live engine resolves the current song/mix at playback time, so a
// recipe remains small, readable, and safe to discard without changing a song.

import {
  cutCost, chromaMatch, energyOver, detectKey, walkCellScore, detectPhraseGrid, sourceDegree,
  detectSongForm,
} from './rearrange-profile.js';

export const REARRANGE_KIND = 'mashenstein-rearrangement';
export const REARRANGE_VERSION = 2;
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
// Every semitone in the octave either way. The old shortlist (±2/5/7/12) was the set the
// GENERATOR picks from and it still is — see REARRANGE_GENERATED_TRANSPOSES — but there is
// no reason a person reaching for a minor third on one slice should be told it is not a
// supported interval. This list is what the validator accepts and what the desk offers.
/** Named stutter rhythms, as relative cell weights across the slice's own time. */
export const REARRANGE_STUTTER_SHAPES = Object.freeze({
  gallop: Object.freeze([2, 1, 1]),
  ramp: Object.freeze([4, 2, 1, 1]),
  build: Object.freeze([1, 1, 2, 4]),
});

export const REARRANGE_TRANSPOSES = Object.freeze(
  Array.from({ length: 25 }, (unused, index) => index - 12));
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
export const REARRANGE_DRUM_MODES = Object.freeze([
  'original', 'song', 'basic4', 'halftime', 'break', 'boombap', 'garage',
  'disco', 'house', 'deephouse', 'techno']);
/** The generated kits: modes that ignore what the song wrote and play their own pattern. */
export const REARRANGE_GENERATED_DRUMS = Object.freeze(
  ['basic4', 'halftime', 'break', 'boombap', 'garage',
    'disco', 'house', 'deephouse', 'techno']);
export const REARRANGE_DRUM_DEFAULT = 'song';

/**
 * The kits in energy order, for the desk's Auto setting: the song's own groove at the
 * bottom, four-to-the-floor at the top. Auto is resolved to one of these names BEFORE
 * the recipe is built, so a saved file always names a real kit and nothing downstream
 * has to know the dial exists.
 */
export const REARRANGE_DRIVE_KITS = Object.freeze([
  'song', 'halftime', 'boombap', 'garage', 'deephouse', 'disco', 'house', 'techno']);
export function driveDrumKit(drive = 0.5) {
  const amount = clampControl(drive, REARRANGE_CREATIVE_DEFAULTS.drive);
  return REARRANGE_DRIVE_KITS[
    Math.min(REARRANGE_DRIVE_KITS.length - 1, Math.floor(amount * REARRANGE_DRIVE_KITS.length))];
}

export const REARRANGE_FORM_ROLES = Object.freeze([
  'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro',
]);

// How big each part of the form should feel, against the song's own busiest bar. Only
// consulted when a rich profile can measure energy; the ordering is the point rather
// than the exact numbers — a chorus above a verse, an intro and an outro below both.
const ROLE_ENERGY = Object.freeze({
  Intro: 0.35, Verse: 0.55, Chorus: 0.95, Bridge: 0.5, Outro: 0.3,
  // Added with the form grammars. A Drop is the loudest thing in a dance form, a Build
  // leans up into it, a Breakdown drops away, and a Loop sits in the middle because a
  // one-letter form has nothing to contrast against.
  Build: 0.7, Drop: 1, Breakdown: 0.4, Loop: 0.6, Prechorus: 0.7,
});

/**
 * Which part of the source a role reaches for, as a table rather than a stair of `if`s.
 *
 * `first`/`last` are positional — an Intro opens with the song's opening and an Outro
 * closes with its ending. `dense`/`sparse` are scored against the energy profile. A role
 * that is not named here scores neutrally, which is what every role outside the original
 * five used to do by accident and now does on purpose.
 */
const ROLE_SOURCE = Object.freeze({
  Intro: 'first', Outro: 'last',
  Chorus: 'dense', Drop: 'dense', Build: 'dense',
  Verse: 'sparse', Breakdown: 'sparse',
});

const PHRASE_STEPS = 64; // four bars at sixteen sixteenths per bar
const PHRASE_BAR_STEPS = 16; // one bar, the unit a form grammar counts in

const PHRASE_LENGTH_WEIGHTS = Object.freeze([
  [4, 7], [8, 34], [16, 42], [32, 10], [64, 1],
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
 * Sub-beat cells are not a style. They only appear in an explicit section-ending fill;
 * normal material remains beat-aligned and phraseable.
 */
export const REARRANGE_STYLES = Object.freeze({
  mix: {
    // Mix is resolved per letter during generation. Its gates are the union of the
    // three named styles; the per-letter choice below supplies the actual musical
    // identity while keeping repeated letters consistent.
    cells: [[4, 20], [8, 38], [16, 30], [32, 10], [64, 2]],
    grid: 4,
    pairChance: 0.58,
    loopChance: 0.58,
    patterning: 0.58,
  },
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
// Keep the three historical names in this export for callers that use it as a style
// gate. The desk's richer choice list adds Mix without making old recipes or tests
// suddenly treat the union gate as a named cell style.
export const REARRANGE_STYLE_NAMES = Object.freeze(['phrase', 'groove', 'chop']);
export const REARRANGE_STYLE_CHOICES = Object.freeze(['mix', ...REARRANGE_STYLE_NAMES]);
export const REARRANGE_STYLE_DEFAULT = 'groove';
export const REARRANGE_VARIATION_DEFAULT = 0.45;

/**
 * ---- THE FOUR DIALS ----------------------------------------------------------
 *
 * Variation was one slider doing six jobs — how far down the candidate ranking a
 * pick could reach, how often a motif came back, how many passes a cell took, how
 * wide the source pool was, how likely a lift was. Asking "familiar or different?"
 * about all of that at once is why it never quite answered anything. It is four
 * questions, so it is four dials:
 *
 *   MOOD      dark ↔ euphoric   — the key it walks in, the palette, the lift's direction
 *   HYPNOSIS  collage ↔ loop    — how much the section repeats itself
 *   CHAOS     tame ↔ feral      — how far a choice may stray from the safest one
 *   DRIVE     chill ↔ peak-time — energy: density, fills, chord pace, the kit
 *
 * `variation` is still accepted and still means exactly what it meant: it maps onto
 * hypnosis and chaos from opposite ends (see `resolveCreative`), so every recipe made
 * by an older caller generates identically. Same rule the retired `extremeness` and
 * `patterning` dials get.
 */
export const REARRANGE_CREATIVE_DEFAULTS = Object.freeze({
  mood: 0.5, hypnosis: 0.55, chaos: 0.45, drive: 0.5,
});

// The minimum score a walking cell needs before a section is allowed to carry
// harmony. It is intentionally exported so taste can be tuned and tested without
// hiding a magic number in the generator.
export const REARRANGE_WALK_MIN = 0.18;

// Base material stays on a beat boundary. Sub-beat work is reserved for an explicit
// section-ending fill, so a recipe reads as an arrangement with a deliberate pickup
// rather than an accidental collection of off-grid cuts.
export const REARRANGE_FILL_SHAPES = Object.freeze({
  burst: Object.freeze({ label: 'Burst', steps: 4, cells: [[1, 4]] }),
  rush: Object.freeze({ label: 'Rush', steps: 8, cells: [[2, 2], [1, 4]] }),
  machinegun: Object.freeze({ label: 'Machine gun', steps: 16, cells: [[4, 2], [2, 2], [1, 4]] }),
});
export const REARRANGE_FILL_NAMES = Object.freeze(Object.keys(REARRANGE_FILL_SHAPES));
export const REARRANGE_FILL_DEFAULT = 'auto';

// Chord pace controls how long a riff stays home before it moves. Slow is deliberately
// the default: 1 1 1 1 | 4 4 | 5 | 6 reads like a song section, not a new chord every bar.
export const REARRANGE_CHORD_PACES = Object.freeze({
  slow: { label: 'Slow', repeat: 4 },
  steady: { label: 'Steady', repeat: 2 },
  active: { label: 'Active', repeat: 1 },
});
export const REARRANGE_CHORD_PACE_NAMES = Object.freeze(Object.keys(REARRANGE_CHORD_PACES));
export const REARRANGE_CHORD_PACE_DEFAULT = 'slow';

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
  pop: { label: 'i – iv – v – VI', minor: [0, 3, 4, 5] },          // slow song grammar
  edm: { label: 'i – VI – III – VII', minor: [0, -2, 2, -1] },     // Titanium, Animals
  house: { label: 'i – v – VI – iv', minor: [0, -3, -2, 3] },      // the nu-disco loop
  anthem: { label: 'VI – VII – i – i', minor: [-2, -1, 0, 0] },    // the festival build
  dark: { label: 'i – iv – VI – v', minor: [0, 3, -2, -3] },       // synthwave/dark pop
});
export const REARRANGE_PROGRESSION_NAMES = Object.freeze(Object.keys(REARRANGE_PROGRESSIONS));

/**
 * ---- THE FULL PALETTE SHELF ------------------------------------------------------
 *
 * The five names above are what a caller may ask for BY NAME, and that list is closed —
 * it is the desk's progression control. Mood's Auto path reaches a wider shelf, because
 * one palette per dial position meant one progression per song, forever: the same four
 * chords whatever the seed, in every section, in every recipe made at that setting.
 *
 * DISTINCT IN THE FIRST TWO MOVING CHORDS IS THE ADMISSION TEST, and it is a harder
 * test than it sounds. `pacedChords` at 'slow' — the pace every recipe uses until Drive
 * passes 0.6 — keeps only a palette's MOVING degrees, in order, in a fixed rhythm. And
 * every section that walks is exactly PHRASE_STEPS long, four bars, which takes the
 * `bars >= 4` shape: `i i m0 m1`. The third moving chord never sounds at all in a
 * generated recipe, and only appears on the longer sections the transform paths build.
 *
 * So a palette IS its first two moving chords here. I–V–vi–IV and I–V–vi–iii are the
 * same palette where it counts, whatever they look like written down. Every entry below
 * differs from every other in that pair, or it does not earn a place on the shelf.
 *
 * Note that a degree may be spelled up or down — -3 and +4 are both v, an octave apart —
 * and the sign is chosen to keep the shift small, not to change the chord.
 */
const MINOR_PALETTES = Object.freeze({
  ...Object.fromEntries(REARRANGE_PROGRESSION_NAMES
    .map((name) => [name, REARRANGE_PROGRESSIONS[name].minor])),
  andalusian: Object.freeze([0, -1, -2, -3]),  // i – VII – VI – v, the descending tetrachord
  epic: Object.freeze([0, 2, -1, -2]),         // i – III – VII – VI, the trailer loop
  lament: Object.freeze([0, -2, 3, 4]),        // i – VI – iv – v, doo-wop in the minor
  modal: Object.freeze([0, -1, 3, -2]),        // i – VII – iv – VI, the rock minor
});
// The major-key walks. The axis progression — I–V–vi–IV — answered every request on its
// own until Mood arrived, and it is still the middle of the ladder; the other four exist
// because a major song had nowhere to go when the dial moved. The lift is the festival
// cadence, IV–V–I, which under a reduced walk mask comes out as the oldest turnaround
// there is: three bars home and the dominant into the bar line.
const MAJOR_PALETTES = Object.freeze({
  sensitive: Object.freeze([0, -5, -2, 3]),    // I – iii – vi – IV, the soft one
  ballad: Object.freeze([0, 3, -2, -3]),       // I – IV – vi – V, the slow-song walk
  axis: Object.freeze([0, -3, -2, 3]),         // I – V – vi – IV, the axis
  doowop: Object.freeze([0, -2, 3, 4]),        // I – vi – IV – V, the fifties turnaround
  lift: Object.freeze([3, 4, 0, 0]),           // IV – V – I – I, the festival cadence
});

/** The degrees behind a palette name, whichever shelf it sits on. */
export function paletteDegrees(name) {
  return MINOR_PALETTES[name] || MAJOR_PALETTES[name] || null;
}
// How many bars of the four-bar loop actually move. Listening said a full walk is
// often too much: the riff loses its footing when every bar re-harmonises. The
// default holds home for two bars and moves on the back half; the turnaround holds
// three and lifts only into the bar line — the oldest trick in pop, and the subtlest.
export const REARRANGE_WALKS = Object.freeze({ auto: 2, full: 4, half: 2, turn: 1, cadence: 2 });
export const REARRANGE_WALK_DEFAULT = 'half';

/**
 * ---- MOOD: WHICH KEY, WHICH PALETTE, WHICH DIRECTION -----------------------------
 *
 * The emotion dial's whole job is harmonic. It moves three things, and the first is
 * the big one: at the dark end a major song is re-read in its RELATIVE MINOR, at the
 * bright end a minor song in its relative major.
 *
 * Relative, not parallel, and that is the whole trick. A relative pair shares its
 * pitch-class set exactly — A minor and C major are the same seven notes — so every
 * note of the material is still a scale tone in the new key and `harmonicShift` walks
 * it cleanly. The parallel minor would push a third of the song's notes onto the
 * "nearest scale tone below, keep the sharpness" branch on every walked bar, which is
 * the smudge that branch exists to survive rather than a sound to aim for. What
 * actually changes is where HOME is: the same riff over an Am–F–C–G loop instead of a
 * C–G–Am–F one is the same notes read as sad, which is exactly the ask.
 *
 * Only ever applied to a DETECTED key. Somebody who names a key at the desk has said
 * what the song is in, and no dial overrules that.
 */
export function moodWalkKey(key, mood = REARRANGE_CREATIVE_DEFAULTS.mood) {
  if (!key) return key;
  const amount = clampControl(mood, REARRANGE_CREATIVE_DEFAULTS.mood);
  if (amount <= 1 / 3 && !key.minor) return { tonic: (key.tonic + 9) % 12, minor: true };
  if (amount >= 2 / 3 && key.minor) return { tonic: (key.tonic + 3) % 12, minor: false };
  return { tonic: key.tonic, minor: !!key.minor };
}

/**
 * ---- WHICH PALETTE AUTO REACHES FOR ----------------------------------------------
 *
 * A BAND IS A SET, NOT A PALETTE. The ladder still runs from the synthwave loop at the
 * bottom to the festival build at the top, and each rung still means what its word on
 * the desk says — but a rung now holds two or three palettes that agree about the mood
 * and disagree about the route. Which one a section takes is `palettePick` below.
 *
 * The first entry of each band is the palette that band has always given, so
 * `moodPalette(mood)` with no pick still answers exactly what it used to.
 */
const MOOD_MINOR_BANDS = Object.freeze([
  Object.freeze(['dark', 'andalusian']),           // Noir
  Object.freeze(['house', 'andalusian', 'lament']),// Brooding
  Object.freeze(['pop', 'lament', 'modal']),       // Bittersweet
  Object.freeze(['edm', 'epic', 'pop']),           // Golden
  Object.freeze(['anthem', 'edm', 'epic']),        // Euphoric
]);
// The major ladder. Noir holds a single palette because a major song only stays major
// down here when somebody NAMED the key — a detected one has already been re-read into
// its relative minor by `moodWalkKey` — and the one palette it gets is the unresolved
// one, ending on V.
const MOOD_MAJOR_BANDS = Object.freeze([
  Object.freeze(['sensitive']),                    // Noir
  Object.freeze(['ballad', 'sensitive']),          // Brooding
  Object.freeze(['axis', 'ballad']),               // Bittersweet
  Object.freeze(['doowop', 'axis']),               // Golden
  Object.freeze(['lift', 'doowop']),               // Euphoric
]);

function moodBand(mood) {
  const amount = clampControl(mood, REARRANGE_CREATIVE_DEFAULTS.mood);
  if (amount < 0.2) return 0;
  if (amount < 0.4) return 1;
  if (amount < 0.6) return 2;
  if (amount < 0.8) return 3;
  return 4;
}

/** Every palette this Mood setting may reach, in a minor key or a major one. */
export function moodPalettes(mood = REARRANGE_CREATIVE_DEFAULTS.mood, minor = true) {
  return (minor ? MOOD_MINOR_BANDS : MOOD_MAJOR_BANDS)[moodBand(mood)];
}

export function moodPalette(mood = REARRANGE_CREATIVE_DEFAULTS.mood, pick = 0, minor = true) {
  const set = moodPalettes(mood, minor);
  const index = Math.trunc(Number(pick)) || 0;
  return set[((index % set.length) + set.length) % set.length];
}

/**
 * WHICH palette within the band, for one role of one recipe.
 *
 * Hashed from the seed and the role rather than drawn from the running rng, for the
 * same reason `styleForLetter` is: the answer has to be a property of the form, stable
 * whatever else happened before it. Adding a favourite or a fill elsewhere in the song
 * must not re-harmonise the Chorus. Every returning Chorus therefore agrees by
 * construction, and re-rolling the seed re-rolls the harmony along with everything else
 * — which is the thing one palette per band could never do.
 *
 * The linear combination is run through `seededRandom` rather than taken modulo the
 * band size directly. A band holds two or three palettes, so a bare modulo reads the
 * bottom bit or two of the hash — and with both multipliers odd, that bottom bit is
 * just the parity of `seed + role`. Every odd seed picked identically. The PRNG is
 * there to mix, so mix with it.
 */
function palettePick(seed, role, count) {
  if (count <= 1) return 0;
  const code = typeof role === 'string' && role ? role.charCodeAt(0) : 0;
  const hash = (Math.imul(Number(seed) >>> 0, 1664525) + Math.imul(code, 1013904223)) >>> 0;
  return Math.min(count - 1, Math.floor(seededRandom(hash)() * count));
}

/**
 * How much of the loop moves. A dark section wants the full walk — the more chords it
 * passes through the heavier it sits — where a euphoric one wants the turnaround, all
 * lift and no wandering. The middle is the same 'half' the desk has always defaulted to.
 */
export function moodWalk(mood = REARRANGE_CREATIVE_DEFAULTS.mood) {
  const amount = clampControl(mood, REARRANGE_CREATIVE_DEFAULTS.mood);
  if (amount < 1 / 3) return 'full';
  if (amount > 2 / 3) return 'turn';
  return REARRANGE_WALK_DEFAULT;
}

/**
 * How much Mood wants a walked slice sitting on this degree.
 *
 * The numeral already says which way a degree leans: in minor, offsets 2, 5 and 6 land
 * on III, VI and VII — the major chords the key owns — where 1, 3 and 4 land on ii°, iv
 * and v. Euphoric leans on the bright ones and noir on the dark ones, by the same thumb
 * on the scale `chooseTranspose` puts on a chromatic lift, and for the same reason: it
 * is a preference, not a rule, so a dark setting still reaches a III now and then.
 *
 * Offset 0 is held NEUTRAL rather than read as its numeral. It is the tonic, but it is
 * also the option that takes the walk off the slice entirely, and a mood dial quietly
 * deleting harmony at one end would be the control doing something it does not say.
 */
function moodDegreeWeight(degree, minor, mood = REARRANGE_CREATIVE_DEFAULTS.mood) {
  if (!degree) return 1;
  const numeral = harmonyNumeral(degree, minor);
  const bright = numeral[0] === numeral[0].toUpperCase() && !numeral.includes('°');
  const lean = clampControl(mood, REARRANGE_CREATIVE_DEFAULTS.mood) - 0.5;
  return 1 + lean * 1.6 * (bright ? 1 : -1);
}

/**
 * How fast the chords move under a section. Slow is the song grammar and holds the
 * middle of the dial; only a genuinely driven setting starts changing chord every bar.
 */
export function drivePace(drive = REARRANGE_CREATIVE_DEFAULTS.drive) {
  const amount = clampControl(drive, REARRANGE_CREATIVE_DEFAULTS.drive);
  if (amount < 0.6) return 'slow';
  if (amount < 0.85) return 'steady';
  return 'active';
}

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

export function pacedChords(palette, bars, pace = REARRANGE_CHORD_PACE_DEFAULT, walk = REARRANGE_WALK_DEFAULT) {
  const active = REARRANGE_CHORD_PACE_NAMES.includes(pace) ? pace : REARRANGE_CHORD_PACE_DEFAULT;
  // Slow pacing owns the phrase grammar: it must still arrive at IV/V/vi even when a
  // legacy Walk setting asked for a reduced mask. The faster compatibility modes retain
  // the old walk selector for callers that explicitly choose them.
  const selected = active === 'slow' ? palette : walkedChords(palette, walk);
  if (bars <= 1) return [selected[0] || 0];
  if (active === 'active') return new Array(bars).fill(null)
    .map((_, index) => selected[index % selected.length] || 0);
  if (active === 'steady') {
    return new Array(bars).fill(null)
      .map((_, index) => selected[Math.floor(index / 2) % selected.length] || 0);
  }
  // Slow: hold tonic for the opening phrase, then let the remaining degrees arrive at
  // phrase-sized boundaries. Eight bars produce 1 1 1 1 | 4 4 | 5 | 6; four bars
  // compress to 1 1 | 4 | 5, still leaving the riff home before the lift.
  const moving = selected.filter((degree) => degree !== 0);
  const eight = () => [0, 0, 0, 0, moving[0] || 0, moving[0] || 0, moving[1] || 0, moving[2] || 0];
  const four = () => [0, 0, moving[0] || 0, moving[1] || 0];
  // One phrase's worth of shape: hold home, then move at its end. The padding goes at the
  // FRONT for the same reason the eight-bar shape opens on four tonic bars — the point of
  // slow pacing is that the riff is established before the harmony leaves.
  //
  // It must return exactly `n` entries. The old code sliced a four-entry array to `n`,
  // which silently returned FOUR chords for a five-, six- or seven-bar part — unreachable
  // while every part was exactly four bars, and immediately reachable once form grammars
  // could emit a six-bar one.
  const shapeFor = (n) => {
    if (n >= 8) return eight();
    if (n >= 4) return [...new Array(n - 4).fill(0), ...four()];
    return new Array(n).fill(0);
  };
  if (bars <= 8) return shapeFor(bars);
  // Longer parts REPEAT the phrase shape rather than stretching it. Holding the tonic for
  // twelve bars and then moving in the last four is not a slow progression, it is a part
  // that forgot to begin — and form grammars made long parts ordinary, where the four-bar
  // gate meant this branch could only ever see eight.
  const out = [];
  let left = bars;
  while (left > 8) { out.push(...eight()); left -= 8; }
  out.push(...shapeFor(left));
  return out;
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
 * Walk a section's slices through a paced chord loop. Active mode changes per bar;
 * slower modes hold the riff over phrase-sized groups.
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

/**
 * THE FOUR DIALS, AND THE ONE THEY REPLACED — resolved in exactly one place.
 *
 * A dial that was given a value wins. Anything not given falls back to `variation`,
 * which is the same number the old single slider always was — hypnosis is its far side
 * (Familiar WAS "repeat yourself"), chaos is its near side. So an older caller passing
 * only `variation` lands on exactly the numbers it used to, and a caller passing both
 * gets its explicit dial honoured per axis rather than fought over.
 *
 * `pattern` comes out of here too: Hypnosis replaces Patterning where a style is in
 * charge, because the two are the same question, so the dial is mapped rather than
 * added to.
 *
 * One function because there are now two entry points — a whole generation and a single
 * rebuilt part — and a dial that meant something slightly different depending on which
 * one you came through would be the worst kind of bug to hear and not be able to name.
 */
function resolveCreative({
  mood = null, hypnosis = null, chaos = null, drive = null,
  variation = REARRANGE_VARIATION_DEFAULT,
  extremeness = REARRANGE_EXTREMENESS_DEFAULT,
  patterning = REARRANGE_PATTERN_DEFAULT,
} = {}, resolvedStyle = { name: null, patterning: null }) {
  const varied = clampControl(variation, REARRANGE_VARIATION_DEFAULT);
  const moodV = mood == null ? REARRANGE_CREATIVE_DEFAULTS.mood
    : clampControl(mood, REARRANGE_CREATIVE_DEFAULTS.mood);
  const hypnosisV = hypnosis == null ? 1 - varied
    : clampControl(hypnosis, REARRANGE_CREATIVE_DEFAULTS.hypnosis);
  // With a style in charge, Chaos IS the intensity dial. Everything Extremeness still
  // reaches — how widely source phrases are sampled and how often a lift is taken —
  // through a control the desk shows, so there is no second dial quietly deciding
  // things from behind a preset.
  const chaosV = chaos == null
    ? (resolvedStyle.name ? varied : clampExtremeness(extremeness))
    : clampControl(chaos, REARRANGE_CREATIVE_DEFAULTS.chaos);
  const driveV = drive == null ? REARRANGE_CREATIVE_DEFAULTS.drive
    : clampControl(drive, REARRANGE_CREATIVE_DEFAULTS.drive);
  const pattern = resolvedStyle.patterning == null
    ? clampControl(patterning, REARRANGE_PATTERN_DEFAULT)
    : clampControl(resolvedStyle.patterning + (hypnosisV - 0.5) * 0.5, REARRANGE_PATTERN_DEFAULT);
  return { mood: moodV, hypnosis: hypnosisV, chaos: chaosV, drive: driveV, pattern };
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
export function rearrangementDrumHit(lane, step, seed = 0, style = 'basic4') {
  if (!Number.isInteger(step)) return false;
  const phase = ((step % 16) + 16) % 16;
  const chance = drumRandom(lane, step, seed);
  const key = String(lane || '');
  // Each generated kit is a whole feel, not a variation on four-to-the-floor: where the
  // kick sits against the backbeat IS the style, so they are written out per lane rather
  // than derived from one another. Everything not named here falls through to the
  // four-to-the-floor below, which is what `basic4` has always been.
  if (style === 'halftime') {
    // The backbeat moved to bar-centre: half the speed at the same tempo.
    if (key === 'kick') return phase === 0 || phase === 10;
    if (key === 'snare' || key === 'clap') return phase === 8;
    if (key === 'hats') return phase % 4 === 0;
    if (key === 'ohats') return phase === 12 && chance < 0.5;
    if (key === 'crash') return phase === 0 && chance < 0.25;
    if (key === 'rim') return phase === 14 && chance < 0.2;
    if (key === 'tom') return phase === 15 && chance < 0.18;
    return false;
  }
  if (style === 'break') {
    // Amen-shaped: kick off the second beat, snare on the backbeat, busy hats.
    if (key === 'kick') return phase === 0 || phase === 6 || (phase === 11 && chance < 0.6);
    if (key === 'snare') return phase === 4 || phase === 12 || (phase === 14 && chance < 0.35);
    if (key === 'clap') return phase === 12;
    if (key === 'hats') return phase % 2 === 0;
    if (key === 'ohats') return phase === 14 && chance < 0.5;
    if (key === 'rim') return (phase === 7 || phase === 15) && chance < 0.3;
    if (key === 'tom') return phase === 15 && chance < 0.2;
    if (key === 'crash') return phase === 0 && chance < 0.3;
    return false;
  }
  if (style === 'boombap') {
    // Kick on one and the and-of-three, snare hard on two and four, swung-feeling hats.
    if (key === 'kick') return phase === 0 || phase === 10;
    if (key === 'snare' || key === 'clap') return phase === 4 || phase === 12;
    if (key === 'hats') return phase % 2 === 0 && chance < 0.85;
    if (key === 'ohats') return phase === 14 && chance < 0.4;
    if (key === 'rim') return phase === 7 && chance < 0.25;
    if (key === 'tom') return phase === 15 && chance < 0.15;
    if (key === 'crash') return phase === 0 && chance < 0.2;
    return false;
  }
  // THE FOUR-TO-THE-FLOOR FAMILY. They share a kick on every beat, so what separates them
  // is everything else: where the backbeat is and whether it is a snare or a clap, how the
  // hats sit against the kick, and how much is left out. Written as four patterns rather
  // than one with switches, because "house is disco with less" is a description, not an
  // implementation, and the moment one of them needs to move the shared version fights it.
  if (style === 'disco') {
    // Busiest of the four: a real kit playing it, snare AND clap on the backbeat, sixteenth
    // hats, and the open hat answering on every off-beat.
    if (key === 'kick') return phase % 4 === 0;
    if (key === 'snare') return phase === 4 || phase === 12;
    if (key === 'clap') return phase === 4 || phase === 12;
    if (key === 'hats') return true;
    if (key === 'ohats') return phase % 4 === 2;
    if (key === 'tom') return (phase === 14 || phase === 15) && chance < 0.3;
    if (key === 'rim') return (phase === 7 || phase === 15) && chance < 0.25;
    if (key === 'crash') return phase === 0 && chance < 0.25;
    return false;
  }
  if (style === 'house') {
    // The clap IS the backbeat — no snare at all — over eighth hats and the off-beat open.
    if (key === 'kick') return phase % 4 === 0;
    if (key === 'clap') return phase === 4 || phase === 12;
    if (key === 'snare') return false;
    if (key === 'hats') return phase % 2 === 0;
    if (key === 'ohats') return phase % 4 === 2;
    if (key === 'rim') return phase === 10 && chance < 0.22;
    if (key === 'crash') return phase === 0 && chance < 0.18;
    return false;
  }
  if (style === 'deephouse') {
    // Sparser and softer: the clap only answers the fourth beat, the hats stay off the
    // beat, and a shaker-ish rim carries the swing.
    if (key === 'kick') return phase % 4 === 0;
    if (key === 'clap') return phase === 12;
    if (key === 'snare') return phase === 4 && chance < 0.25;
    if (key === 'hats') return phase % 4 === 2;
    if (key === 'ohats') return phase % 8 === 6 && chance < 0.6;
    if (key === 'rim') return (phase === 6 || phase === 14) && chance < 0.45;
    if (key === 'crash') return phase === 0 && chance < 0.12;
    return false;
  }
  if (style === 'techno') {
    // Kick-dominant and machine-like: no backbeat on two at all, driving off-beat
    // sixteenth hats, and accents where a hand would not put them.
    if (key === 'kick') return phase % 4 === 0;
    if (key === 'clap') return phase === 12;
    if (key === 'snare') return false;
    if (key === 'hats') return phase % 2 === 1;
    if (key === 'ohats') return phase % 4 === 2 && chance < 0.7;
    if (key === 'rim') return (phase === 3 || phase === 11) && chance < 0.4;
    if (key === 'tom') return phase === 15 && chance < 0.12;
    if (key === 'crash') return phase === 0 && chance < 0.15;
    return false;
  }
  if (style === 'garage') {
    // Two-step: the second backbeat is displaced and the kick skips, which is the shuffle.
    if (key === 'kick') return phase === 0 || phase === 9;
    if (key === 'snare' || key === 'clap') return phase === 4 || phase === 14;
    if (key === 'hats') return phase % 2 === 1 || phase === 0;
    if (key === 'ohats') return (phase === 6 || phase === 10) && chance < 0.55;
    if (key === 'rim') return phase === 11 && chance < 0.3;
    if (key === 'tom') return phase === 15 && chance < 0.15;
    if (key === 'crash') return phase === 0 && chance < 0.22;
    return false;
  }
  switch (key) {
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
 * With a named style this is that style. Explicit fill overlays are added only at a
 * section boundary after the base material has been generated.
 * Without one it is the continuous Extremeness behaviour this generator has always
 * had, expressed in the same shape — which is what lets there be a single code path
 * rather than a legacy generator kept alive beside a new one. A caller passing
 * `extremeness` and nothing else gets the old phrase weights, with a four-sixteenth
 * candidate grid so even the compatibility path cannot create an off-grid base cut.
 */
/**
 * ---- GRAIN -------------------------------------------------------------------
 *
 * How finely the song is cut, as a continuum rather than four named boxes.
 *
 * Style was the last categorical control on a panel that had decided everything else is
 * a dial, and `Mix` was the admission that its categories were too rigid — an option
 * whose only meaning was "do not commit to one of these". Cell length is plainly
 * continuous (64 -> 32 -> 16 -> 8 -> 4 steps), so it is a dial.
 *
 * THE ENDS STAY HARD. The objection to making this a dial is a real one and it is worth
 * writing down: the point of naming a style is being able to RELY on it, and a dial at
 * 90% that "usually" gives beats is a weaker promise than a gate. So the two extremes
 * are gates — at 0 nothing shorter than a bar may be emitted, at 1 nothing longer — and
 * only the middle interpolates. Anyone who needs the exact old promise still names the
 * style outright, which is why Style survives in Advanced rather than being deleted.
 *
 * THE GRID FALLS OUT, it is not chosen. A cell of four steps cannot start on an
 * eight-step boundary, so the alignment grid is simply the shortest cell the blend still
 * permits. That keeps the two from ever disagreeing, which is exactly the bug a separate
 * grid control would invite.
 */
export const REARRANGE_GRAIN_DEFAULT = 0.5;

// Where each cell length is most at home on the dial. Reading the same way the labels
// do: whole phrases at the bottom, single beats at the top.
const GRAIN_CENTRES = Object.freeze([[64, 0], [32, 0.16], [16, 0.36], [8, 0.66], [4, 0.92]]);
const GRAIN_WIDTH = 0.26;

/** The five readings the dial shows, so the desk and the library cannot drift apart. */
export const REARRANGE_GRAIN_LABELS = Object.freeze(['Phrases', 'Bars', 'Groove', 'Beats', 'Shards']);
export function grainLabel(grain = REARRANGE_GRAIN_DEFAULT) {
  const amount = clampControl(grain, REARRANGE_GRAIN_DEFAULT);
  return REARRANGE_GRAIN_LABELS[
    Math.min(REARRANGE_GRAIN_LABELS.length - 1, Math.floor(amount * REARRANGE_GRAIN_LABELS.length))];
}

/** The cell-length distribution, alignment grid and shape chances at a grain setting. */
export function grainStyle(grain = REARRANGE_GRAIN_DEFAULT) {
  const amount = clampControl(grain, REARRANGE_GRAIN_DEFAULT);
  const cells = [];
  for (const [length, centre] of GRAIN_CENTRES) {
    // The hard ends. Below a bar is refused at the bottom of the dial and above it at
    // the top, so "Phrases" and "Shards" are promises rather than tendencies.
    if (amount <= 0.02 && length < 16) continue;
    if (amount >= 0.98 && length > 16) continue;
    const weight = Math.exp(-(((amount - centre) / GRAIN_WIDTH) ** 2)) * 100;
    cells.push([length, weight]);
  }
  // A cell less than a tenth as likely as the most likely one is noise, and noise must
  // not be allowed to set the alignment grid: a single stray four-step cell at the
  // middle of the dial would otherwise drag Groove's whole alignment down to the beat.
  const peak = Math.max(...cells.map(([, weight]) => weight), 0);
  const kept = cells
    .filter(([, weight]) => weight >= peak * 0.1)
    .map(([length, weight]) => [length, Math.max(1, Math.round(weight))]);
  if (!kept.length) kept.push([16, 100]);
  cells.length = 0;
  cells.push(...kept);
  // Alignment is the shortest cell the blend allows: a four-step cell cannot begin on an
  // eight-step boundary, so this can never contradict the lengths above it.
  const grid = Math.min(...cells.map(([length]) => length), 16);
  // The shape chances move with the dial for the same reason the lengths do — long
  // phrases want looping and repay pairing less than beats do.
  const between = (low, high) => low + (high - low) * amount;
  return {
    // A real name, because `style.name` is the flag meaning "a gate is in force". Left
    // null, the grain dial would fall through to the legacy continuous branch and emit
    // the very cell lengths it was set to forbid — a 32-step phrase at full Shards.
    name: 'grain',
    grain: amount,
    cells,
    grid,
    pairChance: between(0.2, 0.7),
    loopChance: between(0.9, 0.3),
    patterning: between(0.6, 0.45),
  };
}

/**
 * Which gate a generation runs under.
 *
 * A NAMED style still wins outright and still means exactly what it meant — that is what
 * keeps it worth naming. `auto`, or no style at all when a grain was supplied, resolves
 * to the dial. No style and no grain is the historical continuous path, untouched, so
 * every caller written before any of this still generates identically.
 */
function resolveStyle(style, grain = null) {
  if ((style === 'auto' || style == null) && grain != null) return grainStyle(grain);
  const named = style && REARRANGE_STYLES[style] ? REARRANGE_STYLES[style] : null;
  if (!named) {
    return {
      name: null,
      cells: PHRASE_LENGTH_WEIGHTS.map(([value, weight]) => [value, weight]),
      grid: 4,
      pairChance: null,
      loopChance: null,
      patterning: null,
    };
  }
  return {
    name: style,
    cells: named.cells,
    grid: named.grid,
    pairChance: named.pairChance,
    loopChance: named.loopChance,
    patterning: named.patterning,
  };
}

function styleForLetter(style, letter, seed, grain = null) {
  if (style !== 'mix') return resolveStyle(style, grain);
  // Keep the choice stable for a returning letter and independent of how many random
  // source choices happened before it. That makes Mix a form decision, not a dice roll
  // that can change when a favourite or a fill is added elsewhere.
  const code = typeof letter === 'string' && letter ? letter.charCodeAt(0) : 0;
  const hash = (Math.imul(Number(seed) >>> 0, 1664525) + Math.imul(code, 1013904223)) >>> 0;
  const roll = hash % 100;
  const name = roll < 60 ? 'groove' : roll < 90 ? 'phrase' : 'chop';
  return { name, ...REARRANGE_STYLES[name] };
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
 * that ranking, CHAOS deciding how far down the ranking it is allowed to reach.
 * At Tame that pool is one candidate and the result is the best available slice;
 * at Feral it widens, and the recipe finds material the safe answer would miss.
 */
function pickOffset(length, ctx, { exclude = null } = {}) {
  const { style, sourceBase, sourceSpan, random, chaos } = ctx;
  const maxOffset = Math.max(0, sourceSpan - length);
  if (!maxOffset) return 0;
  const candidates = offsetCandidates(style, sourceBase, sourceSpan, length);
  // Unstyled, or styled with nowhere legal to land: the original weighted snap. The
  // empty-array case is not the same as the null one and used to fall through to an
  // index off the end of an empty list — a latent crash for any style whose alignment
  // admits no start for a cell this long in a span this short, which the seeded streams
  // happened not to reach until the fill roll changed and moved them.
  if (!candidates || !candidates.length) return sourceStart(maxOffset, random, chaos);
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
  const reach = Math.max(1, Math.round(scored.length * (0.02 + ctx.chaos * 0.5)));
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
    && (a.harmony || 0) === (b.harmony || 0) && !!a.mute === !!b.mute
    && (a.fill || null) === (b.fill || null);
}

function fillShapeFor(name, sectionSteps, random,
  drive = REARRANGE_CREATIVE_DEFAULTS.drive, chaos = REARRANGE_CREATIVE_DEFAULTS.chaos) {
  if (name === 'none' || name === false) return null;
  if (name && REARRANGE_FILL_SHAPES[name]) return REARRANGE_FILL_SHAPES[name];
  // AUTO HAS TO BE ABLE TO SAY NO. The last branch here used to be `roll < 1`, which is
  // every roll — so "sparse" was left entirely to a budget downstream, and a song came out
  // with a fill on nine sections in ten. A fill is a transition accent: the ending it
  // decorates only means something if most endings are left plain, so the common outcome
  // has to be no fill at all, and the budget above is a ceiling rather than the whole rule.
  //
  // DRIVE scales how often, CHAOS skews which shape — a feral setting reaches past the
  // burst for the rush and the machine gun. Even at peak-time the total stays under a
  // half, so "most endings are left plain" survives the loudest setting on the desk.
  if (sectionSteps >= 16) {
    const scale = 0.4 + 1.2 * clampControl(drive, REARRANGE_CREATIVE_DEFAULTS.drive);
    const wild = clampControl(chaos, REARRANGE_CREATIVE_DEFAULTS.chaos)
      - REARRANGE_CREATIVE_DEFAULTS.chaos;
    const roll = random();
    if (roll < Math.max(0.01, (0.04 + 0.10 * wild) * scale)) return REARRANGE_FILL_SHAPES.machinegun;
    if (roll < (0.12 + 0.06 * wild) * scale) return REARRANGE_FILL_SHAPES.rush;
    if (roll < 0.28 * scale) return REARRANGE_FILL_SHAPES.burst;
  }
  return null;
}

/** Replace the final boundary of a section with an explicit, whole-band fill. */
function appendSectionFill(operations, sectionSteps, ctx) {
  const shape = fillShapeFor(ctx.fill, sectionSteps, ctx.random, ctx.drive, ctx.chaos);
  if (!shape || sectionSteps < shape.steps || !operations.length) return operations;
  let used = operations.reduce((sum, operation) => sum + operation.length * operation.repeats, 0);
  const target = sectionSteps - shape.steps;
  if (used < target) return operations;
  // Keep the source material at the end of the section and retrigger nearby fragments
  // at smaller musical subdivisions. This is an overlay in recipe terms: no source
  // notes are rewritten, and the engine sees `fill` and can keep the whole band together.
  const out = [];
  let cursor = 0;
  for (const operation of operations) {
    const duration = operation.length * operation.repeats;
    if (cursor + duration <= target) {
      out.push(operation);
      cursor += duration;
      continue;
    }
    if (cursor < target) {
      const keep = target - cursor;
      if (keep % operation.length === 0 && keep / operation.length <= operation.repeats) {
        out.push({ ...operation, repeats: keep / operation.length });
        cursor = target;
      } else {
        // A long loop may not divide the requested fill boundary (for example a
        // four-bar row before a final beat). Rebuild only the pre-fill span from a
        // beat-aligned cell; this is still a recipe edit, never a note-data rewrite.
        const baseLength = [32, 16, 8, 4].find((length) => length <= ctx.sourceSpan
          && target % length === 0);
        if (!baseLength) return operations;
        const baseFrom = Math.max(ctx.sourceBase, Math.min(operation.from,
          ctx.sourceBase + ctx.sourceSpan - baseLength));
        out.length = 0;
        let remainingBase = target;
        while (remainingBase > 0) {
          const repeats = Math.min(4, Math.floor(remainingBase / baseLength));
          if (!repeats) return operations;
          out.push({ from: baseFrom, length: baseLength, repeats,
            transpose: operation.transpose || 0 });
          remainingBase -= repeats * baseLength;
        }
        cursor = target;
      }
    }
    break;
  }
  const maxCell = Math.max(...shape.cells.map(([length]) => length));
  const source = [...out].reverse().find((operation) => operation.length >= maxCell)
    || operations.find((operation) => operation.length >= maxCell)
    || out[out.length - 1] || operations[operations.length - 1];
  const from = Math.max(ctx.sourceBase, Math.min(source.from,
    ctx.sourceBase + Math.max(0, ctx.sourceSpan - maxCell)));
  const shapeName = Object.entries(REARRANGE_FILL_SHAPES)
    .find(([, value]) => value === shape)?.[0] || 'burst';
  // A fill is a little edit, not one source cell stamped four times. Build a pool of
  // nearby offsets for each cell size (including offsets inside a repeated source
  // phrase), then choose a different candidate from the seeded random stream whenever
  // one exists. The same seed still reproduces the same fill, but its final sixteenths
  // can answer each other instead of sounding like a looped note.
  const sourcePool = (length) => {
    const candidates = [];
    const seen = new Set();
    for (const operation of [...out, ...operations]) {
      const maxOffset = Math.max(0, operation.length - length);
      const stride = Math.max(1, length);
      for (let offset = 0; offset <= maxOffset; offset += stride) {
        const candidate = operation.from + offset;
        if (candidate < ctx.sourceBase
          || candidate + length > ctx.sourceBase + ctx.sourceSpan
          || seen.has(candidate)) continue;
        seen.add(candidate);
        candidates.push(candidate);
      }
    }
    if (!candidates.length) candidates.push(from);
    return candidates;
  };
  let previousFrom = null;
  const chooseSource = (length) => {
    const candidates = sourcePool(length);
    const alternates = candidates.filter((candidate) => candidate !== previousFrom);
    const pool = alternates.length ? alternates : candidates;
    const random = Number(ctx.random?.()) || 0;
    const selected = pool[Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random)) * pool.length))];
    previousFrom = selected;
    return selected;
  };
  for (const [length, repeats] of shape.cells) {
    for (let repeat = 0; repeat < repeats; repeat++) {
      out.push({ from: chooseSource(length), length, repeats: 1, transpose: source.transpose || 0,
        ...(source.harmony ? { harmony: source.harmony } : {}), fill: shapeName });
    }
  }
  used = out.reduce((sum, operation) => sum + operation.length * operation.repeats, 0);
  return used === sectionSteps ? out : operations;
}

function fillOverlays(operations) {
  const out = [];
  let cursor = 0;
  for (const operation of operations) {
    const duration = operation.length * operation.repeats;
    if (operation.fill) {
      const previous = out[out.length - 1];
      if (previous && previous.shape === operation.fill && previous.end === cursor) {
        previous.end += duration;
      } else out.push({ shape: operation.fill, start: cursor, end: cursor + duration });
    }
    cursor += duration;
  }
  return out;
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
    const harmony = raw?.harmony == null ? 0 : int(raw.harmony);
    const fill = raw?.fill == null ? null : String(raw.fill);
    const favourite = raw?.favourite === true;
    if (from == null || length == null || repeats == null || transpose == null
      || harmony == null || from < 0 || length < 1 || from + length > sourceSteps
      || repeats < 1 || repeats > 4 || !REARRANGE_TRANSPOSES.includes(transpose)) return null;
    if (fill && !REARRANGE_FILL_NAMES.includes(fill)) return null;
    if (harmony && Math.abs(harmony) > REARRANGE_HARMONY_RANGE) return null;
    total += length * repeats;
    operations.push({ from, length, repeats, transpose,
      ...(harmony ? { harmony } : {}), ...(fill ? { fill } : {}),
      ...(favourite ? { favourite: true } : {}) });
  }
  return total === sectionSteps ? operations : null;
}

function findAnchor(anchors, sectionIndex, section) {
  if (!Array.isArray(anchors)) return null;
  return anchors.find((anchor) => anchor?.index === sectionIndex
    && anchor.steps === section.steps)
    || anchors.find((anchor) => anchor?.letter && anchor.letter === section.letter
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

/**
 * ---- FORM GRAMMARS -----------------------------------------------------------
 *
 * The generator used to know ONE macro form — the Intro/Verse/Chorus ladder above,
 * stretched to whatever length was asked for, every part exactly four bars. Measured
 * against the imported catalogue that is not what songs do: only 29% of detected parts
 * are four bars, and real part lengths run 2, 3, 5, 6, 8, 13, 14, 16, 22 and beyond.
 *
 * THREE FIELDS, NOT ONE. A part carries a `letter` (identity — what shares material
 * with what), a `role` (intent — what it should feel like, which is what steers source
 * choice and energy) and `bars` (length). The old code derived the letter FROM the role,
 * which is why two different verses could not be expressed: every Verse in a song was
 * letter B and therefore literally the same generated material. `A B C B D B` needs
 * these to be three separate things.
 *
 * FITTING. A grammar is an optional `intro`, a `cycle` that repeats, and an optional
 * `outro`. The fitter lays the intro, repeats the cycle while the bar budget allows,
 * and closes with the outro, trimming the final part to land on the exact length. That
 * is the same shape the historical ladder had — a fixed opening, a repeating middle, a
 * closing Outro — said as data instead of as a stair of `if`s.
 */
export const REARRANGE_FORMS = Object.freeze({
  song: Object.freeze({ label: 'Song', legacy: true }),
  source: Object.freeze({
    // Not a shape at all: the shape THIS song already has, read off the material by
    // `detectSongForm`. Every grammar beside it is an opinion imposed on the song; this
    // one is the song's own roadmap, with its real part lengths and its real returns.
    // Falls back to the ladder when the analysis cannot say — a short song, or one with
    // no structure to find.
    label: "This song's own",
    detected: true,
  }),
  dance: Object.freeze({
    label: 'Dance',
    // No verse or chorus at all. The vocabulary M8TRX's own kits already imply — it
    // ships Techno, House and Deep house and then describes their output as verses.
    intro: [{ letter: 'A', role: 'Intro', bars: 8 }],
    cycle: [
      { letter: 'B', role: 'Build', bars: 4 },
      { letter: 'C', role: 'Drop', bars: 8 },
      { letter: 'D', role: 'Breakdown', bars: 8 },
    ],
    outro: [{ letter: 'E', role: 'Outro', bars: 8 }],
  }),
  loop: Object.freeze({
    label: 'Loop',
    // One letter throughout: no contrast by material at all. What changes is what
    // accretes and falls away, which is the minimalist shape and the one the Hypnosis
    // dial is already reaching for.
    cycle: [{ letter: 'A', role: 'Loop', bars: 8 }],
  }),
  aaba: Object.freeze({
    label: 'AABA',
    // Two of the same, a contrasting middle, then the first again. No chorus. The
    // eight-bar unit is the point — at four it collapses into the ladder with new names.
    cycle: [
      { letter: 'A', role: 'Verse', bars: 8 },
      { letter: 'A', role: 'Verse', bars: 8 },
      { letter: 'B', role: 'Bridge', bars: 8 },
      { letter: 'A', role: 'Verse', bars: 8 },
    ],
  }),
  arch: Object.freeze({
    label: 'Arch',
    // The hook deliberately late: the payoff is the delay. This is the grammar that
    // most needs variable lengths — at a flat four bars it is just the ladder with the
    // chorus moved.
    intro: [{ letter: 'A', role: 'Intro', bars: 4 }],
    cycle: [
      { letter: 'B', role: 'Verse', bars: 8 },
      { letter: 'C', role: 'Verse', bars: 8 },
      { letter: 'D', role: 'Prechorus', bars: 4 },
      { letter: 'E', role: 'Chorus', bars: 8 },
      { letter: 'C', role: 'Verse', bars: 8 },
      { letter: 'E', role: 'Chorus', bars: 8 },
    ],
    outro: [{ letter: 'F', role: 'Outro', bars: 4 }],
  }),
});
export const REARRANGE_FORM_NAMES = Object.freeze(Object.keys(REARRANGE_FORMS));
export const REARRANGE_FORM_DEFAULT = 'song';

/**
 * `random` is a CHOICE, not a grammar, and it is resolved before anything is built.
 *
 * From the seed rather than from the running rng, for the same reason Mix resolves its
 * per-letter style from the seed: it must not move when an unrelated roll happens earlier
 * in the recipe, and a held seed has to rebuild the same arrangement. Resolved up front so
 * the recipe records the shape it actually used — nothing downstream ever sees 'random'.
 *
 * `source` is excluded: it needs an analysis that may not exist, and a random pick that
 * silently became the ladder half the time would be a dice roll that lies about itself.
 */
export const REARRANGE_FORM_RANDOM = 'random';
const RANDOM_FORM_POOL = Object.freeze(
  REARRANGE_FORM_NAMES.filter((name) => name !== 'source'));

export function resolveFormName(form, seed = 0) {
  if (form !== REARRANGE_FORM_RANDOM) {
    return REARRANGE_FORMS[form] ? form : REARRANGE_FORM_DEFAULT;
  }
  // A full avalanche (splitmix32's finaliser), not one multiply. A single round leaves the
  // low bits barely mixed, and with a pool this small that showed straight through as
  // consecutive seeds pairing up — 1 and 2 giving the same shape, 3 and 4 the next.
  let hash = (Number(seed) >>> 0) + 0x9e3779b9;
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97) >>> 0;
  hash = (hash ^ (hash >>> 15)) >>> 0;
  return RANDOM_FORM_POOL[hash % RANDOM_FORM_POOL.length];
}

/**
 * The historical ladder, unchanged.
 *
 * Kept as its own path rather than expressed in the grammar table because it is
 * genuinely irregular for short songs — the one/two/three-unit cases are not a cycle
 * with an intro bolted on — and reproducing it EXACTLY matters more than expressing it
 * uniformly. Every recipe made before form grammars existed still generates identically.
 */
function legacyForm(outputSteps) {
  const units = Math.floor(outputSteps / PHRASE_STEPS);
  const remainder = outputSteps % PHRASE_STEPS;
  const roles = formRoles(units);
  const letters = new Map();
  let nextLetter = 0;
  const sections = roles.map((role) => {
    if (!letters.has(role)) letters.set(role, String.fromCharCode(65 + nextLetter++));
    return { role, name: role, letter: letters.get(role), steps: PHRASE_STEPS };
  });
  if (!units) sections[0].steps = outputSteps;
  else if (remainder) {
    if (!letters.has('Outro')) letters.set('Outro', String.fromCharCode(65 + nextLetter++));
    sections.push({ role: 'Outro', name: 'Outro', letter: letters.get('Outro'), steps: remainder });
  }
  return sections;
}

/** Lay a grammar's parts out across exactly `outputSteps`, trimming the last to fit. */
function fitForm(grammar, outputSteps) {
  const wanted = [...(grammar.intro || [])];
  const cycle = grammar.cycle || [];
  const outroBars = (grammar.outro || []).reduce((sum, part) => sum + part.bars, 0);
  const budget = outputSteps / PHRASE_BAR_STEPS;
  if (cycle.length) {
    let used = wanted.reduce((sum, part) => sum + part.bars, 0);
    // Leave room for the outro, but never at the cost of emitting no cycle at all: a
    // song too short for one pass still has to be SOME form rather than an empty list.
    let guard = 0;
    while (used + outroBars < budget && guard < 4096) {
      const part = cycle[guard % cycle.length];
      wanted.push(part);
      used += part.bars;
      guard++;
    }
  }
  wanted.push(...(grammar.outro || []));

  // Trim to the exact length. Parts that no longer fit are dropped and the last
  // surviving one absorbs the remainder, so the form always covers the output exactly —
  // which `validateForm` requires and every downstream index depends on.
  const sections = [];
  let remaining = outputSteps;
  for (const part of wanted) {
    if (remaining <= 0) break;
    const steps = Math.min(part.bars * PHRASE_BAR_STEPS, remaining);
    sections.push({ role: part.role, name: part.role, letter: part.letter, steps });
    remaining -= steps;
  }
  if (!sections.length) {
    sections.push({ role: 'Verse', name: 'Verse', letter: 'A', steps: outputSteps });
  } else if (remaining > 0) {
    sections[sections.length - 1].steps += remaining;
  }
  return sections;
}

function formFor(outputSteps, form = REARRANGE_FORM_DEFAULT, detected = null) {
  const grammar = REARRANGE_FORMS[form] || REARRANGE_FORMS[REARRANGE_FORM_DEFAULT];
  if (grammar.detected) {
    // The song's own roadmap, turned into a grammar. The first and last parts do not
    // repeat — an intro that came back every cycle would not be an intro — so only the
    // middle tiles when the output is longer than the song.
    if (!detected || detected.length < 2) return legacyForm(outputSteps);
    const shaped = detected.length >= 3
      ? { intro: [detected[0]], cycle: detected.slice(1, -1), outro: [detected[detected.length - 1]] }
      : { cycle: detected };
    return fitForm(shaped, outputSteps);
  }
  if (grammar.legacy) return legacyForm(outputSteps);
  return fitForm(grammar, outputSteps);
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

/**
 * Where in the source a phrase may be grabbed from.
 *
 * `offset` is the song's PHRASE GRID, in steps — see `detectPhraseGrid`. Songs have
 * intros of arbitrary length, and a three-bar intro puts every phrase of the song on an
 * odd bar. Striding from zero then lands every candidate one bar out of phase for the
 * whole song, and a "four-bar phrase" that starts on the second bar of the phrase is
 * audibly wrong however well the rest of the scoring behaves.
 *
 * Only this stride needs the correction. The styles align cells to 16, 8 or 4 steps and
 * a whole-BAR offset is a multiple of 16, so bar and beat alignment are untouched by it;
 * four-bar phrase starts are the one grid an offset in bars can actually break.
 *
 * Zero is kept as a candidate whenever the offset is not itself zero: the material
 * before the first full phrase is the song's intro, and it is exactly what an Intro
 * section should be allowed to reach for.
 */
export function sourceCandidates(sourceSteps, span, offset = 0) {
  const maxStart = Math.max(0, sourceSteps - span);
  const base = Math.max(0, Math.min(offset | 0, maxStart));
  const out = [];
  if (base > 0) out.push(0);
  for (let start = base; start <= maxStart; start += PHRASE_STEPS) out.push(start);
  if (out[out.length - 1] !== maxStart) out.push(maxStart);
  return out.length ? out : [0];
}

/**
 * The source's phrase grid in steps, or 0 when nothing can say.
 *
 * Deliberately conservative in both directions. A caller may name `phraseOffset`
 * outright (including 0 to turn the correction off); otherwise it is read from a rich
 * profile, and ONLY when the estimate is confident. A wrong offset is worse than none —
 * it displaces every phrase on a song that was previously right — so anything doubtful
 * falls back to the historical behaviour of striding from zero.
 */
function resolvePhraseOffset(profile, requested = null) {
  if (requested != null) {
    const named = Number(requested);
    return Number.isFinite(named) && named >= 0 ? Math.floor(named) : 0;
  }
  if (!profile || !profile.chroma || !(profile.bars > 0)) return 0;
  const grid = detectPhraseGrid(profile);
  return grid.confident ? grid.offset * 16 : 0;
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
  const reach = ROLE_SOURCE[role] || null;
  if (reach === 'first') return candidatePool[0];
  if (reach === 'last') return candidatePool[candidatePool.length - 1];
  const scored = candidatePool.map((start, index) => ({
    start,
    index,
    score: profileScore(profile, start, span),
  }));
  const hasProfile = scored.some((entry) => entry.score != null);
  const preferred = reach === 'dense' ? 1 : reach === 'sparse' ? -1 : 0;
  scored.sort((a, b) => {
    if (hasProfile && a.score !== b.score) return preferred * (b.score - a.score);
    // With no density profile, later source phrases make a useful chorus contrast,
    // while verses favour the opening material. The random pick below still keeps
    // each recipe seed different.
    if (reach === 'dense' && a.start !== b.start) return b.start - a.start;
    if (reach === 'sparse' && a.start !== b.start) return a.start - b.start;
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
  previousEnd = null, source = null, mood = REARRANGE_CREATIVE_DEFAULTS.mood) {
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
  // WHICH WAY the lift goes is the one thing Mood gets to say about a chromatic move:
  // a bright setting leans up, a dark one down. It is a thumb on the scale rather than
  // a rule, because the interval that agrees with what was just heard still wins — a
  // modulation that fights the material is not made better by pointing the right way.
  const lean = (clampControl(mood, REARRANGE_CREATIVE_DEFAULTS.mood) - 0.5);
  // WHETHER to lift is still a roll — a lift that arrived every time would stop being
  // a lift. WHICH one is not, where the song can be asked: the interval that leaves
  // this section agreeing best with what the listener just heard is the one that sounds
  // like a modulation rather than like a mistake.
  if (profile && previousEnd != null && source != null) {
    let best = null;
    for (const value of choices) {
      const match = chromaMatch(profile, previousEnd, source, value)
        + lean * 0.08 * Math.sign(value);
      if (!best || match > best.match) best = { value, match };
    }
    if (best) return best.value;
  }
  return weighted(choices.map((value) => [value, 1 + lean * 1.6 * Math.sign(value)]), random);
}

function sectionOperations(sectionSteps, transpose, previous, favourites, ctx) {
  const { style, sourceBase, sourceSpan, random, chaos: intensity, hypnosis, pattern } = ctx;
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
    const filler = sectionOperations(remaining, transpose, fixed[fixed.length - 1], [], ctx)
      .map((operation) => remaining % 4 === 0 || operation.length % 4 === 0
        ? operation : { ...operation, favourite: true });
    return fixed.concat(filler);
  }
  // A four-bar section is more useful as a pattern of smaller cells than as one
  // unbroken two-bar grab. The common case alternates two adjacent half-bars (or
  // bars) and then repeats that pair: A, B, A, B. This keeps the phrase musical while
  // making the rearrangement audibly different from simply looping a long excerpt.
  //
  // A/B alternation is a MOTIF, so HYPNOSIS reaches for it more readily as it rises —
  // the pair coming back is the thing a listener recognises.
  const pairChance = style.pairChance == null
    ? Math.min(0.95, 0.28 + intensity * 0.34 + pattern * 0.25)
    : Math.max(0, Math.min(0.95, style.pairChance + (hypnosis - 0.5) * 0.2));
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
  // One recognisable loop is the most hypnotic shape a section can take, so the dial
  // moves this too: at Scatter the generator opens the section up into cells instead.
  const loopChance = style.loopChance == null
    ? 0.96 - intensity * 0.12
    : Math.max(0, Math.min(0.95, style.loopChance + (hypnosis - 0.5) * 0.3));
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
  // hang together rather than reading as a list of unrelated edits, so Trance reaches
  // back into this often and Scatter rarely.
  const motifs = [];
  let output = 0;
  while (output < sectionSteps) {
    const remaining = sectionSteps - output;
    const choices = style.name
      ? styleCells(style, remaining, sourceSpan)
      : PHRASE_LENGTH_WEIGHTS.filter(([value]) => value <= remaining && value <= sourceSpan);
    const lengths = choices.length ? choices : [[Math.min(4, remaining), 1]];
    let length = null;
    let offset = null;
    // A motif returning, in preference to new material. Only where it fits the space
    // that is left, and never as the very first cell — there is nothing to return to.
    const reuse = style.name ? motifs.filter((motif) => motif.length <= remaining) : [];
    if (reuse.length && random() < hypnosis * 0.55) {
      const motif = reuse[Math.floor(random() * reuse.length)];
      length = motif.length;
      offset = motif.offset;
    } else {
      // Every length `pickCell` may escalate to comes out of `lengths`, which is
      // already filtered to what fits the space left, so it cannot overrun. Base
      // material is never shorter than a beat; sub-beat edits are fill overlays.
      ({ length, offset } = pickCell(lengths, ctx));
      motifs.push({ length, offset });
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

function validateForm(form, outputSteps, sourceSteps = outputSteps) {
  if (form == null) return null;
  if (!Array.isArray(form) || !form.length) throw new Error('Rearrange JSON has an invalid form');
  let cursor = 0;
  const out = form.map((raw, index) => {
    const start = int(raw?.start);
    const end = int(raw?.end);
    const source = raw?.source == null ? null : int(raw.source);
    const role = typeof raw?.role === 'string' ? raw.role : '';
    const name = typeof raw?.name === 'string' ? raw.name : '';
    const letter = typeof raw?.letter === 'string' ? raw.letter : null;
    if (start == null || end == null || !name || !REARRANGE_FORM_ROLES.includes(role)
      || (letter != null && !/^[A-Z]$/.test(letter))) {
      throw new Error(`Form section ${index + 1} has invalid fields`);
    }
    if (start !== cursor || end <= start || end > outputSteps) {
      throw new Error(`Form section ${index + 1} is not a contiguous output range`);
    }
    cursor = end;
    return {
      name, role, start, end,
      ...(letter == null ? {} : { letter }),
      ...(Array.isArray(raw?.chords) ? { chords: raw.chords.map((value) => Array.isArray(value) ? [...value] : value) } : {}),
      // `source` is a display hint, not playback authority. Older drafts could carry
      // a stale hint after a variable-length edit; discard that hint and let the
      // validator rebuild it from the operations below instead of rejecting the file.
      ...(source != null && source >= 0 && source < sourceSteps ? { source } : {}),
    };
  });
  if (cursor !== outputSteps) throw new Error('Rearrange form does not cover the output');
  return out;
}

/**
 * Generate a variable-length recipe for a source song. Base slices stay beat-aligned;
 * any sub-beat work is marked as an explicit boundary fill.
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
  style = null, variation = REARRANGE_VARIATION_DEFAULT,
  mood = null, hypnosis = null, chaos = null, drive = null,
  progression = 'off', key = null, walk = null,
  chordPace = null, fill = 'none',
  outputSteps = sourceSteps, uniqueLetters = [], letterTemplates = null,
  // `form` names the GRAMMAR; the recipe's own `form` field is the sections it built.
  phraseOffset = null, form: formName = REARRANGE_FORM_DEFAULT, grain = null,
} = {}) {
  if (!Number.isInteger(sourceSteps) || sourceSteps <= 0) {
    throw new RangeError('sourceSteps must be a positive integer');
  }
  if (!Number.isInteger(outputSteps) || outputSteps <= 0 || outputSteps % 4 !== 0) {
    throw new RangeError('outputSteps must be a positive beat-aligned integer');
  }
  const rng = random || seededRandom(seed);
  const actualSeed = Number(seed) >>> 0;
  const transpose = clampControl(transposeAmount, REARRANGE_TRANSPOSE_DEFAULT);
  const resolvedStyle = resolveStyle(style, grain);
  const { mood: moodV, hypnosis: hypnosisV, chaos: chaosV, drive: driveV, pattern } =
    resolveCreative({ mood, hypnosis, chaos, drive, variation, extremeness, patterning },
      resolvedStyle);
  const intensity = chaosV;
  // Mood and Drive own the harmony settings the desk used to ask for by name. An
  // explicit `walk`/`chordPace` from a caller still wins — the library keeps working
  // for anything that has an opinion of its own.
  const walkShape = walk ?? moodWalk(moodV);
  const pace = chordPace ?? drivePace(driveV);
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
  // MOOD RE-READS A DETECTED KEY, AND ONLY A DETECTED ONE. Dark takes a major song into
  // its relative minor, euphoric takes a minor song into its relative major — the same
  // seven notes, a different home. A key given by name is a statement of fact about the
  // song and no dial moves it; see `moodWalkKey`.
  const keyed = wantProgression
    ? overrideKey || (detected
      ? moodWalkKey({ tonic: detected.tonic, minor: detected.minor }, moodV) : null)
    : null;
  // ONE PITCH SYSTEM PER RECIPE. While chord loops are walking, the chromatic dial is
  // ignored entirely — not just in the walking sections. A verse lifted a whole tone
  // chromatically next to a chorus walking diatonic chords is two unrelated pitch
  // grammars fighting over one song, and the same reading on the dial has to mean the
  // same thing every time: with a chord loop on, it means nothing, and the desk says
  // so on the control itself.
  const chromatic = keyed ? 0 : transpose;
  // One walk per ROLE, chosen once so every returning Chorus takes the same trip — and
  // chosen SEPARATELY per role, so the Verse and the Chorus do not walk one identical
  // loop for the length of the song. That was the single biggest reason a Mood setting
  // sounded like one progression: the whole form shared it. A major-key song takes a
  // major walk whatever palette was asked for; the minor palettes are the club
  // vocabulary and their numerals only mean something in minor.
  const roleChords = new Map();
  const chordsForRole = (role) => {
    if (!keyed || role === 'Intro' || role === 'Outro') return null;
    if (roleChords.has(role)) return roleChords.get(role);
    let chords = null;
    // A caller naming a palette outright still gets that palette, in every section —
    // an explicit request is a statement about the whole arrangement, and Mood does not
    // get to spread it across three. Auto is Mood's to answer, per role.
    if (keyed.minor && REARRANGE_PROGRESSIONS[progression]) {
      chords = REARRANGE_PROGRESSIONS[progression].minor;
    } else {
      const set = moodPalettes(moodV, keyed.minor);
      chords = paletteDegrees(set[palettePick(actualSeed, role, set.length)]);
    }
    roleChords.set(role, chords);
    return chords;
  };
  const operations = [];
  const form = [];
  const roleSources = new Map();
  const roleTemplates = new Map();
  if (letterTemplates && typeof letterTemplates === 'object') {
    for (const [letter, template] of Object.entries(letterTemplates)) {
      if (template && Array.isArray(template.operations) && Number.isInteger(template.steps)) {
        roleTemplates.set(letter, {
          steps: template.steps,
          operations: template.operations.map((operation) => ({ ...operation })),
          walked: !!template.walked,
          verbatim: !!template.verbatim,
          resizable: !!template.resizable,
          ...(Array.isArray(template.chords) ? { chords: [...template.chords] } : {}),
        });
      }
    }
  }
  const usedSources = new Set();
  // A random form is decided here, once, from the seed — so the recipe carries the shape
  // it was built from rather than the word 'random'.
  const builtForm = resolveFormName(formName, actualSeed);
  // The song's own form, when that is what was asked for. Read from the rich profile
  // only — a flat density array cannot describe a structure.
  const detectedForm = REARRANGE_FORMS[builtForm]?.detected && rich ? detectSongForm(rich) : null;
  const sections = formFor(outputSteps, builtForm, detectedForm);
  const phraseSpan = Math.min(PHRASE_STEPS, sourceSteps);
  // The song's own phrase grid, so a four-bar grab starts where its phrases do rather
  // than where its file happens to begin.
  const phraseBase = resolvePhraseOffset(rich, phraseOffset);
  const candidates = sourceCandidates(sourceSteps, phraseSpan, phraseBase);
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
  // Auto fills are transition accents, not a new rhythm layer. Keep them sparse: one
  // section in three at the middle of the Drive dial, one in six at its bottom, two in
  // three at the top. The ceiling is only half the rule — `fillShapeFor` still has to
  // roll one, and still has to be able to say no.
  let fillBudget = fill === 'auto'
    ? Math.max(1, Math.ceil(sections.length * (1 + 2 * driveV) / 6)) : Infinity;
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
    const templateKey = uniqueLetters.includes(section.letter)
      ? `section:${sectionIndex}` : (section.letter || section.role);
    const storedTemplate = rejected ? null : roleTemplates.get(templateKey);
    const templateOperations = storedTemplate
      && (storedTemplate.steps === section.steps || storedTemplate.resizable)
      ? (storedTemplate.steps === section.steps
        ? storedTemplate.operations.map((operation) => ({ ...operation }))
        : fitTemplateOperations(storedTemplate.operations, section.steps))
      : null;
    const usableTemplate = storedTemplate && templateOperations?.length
      ? { ...storedTemplate, operations: templateOperations } : null;
    let sectionOps = preserved && !hasFavourites
      ? { steps: section.steps, operations: preserved, verbatim: true }
      : (usableTemplate ? {
        ...usableTemplate,
        steps: section.steps,
      } : null);
    if (preserved && !hasFavourites) {
      // A kept Verse/Chorus should remain the motif for its returning sections too;
      // that preserves the form's identity while the unkept roles are regenerated.
      roleTemplates.set(templateKey, sectionOps);
    } else if (!sectionOps || hasFavourites) {
      // Does this section walk a chord loop? Every four-bar Verse/Chorus/Bridge with a
      // key does. A repeated cell sitting on one chord for four bars is exactly the
      // material a progression exists for — the same riff walked around the loop IS
      // the arrangement — and an earlier draft that left some sections plain "for
      // contrast" read as the feature not working. Contrast comes from Intro/Outro
      // staying put and from the i bars the walk mask holds. A section that walks
      // takes NO chromatic lift on top: two pitch systems moving one phrase is mud.
      // Any part of four bars or more may walk, not only ones of exactly four.
      //
      // The old test was `=== PHRASE_STEPS`, written when every part WAS four bars. Form
      // grammars made eight- and sixteen-bar parts ordinary, and under that test every one
      // of them silently fell through to plain material — a Dance form would generate its
      // drops with no harmony at all and sound flat for a reason nothing named. Four bars
      // stays the floor because `pacedChords` needs that much room to leave home and come
      // back; below it the walk is all tonic anyway. Whole bars only: a walk assigns one
      // chord per bar, so a part that is not a whole number of bars has no grid to sit on.
      const walkableLength = section.steps >= PHRASE_STEPS
        && section.steps % PHRASE_BAR_STEPS === 0;
      const palette = walkableLength && !hasFavourites
        ? chordsForRole(section.role) : null;
      const walkScore = palette && rich && keyed
        ? walkCellScore(rich, source, 16, keyed) : 1;
      const walkable = palette && walkScore >= REARRANGE_WALK_MIN;
      const chords = palette
        && walkable ? pacedChords(palette, Math.max(1, Math.ceil(section.steps / 16)), pace, walkShape)
        : null;
      const sectionTranspose = chords ? 0 : chooseTranspose(section.role, rng, intensity, chromatic,
        rich, previous ? previous.from + previous.length : null, source, moodV);
      // What every source choice inside this section is scored against. `previousEnd`
      // moves as cells are laid down, so "does this agree with what came before" is
      // asked about the slice actually just heard rather than the section's opening.
      const sectionStyle = styleForLetter(style, section.letter || section.role, actualSeed, grain);
      const sectionPattern = sectionStyle.patterning == null
        ? clampControl(patterning, REARRANGE_PATTERN_DEFAULT)
        : clampControl(sectionStyle.patterning + (hypnosisV - 0.5) * 0.5, REARRANGE_PATTERN_DEFAULT);
      const ctx = {
        style: sectionStyle,
        sourceBase: source,
        sourceSpan,
        random: rng,
        mood: moodV,
        hypnosis: hypnosisV,
        chaos: chaosV,
        drive: driveV,
        pattern: sectionPattern || pattern,
        profile: rich,
        previousEnd: previous ? previous.from + previous.length : null,
        // A chorus should feel bigger than a verse, and Drive decides how much bigger
        // everything is allowed to feel. With no profile this is null and energy simply
        // stops being one of the things a slice is judged on.
        energyTarget: rich && ROLE_ENERGY[section.role] != null
          ? Math.min(1, ROLE_ENERGY[section.role] * (0.5 + driveV)) : null,
      };
      // ONE CHUNK, REPEATED, WALKED. A section that carries chords is built as a
      // single bar cell played four times — the club shape. Walking an A/B pair
      // re-harmonises a phrase that is already answering itself, and listening said
      // exactly that: disjointed. The A/B and collage shapes still happen, in the
      // sections that play their written harmony.
      let built;
      if (chords) {
        const cell = pickCell([[16, 1]], ctx) || { length: 16, offset: 0 };
        const bars = Math.max(1, Math.ceil(section.steps / 16));
        built = [{ from: source + cell.offset, length: 16, repeats: bars, transpose: 0 }];
        ctx.previousEnd = source + cell.offset + 16;
      } else {
        built = sectionOperations(section.steps, sectionTranspose, previous,
          favouriteBuckets[sectionIndex], { ...ctx, fill });
      }
      const sectionFill = fill === 'auto' && fillBudget <= 0 ? 'none' : fill;
      const beforeFillCount = built.filter((operation) => operation.fill).length;
      built = appendSectionFill(built, section.steps, { ...ctx, fill: sectionFill });
      if (fill === 'auto' && built.filter((operation) => operation.fill).length > beforeFillCount) {
        fillBudget--;
      }
      sectionOps = {
        steps: section.steps,
        operations: chords ? applyHarmonyLoop(built, chords) : built,
        walked: !!chords,
        ...(chords ? { chords: [...chords] } : {}),
      };
      // A favourite is a one-shot user request, not a new Verse/Chorus template. Do
      // not silently repeat it in every returning section of the same role.
      if (!hasFavourites) roleTemplates.set(templateKey, sectionOps);
    } else {
      sectionOps = {
        steps: sectionOps.steps,
        operations: sectionOps.operations.map((operation) => ({ ...operation })),
        ...(Array.isArray(sectionOps.chords) ? { chords: [...sectionOps.chords] } : {}),
        walked: !!sectionOps.walked,
        verbatim: !!sectionOps.verbatim,
      };
    }
    const sectionStart = output;
    const sectionOperationStart = operations.length;
    for (const operation of sectionOps.operations) {
      const copy = { ...operation };
      const prior = operations[operations.length - 1];
      // A walked section's repeats are the SAME cell on purpose — and a thumbed-up
      // section is verbatim by contract. Neither may be nudged to disguise a duplicate;
      // both are deliberate material choices the next Generate must respect.
      if (operationEqual(prior, copy) && !copy.favourite && !sectionOps.walked
        && !sectionOps.verbatim) {
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
      operations.push(outputOperation);
      output += copy.length * copy.repeats;
      previous = outputOperation;
    }
    const sectionOutputOperations = operations.slice(sectionOperationStart);
    form.push({
      name: section.name,
      role: section.role,
      ...(section.letter ? { letter: section.letter } : {}),
      ...(sectionOps.walked && Array.isArray(sectionOps.chords)
        ? { chords: [...sectionOps.chords] } : {}),
      start: sectionStart,
      end: output,
      source: sectionOutputOperations.length
        ? Math.min(...sectionOutputOperations.map((operation) => operation.from))
        : source,
    });
  }
  const fills = fillOverlays(operations);
  return {
    kind: REARRANGE_KIND,
    version: REARRANGE_VERSION,
    source: { steps: sourceSteps },
    ...(outputSteps === sourceSteps ? {} : { output: { steps: outputSteps } }),
    seed: actualSeed,
    grid: REARRANGE_GRID,
    // The key rides in the recipe because harmony offsets mean nothing without it —
    // a saved file must replay the same chords on a desk that never ran the analysis.
    ...(keyed && operations.some((op) => op.harmony) ? { key: keyed } : {}),
    ...(fills.length ? { fills } : {}),
    form,
    operations,
  };
}

function splitOperation(operation) {
  // Two sixteenths is the real floor — below that there are no halves to make. It used to
  // refuse anything under half a bar, which quietly ruled out splitting a beat into two
  // eighths, the most ordinary chop there is.
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

/**
 * Join runs of identical adjacent slices into one repeated slice.
 *
 * `boundaries` is the set of output positions a PART begins at, and compaction stops at
 * every one of them. Without it the last slice of one part and the first of the next
 * could merge into a single repeated slice straddling the join — which reads as the
 * following part having quietly lost a slice to its neighbour, and is how a Replace on
 * the chorus was disturbing the verse.
 *
 * `touched` limits compaction to the joins an edit actually reached. Compacting the whole
 * array was audibly identical but not VISUALLY identical: two blocks in an untouched part
 * could fall together into one, and a part you did not edit changing shape is exactly the
 * thing you cannot let a panel do, however equivalent the audio.
 */
function compactAdjacentOperations(operations, boundaries = null, touched = null) {
  const out = [];
  let cursor = 0;
  for (const [index, operation] of operations.entries()) {
    const previous = out[out.length - 1];
    const startsPart = !!boundaries?.has(cursor);
    const reached = !touched || touched.has(index) || touched.has(index - 1);
    cursor += operation.length * operation.repeats;
    if (startsPart || !reached || !previous || previous.from !== operation.from || previous.length !== operation.length
      || previous.transpose !== operation.transpose || (previous.fill || null) !== (operation.fill || null)) {
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

/**
 * Fit a reusable clip to a target form slot. Clip cards are allowed to move between
 * letters whose slots are not the same length: repeat the clip as a motif when the
 * destination is longer, and trim/split its final cell when it is shorter. This is
 * only used for explicit `resizable` templates; ordinary generator templates retain
 * the exact-length contract and are ignored when they do not fit.
 */
function fitTemplateOperations(operations, targetSteps) {
  if (!Array.isArray(operations) || !operations.length || !Number.isInteger(targetSteps)
    || targetSteps <= 0) return null;
  const units = [];
  for (const operation of operations) {
    const repeats = Math.max(1, Math.min(4, Math.floor(Number(operation?.repeats) || 1)));
    for (let repeat = 0; repeat < repeats; repeat++) {
      const length = Math.floor(Number(operation?.length) || 0);
      if (length > 0) units.push({ ...operation, length, repeats: 1 });
    }
  }
  if (!units.length) return null;
  const out = [];
  let remaining = targetSteps;
  let cursor = 0;
  // A clip is made from beat-aligned slices, so a repeated unit can always be
  // trimmed on a beat boundary. The guard keeps malformed hand-authored data from
  // turning a Generate click into an infinite loop.
  while (remaining > 0 && out.length < 4096) {
    const unit = units[cursor % units.length];
    const duration = unit.length * unit.repeats;
    if (duration <= remaining) {
      out.push({ ...unit });
      remaining -= duration;
    } else {
      const fit = trimOperations([unit], remaining);
      if (fit?.length) {
        out.push(...fit);
        remaining -= fit.reduce((sum, operation) => sum + operation.length * operation.repeats, 0);
      }
    }
    cursor++;
    if (cursor > units.length * 4096) break;
  }
  if (remaining !== 0) return null;
  return compactAdjacentOperations(out);
}

/** Replace selected output time with a neighbouring slice, preserving song length. */
function removeSelectedOperations(operations, selected, sourceSteps, random, boundaries = null) {
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
  return compactAdjacentOperations(replacement, boundaries, selected);
}

function deleteSelectedOperations(operations, selected) {
  const kept = operations.filter((_, index) => !selected.has(index)).map((operation) => ({ ...operation }));
  return kept.length ? kept : null;
}

/** Remove selected output rows by looping a short neighbouring motif through the freed
 * time. This keeps the replacement musical as a unit: deleting 3 and 4 from
 * 1 2 3 4 can therefore become 1 2 1 2 instead of extending only slice 2. */
function removeSelectedWithLoop(operations, selected, sourceSteps, random, boundaries = null) {
  const units = [];
  operations.forEach((operation, index) => {
    for (let repeat = 0; repeat < operation.repeats; repeat++) {
      units.push({ index, operation: { ...operation, repeats: 1 } });
    }
  });
  const out = [];
  // Slices are unrolled to single passes so a motif can be measured against the gap in
  // whole cells. An untouched slice must come back out the way it went in, though — so it
  // is re-gathered here from its OWN passes rather than left for the compactor, which
  // works on what things look like and would happily fold a neighbouring slice in with it.
  const touched = new Set();
  let passThrough = -1;
  let unitCursor = 0;
  while (unitCursor < units.length) {
    const unit = units[unitCursor];
    if (!selected.has(unit.index)) {
      const previous = out[out.length - 1];
      if (previous && passThrough === unit.index) previous.repeats += 1;
      else { out.push({ ...unit.operation }); passThrough = unit.index; }
      unitCursor++;
      continue;
    }
    passThrough = -1;
    const blockStart = unitCursor;
    while (unitCursor < units.length && selected.has(units[unitCursor].index)) unitCursor++;
    const target = units.slice(blockStart, unitCursor)
      .reduce((sum, item) => sum + item.operation.length, 0);
    const candidates = [];
    for (let start = 0; start < units.length; start++) {
      if (selected.has(units[start].index)) continue;
      let duration = 0;
      const motif = [];
      for (let end = start; end < Math.min(units.length, start + 4); end++) {
        if (selected.has(units[end].index)) break;
        motif.push(units[end].operation);
        duration += units[end].operation.length;
        if (duration > target) break;
        if (duration > 0 && target % duration === 0) {
          const distance = Math.abs(start - blockStart);
          candidates.push({ motif: motif.map((operation) => ({ ...operation })),
            duration, score: motif.length * 100 - distance + random() * 0.01 });
        }
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];
    if (!chosen) {
      // A one-cell gap may have no multi-cell divisor. Fall back to the established
      // neighbour fill rather than changing duration or rejecting the edit.
      const fallback = removeSelectedOperations(operations, selected, sourceSteps, random);
      return fallback || operations.map((operation) => ({ ...operation }));
    }
    for (let pass = 0; pass < target / chosen.duration; pass++) {
      for (const operation of chosen.motif) { touched.add(out.length); out.push({ ...operation }); }
    }
  }
  return compactAdjacentOperations(out, boundaries, touched);
}

/** Return contiguous form ranges, deriving one range when a hand-authored recipe has
 * no form metadata. This is the single boundary authority used by variable-length
 * transforms and the desk inspector. */
export function formSectionRanges(recipe) {
  const total = rearrangementOutputSteps(recipe);
  if (!(total > 0)) return [];
  const form = Array.isArray(recipe?.form) && recipe.form.length ? recipe.form : null;
  if (!form) return [{ name: 'Section', role: 'Verse', letter: 'A', start: 0, end: total }];
  let cursor = 0;
  const ranges = [];
  for (const raw of form) {
    const start = Number.isInteger(raw?.start) ? raw.start : cursor;
    const end = Number.isInteger(raw?.end) ? raw.end : start;
    if (start !== cursor || end <= start || end > total) return [];
    ranges.push({ ...raw, start, end });
    cursor = end;
  }
  return cursor === total ? ranges : [];
}

/** Rebuild form boundaries after an edit changes output duration. Boundaries snap to
 * operation edges so a section never owns half of a repeated cell. */
export function rebuildForm(recipe, operations = recipe?.operations, ownership = null) {
  if (!Array.isArray(operations) || !operations.length) throw new Error('Rearrange has no operations');
  const total = operations.reduce((sum, operation) => sum + operation.length * operation.repeats, 0);
  const old = formSectionRanges(recipe);
  const templates = old.length ? old : [{ name: 'Section', role: 'Verse', letter: 'A', start: 0, end: total }];
  const oldTotal = templates[templates.length - 1].end || total;
  const shaped = (form) => ({
    ...recipe,
    operations: operations.map((operation) => ({ ...operation })),
    ...(total === recipe?.source?.steps ? {} : { output: { steps: total } }),
    form,
  });
  // AN EDIT INSIDE ONE PART MUST NOT MOVE ANOTHER. Boundaries used to be rescaled by
  // total/oldTotal and re-snapped to the nearest slice edge, which meant deleting a slice
  // in the chorus shortened every part in the song by a share of it — measured, one delete
  // moved eight slices out of the verse and into its neighbour. Two rules replace that:
  //
  //   1. An edit that does not change the song's LENGTH does not move a boundary at all.
  //      Transposing, rerolling, splitting, unrolling and the two in-place removals all
  //      leave the parts exactly where they were.
  //   2. When the length does change, each part is as long as the slices that belong to
  //      it — the caller says which, and a part that loses all of its slices goes away.
  //
  // The old proportional pass is kept only as the fallback for callers with no ownership
  // to hand, and it is now reached solely by edits that resize a part on purpose.
  if (total === oldTotal) return shaped(templates.map((template) => ({ ...template })));
  if (Array.isArray(ownership) && ownership.length === operations.length) {
    const spans = new Array(templates.length).fill(0);
    let mapped = true;
    operations.forEach((operation, index) => {
      const owner = ownership[index];
      if (!(owner >= 0 && owner < spans.length)) { mapped = false; return; }
      spans[owner] += operation.length * operation.repeats;
    });
    if (mapped) {
      let cursor = 0;
      const form = [];
      templates.forEach((template, index) => {
        if (!spans[index]) return;
        form.push({ ...template, start: cursor, end: cursor + spans[index] });
        cursor += spans[index];
      });
      if (form.length && cursor === total) return shaped(form);
    }
  }
  const edges = [0];
  let cursor = 0;
  for (const operation of operations) {
    cursor += operation.length * operation.repeats;
    edges.push(cursor);
  }
  const nearest = (target, min, max) => edges
    .filter((edge) => edge >= min && edge <= max)
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0] ?? max;
  let start = 0;
  const form = templates.map((template, index) => {
    const end = index === templates.length - 1
      ? total
      : nearest(Math.round((template.end / oldTotal) * total / 4) * 4, start + 4, total);
    const next = { ...template, start, end };
    start = end;
    return next;
  });
  return shaped(form);
}

function alignedRerollFrom(operation, sourceSteps, random, profile = null, key = null,
  { style = null, chaos = REARRANGE_CREATIVE_DEFAULTS.chaos,
    drive = REARRANGE_CREATIVE_DEFAULTS.drive } = {}) {
  const maxStart = Math.max(0, sourceSteps - operation.length);
  if (!maxStart) return operation.from;
  // THE STYLE'S GRID IS A FLOOR HERE, not a replacement. The stride has always widened
  // with the slice, and a style only ever makes cuts land more squarely — so Phrase
  // rerolls even a beat-long slice onto bar lines, while an unstyled call keeps the
  // four-sixteenth grid it has always stepped on.
  const grid = Math.max(style?.grid || 4, Math.max(4, Math.min(16, operation.length)));
  // DRIVE READS THE SOURCE'S OWN ENERGY. Peak-time reaches for the busiest bars the song
  // has, chill for the quietest, and the middle of the dial is the flat preference this
  // scoring always carried — so the dial adds a direction rather than replacing a number.
  const energyWeight = 0.05
    + (clampControl(drive, REARRANGE_CREATIVE_DEFAULTS.drive) - 0.5) * 0.2;
  const candidates = [];
  for (let from = 0; from <= maxStart; from += grid) {
    let score = 0;
    if (profile && !Array.isArray(profile)) {
      const end = Math.min(profile.steps - 1, from + operation.length);
      score += (chromaMatch(profile, operation.from, from, 0) || 0) * 0.7;
      score -= (cutCost(profile, from) || 0) * 0.25;
      score -= (cutCost(profile, end) || 0) * 0.25;
      score += (energyOver(profile, from, operation.length) || 0) * energyWeight;
      score += (walkCellScore(profile, from, operation.length, key) || 0) * 0.1;
    }
    candidates.push({ from, score: score + random() * 0.02 });
  }
  candidates.sort((a, b) => b.score - a.score);
  const open = candidates.filter((candidate) => candidate.from !== operation.from);
  const usable = open.length ? open : candidates;
  // REACH, not the top of the list. The scores are only a preference — best fit first —
  // and taking the single best answer made reroll deterministic the moment a profile was
  // in play: measured, it reached TWO sources out of thirty-two across four hundred rolls,
  // ping-ponging between the same pair. The `random() * 0.02` above was meant to be the
  // variety, but a jitter that small is noise beside a real score; it only ever decided
  // anything in the profileless case, where every score is zero and the jitter IS the
  // sort. That is why reroll looked random in isolation and felt dead on the desk.
  //
  // AND CHAOS IS THAT REACH — tame ↔ feral is exactly the question "how far may this
  // stray from the safest answer", which is what the fraction below decides. 0.18 is the
  // floor `chooseSource` uses for the same job, and the slope puts this generator's own
  // default chaos on the 0.4 that was measured: a caller naming no dials rolls precisely
  // as it did, while the desk's slider now runs the whole span.
  const span = 0.18 + clampControl(chaos, REARRANGE_CREATIVE_DEFAULTS.chaos) * 0.63;
  const reach = Math.max(1, Math.min(usable.length, Math.round(usable.length * span)));
  const pick = usable[Math.floor(random() * reach)] || usable[0];
  return (pick || { from: operation.from }).from;
}

function sectionOperationIndices(recipe, sectionIndex) {
  const section = formSectionRanges(recipe)[sectionIndex];
  if (!section) return { section: null, indices: [] };
  const indices = [];
  let cursor = 0;
  for (const [index, operation] of recipe.operations.entries()) {
    const end = cursor + operation.length * operation.repeats;
    if (cursor >= section.start && end <= section.end) indices.push(index);
    else if (cursor < section.end && end > section.start) return { section, indices: [], crossed: true };
    cursor = end;
  }
  return { section, indices };
}

function trimOperations(operations, target) {
  const out = [];
  let remaining = target;
  for (const operation of operations) {
    if (remaining <= 0) break;
    const duration = operation.length * operation.repeats;
    if (duration <= remaining) {
      out.push({ ...operation });
      remaining -= duration;
      continue;
    }
    const repeats = Math.min(operation.repeats, Math.floor(remaining / operation.length));
    if (repeats > 0) {
      out.push({ ...operation, repeats });
      remaining -= repeats * operation.length;
    }
    if (remaining > 0 && operation.length >= 8) {
      const halves = splitOperation({ ...operation, repeats: 1 });
      out.push(...trimOperations(halves, remaining));
      remaining = 0;
    }
  }
  return remaining === 0 ? out : null;
}

function resizeFormSection(recipe, sectionIndex, operations, delta) {
  const ranges = formSectionRanges(recipe);
  const sourceSteps = int(recipe?.source?.steps);
  const form = ranges.map((section, index) => {
    if (index < sectionIndex) return { ...section };
    if (index === sectionIndex) return { ...section, end: section.end + delta };
    return { ...section, start: section.start + delta, end: section.end + delta };
  });
  const total = operations.reduce((sum, operation) => sum + operation.length * operation.repeats, 0);
  const next = { ...recipe, operations: operations.map((operation) => ({ ...operation })), form };
  if (total === sourceSteps) delete next.output;
  else next.output = { steps: total };
  return next;
}

/**
 * Fit a run of copied slices to a span, by cutting or by leaving silence.
 *
 * The receiving space keeps its own length whatever is dropped into it, so a paste never
 * moves a boundary or changes the song. Longer material is cut; shorter material leaves
 * the rest of the space silent rather than being stretched over ground it was not written
 * for — and the silence is visible, hearable, and one click from being filled properly.
 */
function fitOperationsToSpan(operations, span, sourceSteps) {
  const copied = operations.map((operation) => ({ ...operation }));
  const total = copied.reduce((sum, operation) => sum + operation.length * operation.repeats, 0);
  if (total > span) {
    const cut = trimOperations(copied, span);
    if (!cut) throw new Error('That material will not cut down to fit here');
    return cut;
  }
  let remaining = span - total;
  const base = copied[0].from;
  while (remaining > 0) {
    const length = Math.min(remaining, sourceSteps);
    copied.push({ from: Math.max(0, Math.min(base, sourceSteps - length)),
      length, repeats: 1, transpose: 0, mute: true });
    remaining -= length;
  }
  return copied;
}

/**
 * Put copied slices over a CONTIGUOUS RUN of slices, fitted to the time that run takes.
 *
 * This is the general paste, and a whole part is only the case where the run happens to be
 * every slice in one: a paste onto three slices in the middle of a verse works the same
 * way and for the same reason. Duration is conserved, so `rebuildForm` freezes every
 * boundary and no part changes length.
 */
export function replaceRearrangementSlices(recipe, indices, operations) {
  if (!Array.isArray(operations) || !operations.length) throw new Error('Nothing to paste');
  const run = [...new Set((Array.isArray(indices) ? indices : [indices])
    .map((index) => int(index)).filter((index) => index != null
      && index >= 0 && index < (recipe?.operations?.length || 0)))].sort((a, b) => a - b);
  if (!run.length) throw new Error('Select where the copy should go');
  if (run[run.length - 1] - run[0] !== run.length - 1) {
    throw new Error('Paste needs slices that sit next to each other');
  }
  const sourceSteps = int(recipe?.source?.steps);
  for (const operation of operations) {
    if (operation.from < 0 || operation.from + operation.length > sourceSteps) {
      throw new Error('That material does not fit this song');
    }
  }
  const span = run.reduce((sum, index) =>
    sum + recipe.operations[index].length * recipe.operations[index].repeats, 0);
  const pasted = fitOperationsToSpan(operations, span, sourceSteps);
  const ranges = formSectionRanges(recipe);
  const owners = [];
  let cursor = 0;
  const home = (() => {
    let at = 0;
    for (let index = 0; index < run[0]; index += 1) {
      at += recipe.operations[index].length * recipe.operations[index].repeats;
    }
    return ranges.findIndex((range) => at >= range.start && at < range.end);
  })();
  const nextOperations = [];
  recipe.operations.forEach((operation, index) => {
    if (index === run[0]) {
      pasted.forEach((slice) => { nextOperations.push(slice); owners.push(home); });
    }
    if (index < run[0] || index > run[run.length - 1]) {
      nextOperations.push({ ...operation });
      owners.push(ranges.findIndex((range) => cursor >= range.start && cursor < range.end));
    }
    cursor += operation.length * operation.repeats;
  });
  const next = rebuildForm(recipe, nextOperations, owners);
  next.fills = fillOverlays(nextOperations);
  return { recipe: next, changed: pasted.length };
}

/** Put one part's slices into another part. The part is just a run that fills a section. */
export function replaceRearrangementSection(recipe, sectionIndex, operations) {
  const { section, indices, crossed } = sectionOperationIndices(recipe, sectionIndex);
  if (!section) throw new Error('That M8TRX section does not exist');
  if (crossed || !indices.length) throw new Error('Section boundaries must fall between slices first');
  return replaceRearrangementSlices(recipe, indices, operations);
}

function selectedHas(indices, index) {
  return index >= indices[0] && index <= indices[indices.length - 1];
}

/** Apply a section-sized duration, pitch or fill edit while keeping the operation
 * contract valid. These are intentionally pure so the desk can queue them at the next
 * bar. */
export function transformRearrangementSection(recipe, sectionIndex, action, {
  value = 0, seed = recipe?.seed || 0,
} = {}) {
  const sourceSteps = int(recipe?.source?.steps);
  if (!sourceSteps || !Array.isArray(recipe?.operations)) throw new Error('Rearrange has no operations');
  const { section, indices, crossed } = sectionOperationIndices(recipe, sectionIndex);
  if (!section) throw new Error('That M8TRX section does not exist');
  if (crossed || !indices.length) throw new Error('Section boundaries must fall between slices first');
  const selected = new Set(indices);
  const ops = recipe.operations.map((operation) => ({ ...operation }));
  if (action === 'delete') {
    // A whole part out. Its slices go, its form entry goes, and the song gets shorter by
    // exactly what it was taking; the parts after it move up.
    if (indices.length === recipe.operations.length) throw new Error('Keep at least one M8TRX part');
    const nextOperations = recipe.operations
      .filter((unused, index) => !selected.has(index)).map((operation) => ({ ...operation }));
    const owners = [];
    let cursor = 0;
    const ranges = formSectionRanges(recipe);
    recipe.operations.forEach((operation, index) => {
      if (!selected.has(index)) {
        owners.push(ranges.findIndex((range) => cursor >= range.start && cursor < range.end));
      }
      cursor += operation.length * operation.repeats;
    });
    const next = rebuildForm(recipe, nextOperations, owners);
    next.fills = fillOverlays(nextOperations);
    return { recipe: next, changed: indices.length };
  }
  if (action === 'fill' && String(value) === 'none') {
    // TAKING A FILL OFF. The chopped cells cannot be un-chopped — the slices they replaced
    // are gone — but they can stop being a fill and be gathered back into as few slices as
    // their material allows, which is as close to before as the recipe can get.
    let stripped = 0;
    for (const index of indices) {
      if (!ops[index].fill) continue;
      delete ops[index].fill;
      stripped += 1;
    }
    if (!stripped) return { recipe: { ...recipe }, changed: 0 };
    const tidied = compactAdjacentOperations(ops.slice(indices[0], indices[indices.length - 1] + 1),
      null, new Set(ops.map((unused, index) => index)));
    const nextOperations = [
      ...ops.slice(0, indices[0]),
      ...tidied,
      ...ops.slice(indices[indices.length - 1] + 1),
    ];
    const next = rebuildForm(recipe, nextOperations);
    next.fills = fillOverlays(nextOperations);
    return { recipe: next, changed: stripped };
  }
  if (action === 'fill') {
    const shapeName = String(value || 'machinegun');
    if (!REARRANGE_FILL_NAMES.includes(shapeName)) throw new Error('Choose a supported fill shape');
    const sectionOperations = indices.map((index) => ops[index]);
    const minSource = Math.min(...sectionOperations.map((operation) => operation.from));
    // Reuse the section's own source neighbourhood. Clamping the base leaves room
    // for a four-step cell even when the section currently ends on a tiny fill cell.
    const sourceBase = Math.max(0, Math.min(sourceSteps - 4, minSource));
    const sourceEnd = Math.max(...sectionOperations.map((operation) => operation.from + operation.length));
    const filled = appendSectionFill(sectionOperations, section.end - section.start, {
      fill: shapeName, random: seededRandom(seed), sourceBase,
      sourceSpan: Math.max(4, Math.min(sourceSteps - sourceBase, sourceEnd - sourceBase)),
    });
    if (!filled.some((operation) => operation.fill)) {
      throw new Error('This section is too short for that fill');
    }
    const nextOperations = [
      ...ops.slice(0, indices[0]),
      ...filled,
      ...ops.slice(indices[indices.length - 1] + 1),
    ];
    const next = rebuildForm(recipe, nextOperations);
    next.fills = fillOverlays(nextOperations);
    return { recipe: next, changed: filled.length };
  }
  if (action === 'transpose') {
    const transpose = int(value);
    if (!REARRANGE_TRANSPOSES.includes(transpose)) throw new Error('Choose a supported transpose amount');
    if (indices.some((index) => ops[index].harmony)) {
      throw new Error('Turn the chord walk off before transposing this section');
    }
    for (const index of indices) ops[index].transpose = transpose;
    return { recipe: rebuildForm(recipe, ops), changed: indices.length };
  }
  if (action === 'double') {
    const insertAt = indices[indices.length - 1] + 1;
    const copy = indices.map((index) => ({ ...ops[index], harmony: ops[index].harmony || 0 }));
    const expanded = [...ops.slice(0, insertAt), ...copy, ...ops.slice(insertAt)];
    return {
      recipe: resizeFormSection(recipe, sectionIndex, expanded, section.end - section.start),
      changed: copy.length,
    };
  }
  if (action === 'halve') {
    const chosen = indices.map((index) => ops[index]);
    const half = Math.floor((section.end - section.start) / 2 / 4) * 4;
    const kept = trimOperations(chosen, Math.max(4, half));
    if (!kept) throw new Error('This section cannot be halved on its current slice boundaries');
    const reduced = [...ops.slice(0, indices[0]), ...kept, ...ops.slice(indices[indices.length - 1] + 1)];
    return {
      recipe: resizeFormSection(recipe, sectionIndex, reduced, -(section.end - section.start - half)),
      changed: 1,
    };
  }
  throw new Error(`Unsupported section action: ${action}`);
}

/** Strip or restore a section's diatonic walk. The stored form chord palette is the
 * reversible source of truth; when a legacy recipe lacks it, the common pop palette
 * is used as a safe fallback. */
const WALK_BAR_STEPS = 16;

/**
 * A CHORD PROGRESSION NEEDS A PLACE TO PUT EACH CHORD.
 *
 * Harmony lives on an OPERATION, and a walk is one chord per BAR — so a part built from a
 * single four-bar grab has exactly one slot for four chords, and the slow phrase grammar
 * opens on the tonic. Turning the walk on then wrote the tonic over the tonic: the library
 * reported `changed: 1`, nothing sounded different, the chord line stayed empty because
 * every chord equalled the tonic, and the card's W stayed unlit. It looked like a dead
 * button, and it looked dead only on parts made of few, long slices, which is why it seemed
 * to work at random.
 *
 * So the walk cuts the part into bars first. Every pass replays the same source material it
 * always did and every grab stays contiguous, so the total duration and the audio are
 * unchanged — this is the same lossless move `unroll` makes for repeats, extended to grabs
 * longer than a bar. A sub-bar slice is already inside one bar and is left alone.
 */
function barAlignedOperations(operations) {
  const out = [];
  for (const operation of operations) {
    for (let pass = 0; pass < operation.repeats; pass += 1) {
      if (operation.length <= WALK_BAR_STEPS) { out.push({ ...operation, repeats: 1 }); continue; }
      for (let at = 0; at < operation.length; at += WALK_BAR_STEPS) {
        out.push({
          ...operation,
          from: operation.from + at,
          length: Math.min(WALK_BAR_STEPS, operation.length - at),
          repeats: 1,
        });
      }
    }
  }
  return out;
}

/**
 * Lay a bar-per-chord palette over bar-aligned operations, by where each one STARTS.
 *
 * The old walk advanced its bar counter by `repeats`, which counts PASSES rather than bars:
 * on a chopped part of sixteen quarter-bar slices it ran off the end of the palette after
 * three of them and pinned the last chord across the rest of the part. Accumulating real
 * duration is the only thing that maps a slice to the bar it is actually in.
 *
 * Returns how many operations ended up on something other than the tonic, which is the
 * honest measure of whether a walk happened at all.
 */
/** Below this share of a window's pitched energy, the "chord" it is sitting on is a guess,
 *  and a guess is worse than the old assumption. Percussion, one held note and a near-silent
 *  grab all land here and are left to the tonic reading. */
const WALK_DEGREE_MIN = 0.5;

function applyWalkChords(operations, chords, { profile = null, key = null } = {}) {
  let step = 0;
  let moved = 0;
  for (const operation of operations) {
    const bar = Math.floor(step / WALK_BAR_STEPS);
    const target = chords[Math.min(chords.length - 1, bar)] || 0;
    // WHERE THE MATERIAL ALREADY IS, so the shift lands where it is aimed. `harmony` is a
    // RELATIVE move in scale degrees, and the walk used to assume every part opened on the
    // tonic: grab a bar that is really on the iv, ask for i iv v VI, and out comes
    // iv VII i ii — the right key, the right shape, transposed by however wrong the
    // assumption was, and labelled with the chords it was meant to be. Reading the degree
    // off the source and subtracting it makes the label true.
    const found = profile && key
      ? sourceDegree(profile, operation.from, operation.length * operation.repeats, key)
      : null;
    const sitting = found && found.confidence >= WALK_DEGREE_MIN ? found.degree : 0;
    // Modulo seven: the same chord an octave away is the same chord, and it keeps the offset
    // inside REARRANGE_HARMONY_RANGE, which the validator holds every recipe to.
    const shift = (((target - sitting) % 7) + 7) % 7;
    if (shift) operation.harmony = shift;
    else delete operation.harmony;
    // Counted on the TARGET, not the shift: a bar already sitting on the chord the walk
    // wants needs no shift and is still a bar of the progression.
    if (target) moved += 1;
    step += operation.length * operation.repeats;
  }
  return moved;
}

/**
 * A WALK YOU ASKED FOR HAS TO BE AUDIBLE FROM THE START.
 *
 * The slow phrase grammar spends its opening bars at home — over four bars it reads
 * `i i iv v`, so half the part sounds exactly as it did before you turned the walk on, which
 * lands as "it half worked". That grammar is right for GENERATION, where it is one voice
 * among many in a whole arrangement and the point is that the song breathes; it is wrong for
 * a switch you pressed on one part, where the point is to hear the difference.
 *
 * `active` moves a bar at a time — `i iv v VI` — so only the downbeat is home and everything
 * after it has somewhere to go. Generation keeps `slow`; this applies to the manual toggle
 * and its dice alone.
 */
const walkPaceFor = () => 'active';

/**
 * A bar-per-chord line that actually goes somewhere.
 *
 * The palette a part offers can be all tonic — the old slow grammar wrote `[0,0,0,…]` for
 * any part under four bars and stamped it onto the form, so recipes carry them. Paced, that
 * gives a walk of nothing, and the walk then refused a perfectly long part with "it is one
 * bar", which was both wrong and unanswerable: nothing in the panel could edit that palette.
 * A part with bars to fill always gets a progression; the default is used when its own has
 * no movement in it.
 */
function walkableChords(palette, bars) {
  const paced = pacedChords(palette, bars, walkPaceFor(), 'full');
  if (bars <= 1 || paced.some((degree) => degree)) return paced;
  return pacedChords(REARRANGE_PROGRESSIONS.pop.minor, bars, walkPaceFor(), 'full');
}

/**
 * Cut the operation list so no slice straddles one of `cuts` (output steps).
 *
 * A slice that runs across a part's edge belongs to neither part, and ordinary editing DOES
 * produce them — repeats and joins move durations around, and measured over forty seeds
 * about one section in twelve ended up with one. Refusing to walk such a part was correct
 * and useless: the answer is to cut the slice where the edge is, which costs nothing.
 * Lossless, like every other cut here — passes are unrolled and a long grab is divided at
 * the boundary, so every sixteenth of source still plays in the same order at the same time,
 * and M8TRX's own undo puts it back if the shape is not wanted.
 */
function cutOperationsAt(operations, cuts) {
  const wanted = [...new Set(cuts)].sort((a, b) => a - b);
  const out = [];
  let cursor = 0;
  for (const operation of operations) {
    const passes = operation.repeats > 1
      ? new Array(operation.repeats).fill(null).map(() => ({ ...operation, repeats: 1 }))
      : [{ ...operation }];
    for (const pass of passes) {
      let from = pass.from;
      let left = pass.length;
      while (left > 0) {
        const next = wanted.find((cut) => cut > cursor && cut < cursor + left);
        const take = next === undefined ? left : next - cursor;
        out.push({ ...pass, from, length: take, repeats: 1 });
        cursor += take;
        from += take;
        left -= take;
      }
    }
  }
  return out;
}

/** A part's slices, with the part's own edges cut clear first if anything straddles them. */
function sectionOperationsFor(recipe, sectionIndex, section) {
  const first = sectionOperationIndices(recipe, sectionIndex);
  if (!first.crossed && first.indices.length) return { recipe, indices: first.indices };
  const cut = rebuildForm(recipe, cutOperationsAt(recipe.operations, [section.start, section.end]));
  const again = sectionOperationIndices(cut, sectionIndex);
  return { recipe: cut, indices: again.indices };
}

/** The operations of one section, replaced wholesale. `sectionOperationIndices` only ever
 *  returns a contiguous run — it walks the list in order and takes what sits inside the
 *  section — so the run can be spliced out and a different-length one put back. */
function replaceSectionOperations(operations, indices, replacement) {
  const first = indices[0];
  const last = indices[indices.length - 1];
  if (last - first !== indices.length - 1) throw new Error('That M8TRX part is not one run of slices');
  return [...operations.slice(0, first), ...replacement, ...operations.slice(last + 1)];
}

export function toggleRearrangeSectionWalk(recipe, sectionIndex, { key = null, profile = null } = {}) {
  const ranges = formSectionRanges(recipe);
  const section = ranges[sectionIndex];
  if (!section) throw new Error('That M8TRX section does not exist');
  // A slice across the part's edge is cut there rather than refused — see sectionOperationsFor.
  const { recipe: base, indices } = sectionOperationsFor(recipe, sectionIndex, section);
  if (!indices.length) throw new Error('This part has no slices to walk');
  const ops = base.operations.map((operation) => ({ ...operation }));
  // A part counts as walking if it carries shifts OR a stamped chord line — with the source
  // degree compensated a bar can want a chord it is already sitting on, which needs no shift
  // at all, and a part of those would otherwise read as not walking and refuse to turn off.
  const walking = indices.some((index) => ops[index].harmony)
    || (Array.isArray(section.chords) && section.chords.some((degree) => degree));
  if (walking) {
    for (const index of indices) delete ops[index].harmony;
    const off = rebuildForm(base, ops);
    off.form = off.form.map((item, at) => {
      if (at !== sectionIndex) return item;
      const { chords: _gone, ...rest } = item;
      return rest;
    });
    return { recipe: off, changed: indices.length };
  }
  // A recipe only carries a key if the GENERATOR walked something in it, so a plain
  // arrangement has none — and the desk's own key (named, or detected) is the answer in that
  // case. Whichever it is, it gets written onto the recipe below: a harmony offset without a
  // key is meaningless to a desk that never ran the analysis, which is why it rides along.
  const walkKey = recipe.key || key;
  if (!walkKey) throw new Error('No key to walk in — the song did not settle on one, so name a key in Advanced');
  const palette = Array.isArray(section.chords) && section.chords.length
    ? section.chords : REARRANGE_PROGRESSIONS.pop.minor;
  const bars = Math.max(1, Math.ceil((section.end - section.start) / WALK_BAR_STEPS));
  const chords = walkableChords(palette, bars);
  const walked = barAlignedOperations(indices.map((index) => ops[index]));
  const moved = applyWalkChords(walked, chords, { profile, key: walkKey });
  // REFUSED RATHER THAN SILENTLY DONE, and refused in the part's own terms. One bar is one
  // chord and one chord is not a walk. Anything longer always gets a progression now
  // (see walkableChords), so this can only be the genuine single-bar case — it used to
  // announce "it is one bar" over a four-bar part whose palette happened to be all tonic.
  if (!moved) {
    throw new Error(bars <= 1
      ? 'This part is one bar long — one chord is not a walk'
      : 'There is no chord loop to walk this part around');
  }
  const next = rebuildForm({ ...base, key: walkKey }, replaceSectionOperations(ops, indices, walked));
  // THE CHORDS THIS PART SOUNDS, BAR BY BAR — stamped so the panel can print what you hear
  // rather than the shift that got it there. Those are the same number only while the part
  // is assumed to open on the tonic, which is the assumption this removes; and a recipe
  // opened on a desk that never ran the analysis can still draw its chord line from here.
  next.form = next.form.map((item, at) => (at === sectionIndex ? { ...item, chords } : item));
  return { recipe: next, changed: walked.length };
}

/**
 * Build one part again FROM SCRATCH, in the space it already occupies.
 *
 * This is the part card's dice, and it is not the same thing as rerolling its slices.
 * A reroll keeps the part's shape — the same cell lengths in the same places — and only
 * moves where each one is taken from, so a chopped verse stays chopped in exactly that
 * rhythm. This throws the shape away too: the part is generated again through the same
 * `sectionOperations` the generator uses, so it can come back as an A/B pair where it was
 * a single loop, four bars of one figure where it was a collage, from a different phrase
 * of the song entirely.
 *
 * THE ONE THING IT MAY NOT CHANGE IS ITS LENGTH. The rebuilt part is written into the
 * exact step span the old one held, so no boundary moves, no other part is touched, and
 * the song is the same length before and after — the same rule every other in-place edit
 * on this panel obeys.
 *
 * What it deliberately preserves:
 *   - a WALK. If the part was walking chords, the rebuild walks the same ones, so the
 *     form's chord line stays true and a rolled chorus still lands on its own harmony.
 *   - FAVOURITES. Those are slices the player asked to hear; they are handed to the
 *     builder as fixed material rather than rolled away.
 *   - a FILL. If the part ended with one, it ends with one of the same shape.
 * A LOCKED part refuses outright: a lock means verbatim, and the dice is the loudest
 * possible way to break that promise.
 */
export function regenerateRearrangementSection(recipe, sectionIndex, {
  seed = randomSeed(), sourceProfile = null, style = null, progression = 'auto', key = null,
  mood = null, hypnosis = null, chaos = null, drive = null,
  transposeAmount = REARRANGE_TRANSPOSE_DEFAULT, locked = false,
  phraseOffset = null,
} = {}) {
  const sourceSteps = int(recipe?.source?.steps);
  if (!sourceSteps || !Array.isArray(recipe?.operations)) throw new Error('M8TRX has no operations');
  const { section, indices, crossed } = sectionOperationIndices(recipe, sectionIndex);
  if (!section) throw new Error('That M8TRX part does not exist');
  if (crossed || !indices.length) throw new Error('Part boundaries must fall between slices first');
  if (locked) throw new Error('This part is locked — unlock it before rolling it');
  const sectionSteps = section.end - section.start;
  if (sectionSteps <= 0) return { recipe: { ...recipe }, changed: 0 };
  const rng = seededRandom(seed);
  const resolvedStyle = resolveStyle(style);
  const { mood: moodV, hypnosis: hypnosisV, chaos: chaosV, drive: driveV, pattern } =
    resolveCreative({ mood, hypnosis, chaos, drive }, resolvedStyle);
  const rich = sourceProfile && !Array.isArray(sourceProfile) && sourceProfile.steps > 0
    ? sourceProfile : null;
  const energyProfile = Array.isArray(sourceProfile) ? sourceProfile
    : rich ? Array.from(rich.energy) : null;
  const existing = indices.map((index) => recipe.operations[index]);
  const role = recipe.form?.[sectionIndex]?.role || 'Verse';
  // A fresh phrase of the song to build from — the same choice generation makes, with the
  // part's own role still steering it, so a rolled Chorus reaches for chorus material.
  const phraseSpan = Math.min(PHRASE_STEPS, sourceSteps);
  const candidates = sourceCandidates(sourceSteps, phraseSpan,
    resolvePhraseOffset(rich, phraseOffset));
  const source = chooseSource(role, candidates, phraseSpan, energyProfile, new Set(), rng,
    null, chaosV);
  const sourceSpan = Math.min(phraseSpan, sourceSteps - source);
  // The walk this part was on, kept exactly. Its chords live on the form entry.
  const walkedChordLoop = Array.isArray(recipe.form?.[sectionIndex]?.chords)
    && existing.some((operation) => operation.harmony != null)
    ? [...recipe.form[sectionIndex].chords] : null;
  const keyed = walkedChordLoop ? (key || recipe.key || null) : null;
  const chromatic = keyed ? 0 : clampControl(transposeAmount, REARRANGE_TRANSPOSE_DEFAULT);
  const favourites = existing.filter((operation) => operation.favourite)
    .map((operation) => ({ from: operation.from, length: operation.length }));
  const ctx = {
    style: styleForLetter(resolvedStyle, recipe.form?.[sectionIndex]?.letter || role,
      Number(seed) >>> 0),
    sourceBase: source,
    sourceSpan,
    random: rng,
    mood: moodV, hypnosis: hypnosisV, chaos: chaosV, drive: driveV,
    pattern,
    profile: rich,
    previousEnd: null,
    energyTarget: rich && ROLE_ENERGY[role] != null
      ? Math.min(1, ROLE_ENERGY[role] * (0.5 + driveV)) : null,
  };
  let built;
  if (walkedChordLoop) {
    // ONE CHUNK, REPEATED, WALKED — the club shape, exactly as generation builds it.
    const cell = pickCell([[16, 1]], ctx) || { length: 16, offset: 0 };
    const bars = Math.max(1, Math.ceil(sectionSteps / 16));
    built = [{ from: source + cell.offset, length: 16, repeats: bars, transpose: 0 }];
  } else {
    const sectionTranspose = chooseTranspose(role, rng, chaosV, chromatic, rich, null,
      source, moodV);
    built = sectionOperations(sectionSteps, sectionTranspose, null, favourites, ctx);
  }
  // A part that ended with a fill ends with one of the same shape.
  const oldFill = existing.find((operation) => operation.fill)?.fill || null;
  if (oldFill) built = appendSectionFill(built, sectionSteps, { ...ctx, fill: oldFill });
  if (walkedChordLoop) built = applyHarmonyLoop(built, walkedChordLoop);
  const rebuiltSteps = built.reduce((sum, operation) => sum + operation.length * operation.repeats, 0);
  if (rebuiltSteps !== sectionSteps) {
    // The builder is contracted to fill its span exactly; refusing beats writing a part
    // that would shove every boundary after it along.
    throw new Error('That part could not be rebuilt at its exact length');
  }
  const operations = [
    ...recipe.operations.slice(0, indices[0]).map((operation) => ({ ...operation })),
    ...built.map((operation) => ({ ...operation })),
    ...recipe.operations.slice(indices[indices.length - 1] + 1).map((operation) => ({ ...operation })),
  ];
  const next = rebuildForm({ ...recipe, seed: Number(seed) >>> 0 }, operations);
  const fills = fillOverlays(operations);
  if (fills.length) next.fills = fills;
  else delete next.fills;
  return { recipe: next, changed: built.length };
}

/** Keep material fixed and reroll only a section's chord order. */
export function rerollSectionWalk(recipe, sectionIndex, { seed = recipe?.seed || 0, key = null, profile = null } = {}) {
  const ranges = formSectionRanges(recipe);
  const section = ranges[sectionIndex];
  if (!section) throw new Error('That M8TRX section does not exist');
  const { recipe: base, indices } = sectionOperationsFor(recipe, sectionIndex, section);
  if (!indices.length) throw new Error('This part has no slices to walk');
  const rng = seededRandom(seed);
  const palettes = REARRANGE_PROGRESSION_NAMES.filter((name) => name !== 'off')
    .map((name) => REARRANGE_PROGRESSIONS[name].minor);
  const palette = palettes[Math.floor(rng() * palettes.length)] || REARRANGE_PROGRESSIONS.pop.minor;
  const bars = Math.max(1, Math.ceil((section.end - section.start) / WALK_BAR_STEPS));
  const chords = walkableChords(palette, bars);
  const operations = base.operations.map((operation) => ({ ...operation }));
  // Same two corrections as the toggle: a part needs one slot per bar before a progression
  // can be laid over it, and a slice belongs to the bar its DURATION puts it in rather than
  // to its index in the pass count.
  const walked = barAlignedOperations(indices.map((index) => operations[index]));
  const walkKey = base.key || key;
  if (!walkKey) throw new Error('No key to walk in — the song did not settle on one, so name a key in Advanced');
  const moved = applyWalkChords(walked, chords, { profile, key: walkKey });
  if (!moved) {
    throw new Error(bars <= 1
      ? 'This part is one bar long — one chord is not a walk'
      : 'There is no chord loop to walk this part around');
  }
  const next = rebuildForm({ ...base, seed: Number(seed) >>> 0, key: walkKey },
    replaceSectionOperations(operations, indices, walked));
  next.form = next.form.map((item, index) => index === sectionIndex ? { ...item, chords } : item);
  return { recipe: next, changed: walked.length };
}

/**
 * Apply a small, exact-duration edit to selected recipe rows.
 *
 * These are audition controls rather than song edits. Every supported transform
 * preserves each selected row's output duration, so the recipe remains the same
 * length and its form boundaries stay valid.
 *
 * THE DIALS MEAN WHAT THEY MEAN NOW, not what they meant at Generate. Reroll is the one
 * action here that makes a musical choice rather than performing a named operation, so
 * it is the one that reads Style, Mood, Hypnosis, Chaos and Drive — from the desk, at
 * the moment the button is pressed. Sliding to euphoric and rolling a slice has to give
 * a euphoric roll, or the sliders are a record of what was once asked for instead of
 * controls. What they cannot do from here is re-read the KEY: that is a whole-form
 * decision and one slice cannot make it alone (see `regenerateRearrangementSection`).
 */
export function transformRearrangement(recipe, indices, action, {
  seed = recipe?.seed || 0, value = 0, profile = null, key = null,
  style = null, mood = null, hypnosis = null, chaos = null, drive = null,
} = {}) {
  const sourceSteps = int(recipe?.source?.steps);
  if (!sourceSteps || !Array.isArray(recipe?.operations) || !recipe.operations.length) {
    throw new Error('Rearrange has no operations to transform');
  }
  const selected = new Set((Array.isArray(indices) ? indices : [indices])
    .map((index) => int(index)).filter((index) => index != null && index >= 0
      && index < recipe.operations.length));
  if (!selected.size) throw new Error('Select one or more Rearrange slices first');
  // Resolved through the same one function generation uses, so a dial cannot mean
  // something slightly different depending on which door it came in through.
  const resolvedStyle = resolveStyle(style);
  const creative = resolveCreative({ mood, hypnosis, chaos, drive }, resolvedStyle);
  const random = seededRandom(seed);
  // Which part each EXISTING slice belongs to, so an edit that changes the song's length
  // can hand rebuildForm the membership instead of leaving it to guess from proportions.
  const ranges = formSectionRanges(recipe);
  const partStarts = new Set(ranges.map((range) => range.start));
  const owners = [];
  let ownerCursor = 0;
  for (const operation of recipe.operations) {
    owners.push(ranges.findIndex((range) => ownerCursor >= range.start && ownerCursor < range.end));
    ownerCursor += operation.length * operation.repeats;
  }
  if (action === 'remove') {
    const operations = removeSelectedOperations(recipe.operations, selected, sourceSteps, random, partStarts);
    if (!operations) return { recipe: { ...recipe }, changed: 0 };
    return {
      recipe: rebuildForm({
        ...recipe,
        seed: Number(seed) >>> 0,
        operations,
      }, operations),
      changed: selected.size,
    };
  }
  if (action === 'walk-on') {
    // A WALK OVER THE SLICES YOU PICKED, not over their whole part. Turning one on used to
    // be a part-sized decision on the grounds that a progression needs bars to move
    // across — but a run of bars is a run of bars whether or not it happens to be a whole
    // part, and picking three of four and getting all four is not what selecting means.
    if (!recipe.key) throw new Error('Choose a key before turning on a chord walk');
    const run = [...selected].sort((a, b) => a - b);
    const home = ranges[owners[run[0]]];
    const palette = Array.isArray(home?.chords) && home.chords.length
      ? home.chords : REARRANGE_PROGRESSIONS.pop.minor;
    const span = run.reduce((sum, index) =>
      sum + recipe.operations[index].length * recipe.operations[index].repeats, 0);
    const bars = Math.max(1, Math.ceil(span / 16));
    // Slow pacing is the phrase grammar — hold the tonic, then lift — and it needs a
    // phrase to do it in. Asked for over one or two bars it holds for the whole run and
    // nothing moves at all, which is not a walk, so a short run steps every bar instead.
    const chords = pacedChords(palette, bars, bars >= 4 ? 'slow' : 'active', 'full');
    let bar = 0;
    let changed = 0;
    const operations = recipe.operations.map((raw, index) => {
      const operation = { ...raw };
      if (!selected.has(index)) return operation;
      const harmony = chords[Math.min(chords.length - 1, bar)] || 0;
      bar += operation.repeats;
      changed += 1;
      if (!harmony) { const { harmony: was, ...plain } = operation; void was; return plain; }
      return { ...operation, harmony, transpose: 0 };
    });
    return {
      recipe: rebuildForm({ ...recipe, seed: Number(seed) >>> 0 }, operations, owners),
      changed,
    };
  }
  if (action === 'join') {
    // THE OPPOSITE OF SPLIT. The first slice of the run keeps its place and its material
    // and grows to cover the time the rest of them were taking; they go. Duration is
    // conserved, so the part it sits in does not change length and no boundary moves.
    const run = [...selected].sort((a, b) => a - b);
    if (run.length < 2) return { recipe: { ...recipe }, changed: 0 };
    if (run[run.length - 1] - run[0] !== run.length - 1) {
      throw new Error('Join needs slices that sit next to each other');
    }
    const first = recipe.operations[run[0]];
    const span = run.reduce((sum, index) =>
      sum + recipe.operations[index].length * recipe.operations[index].repeats, 0);
    // A join is the undo of a chop, so the result is a PLAIN slice: whatever the run was
    // tagged as — a fill, a stutter's machine-gun cells — it is one continuous grab now,
    // and a lone slice claiming to be a transition accent would make the engine treat it
    // as whole-band and the panel draw a fill tick on something that no longer fills.
    const { fill, ...plain } = first;
    void fill;
    let joined = null;
    if (span <= sourceSteps) {
      // Prefer one longer grab. If the source runs out before the slice does, start it
      // earlier rather than refusing — the material is still the one that was there.
      joined = { ...plain, from: Math.max(0, Math.min(plain.from, sourceSteps - span)),
        length: span, repeats: 1 };
    } else if (span % plain.length === 0 && span / plain.length <= 4) {
      joined = { ...plain, repeats: span / plain.length };
    }
    if (!joined) return { recipe: { ...recipe }, changed: 0 };
    const operations = [];
    const ownership = [];
    recipe.operations.forEach((operation, index) => {
      if (index === run[0]) { operations.push(joined); ownership.push(owners[index]); return; }
      if (selected.has(index)) return;
      operations.push({ ...operation });
      ownership.push(owners[index]);
    });
    const next = rebuildForm({ ...recipe, seed: Number(seed) >>> 0 }, operations, ownership);
    next.fills = fillOverlays(operations);
    return { recipe: next, changed: run.length };
  }
  if (action === 'delete') {
    const operations = deleteSelectedOperations(recipe.operations, selected);
    if (!operations) throw new Error('Keep at least one M8TRX slice');
    const kept = owners.filter((_, index) => !selected.has(index));
    return {
      recipe: rebuildForm({ ...recipe, seed: Number(seed) >>> 0 }, operations, kept),
      changed: selected.size,
    };
  }
  if (action === 'remove-loop') {
    const operations = removeSelectedWithLoop(recipe.operations, selected, sourceSteps, random, partStarts);
    return {
      recipe: rebuildForm({ ...recipe, seed: Number(seed) >>> 0 }, operations),
      changed: selected.size,
    };
  }
  let changed = 0;
  const operations = [];
  const ownership = [];
  recipe.operations.forEach((raw, index) => {
    const operation = { ...raw };
    if (!selected.has(index)) { operations.push(operation); ownership.push(owners[index]); return; }
    let replacement = [operation];
    if (action === 'split') replacement = splitOperation(operation);
    else if (action === 'unroll' && operation.repeats > 1) {
      replacement = new Array(operation.repeats).fill(null)
        .map(() => ({ ...operation, repeats: 1 }));
    }
    else if (action === 'double-repeats' && operation.length % 2 === 0
      && operation.length >= 8 && operation.repeats * 2 <= 4) {
      replacement = [{ ...operation, length: operation.length / 2, repeats: operation.repeats * 2 }];
    } else if (action === 'half-repeats' && operation.repeats % 2 === 0
      && operation.from + operation.length * 2 <= sourceSteps) {
      replacement = [{ ...operation, length: operation.length * 2, repeats: operation.repeats / 2 }];
    } else if (action === 'repeat-more' && operation.repeats < 4) {
      replacement = [{ ...operation, repeats: operation.repeats + 1 }];
    } else if (action === 'repeat-less' && operation.repeats > 1) {
      replacement = [{ ...operation, repeats: operation.repeats - 1 }];
    } else if (action === 'transpose') {
      const transpose = int(value);
      if (!REARRANGE_TRANSPOSES.includes(transpose)) throw new Error('Choose a supported transpose amount');
      if (operation.harmony) throw new Error('Turn the chord walk off before transposing this slice');
      replacement = [{ ...operation, transpose }];
    } else if (action === 'reroll') {
      // REROLL IS THE RANDOM ONE, so it rolls all three of the things a slice is: where it
      // comes from, how its time is cut up, and what pitch it plays. It used to move only
      // the source, which made it the mildest control in the panel while reading as the
      // boldest. What it will NOT do is change how LONG the slice is: duration is the one
      // property every edit here holds still, because the moment it moves, everything
      // after it moves too and a reroll stops being a local decision.
      // Mix is a decision about the FORM — each repeated letter keeps a phrase, groove or
      // chop identity — so a slice rerolls under its own part's identity, resolved off
      // the recipe's seed rather than this press's. Rolling a slice twice must not move
      // the letter it belongs to under a different style each time.
      const sliceStyle = styleForLetter(style,
        recipe.form?.[owners[index]]?.letter || '', recipe.seed || 0);
      let next = {
        ...operation,
        from: alignedRerollFrom(operation, sourceSteps, random, profile, key, {
          style: sliceStyle, chaos: creative.chaos, drive: creative.drive,
        }),
      };
      const duration = operation.length * operation.repeats;
      // Same time, cut differently: one grab of it, or the front of it retriggered.
      // WHETHER to re-cut is a flat roll, because a reroll that always re-cut would make
      // the button mean "chop this" — but HOW MANY passes is Hypnosis's question, and it
      // is the same question generation asks, so it is weighted by the same table. A
      // collage setting takes the single grab; a loop setting retriggers the front of it.
      if (!operation.fill && random() < 0.55) {
        const weights = new Map(repeatWeights(creative.pattern));
        const splits = [];
        for (const passes of [1, 2, 3, 4]) {
          const cell = duration / passes;
          if (!Number.isInteger(cell) || cell < 1) continue;
          if (next.from + cell > sourceSteps) continue;
          splits.push([{ length: cell, repeats: passes }, weights.get(passes) || 1]);
        }
        if (splits.length) {
          const pick = weighted(splits, random);
          next = { ...next, length: pick.length, repeats: pick.repeats };
        }
      }
      // And a new pitch, within whichever system the slice is already using — a walked
      // slice gets another degree of the key, a plain one another interval. Never both:
      // the recipe carries one pitch system at a time and a reroll must not smuggle in a
      // second.
      // Either way MOOD picks the direction — the bright degrees of the key, or an upward
      // lift, at the euphoric end; the dark ones and a drop at the noir end. It is a
      // weighting, so the middle of the dial is the even choice this always made.
      if (random() < 0.4) {
        if (operation.harmony && recipe.key) {
          const degrees = [0, 1, 2, 3, 4, 5, 6].filter((degree) => degree !== operation.harmony);
          const degree = weighted(degrees.map((value) =>
            [value, moodDegreeWeight(value, recipe.key.minor, creative.mood)]), random);
          if (degree) next = { ...next, harmony: degree };
          else { const { harmony, ...plain } = next; void harmony; next = plain; }
        } else if (!operation.harmony) {
          const lean = creative.mood - 0.5;
          next = {
            ...next,
            transpose: weighted([0, ...REARRANGE_GENERATED_TRANSPOSES]
              .map((value) => [value, 1 + lean * 1.6 * Math.sign(value)]), random),
          };
        }
      }
      replacement = [next];
    } else if (action === 'stutter') {
      // A FILL AIMED AT ONE SLICE. The slice's opening fragment is retriggered across its
      // own time — a beat becomes four sixteenths of the same beat — so the time it takes
      // is unchanged and only its rhythm is. It is tagged as a fill because that is what
      // it is to the engine: fills are whole-band and bypass Song groove for their own
      // span, which is what makes the kit stutter WITH the music instead of playing a
      // straight bar underneath a stuttering top.
      const duration = operation.length * operation.repeats;
      const shape = REARRANGE_STUTTER_SHAPES[String(value)];
      let cells = null;
      if (shape) {
        // A named rhythm is a set of relative cell WEIGHTS, so it lands on any slice long
        // enough to divide by their sum: gallop is long-short-short, ramp accelerates.
        const unit = duration / shape.reduce((sum, weight) => sum + weight, 0);
        if (Number.isInteger(unit) && unit >= 1) cells = shape.map((weight) => weight * unit);
      } else {
        // Number(), not int(): int() answers null for a STRING, and the count arrives as
        // one from a <select>. Falling back to 4 on every string meant the dropdown did
        // ×4 whichever number was chosen — and did it for ×8 on a beat, where the honest
        // answer is that four sixteenths will not divide into eight.
        const count = Math.trunc(Number(value));
        const cell = Number.isFinite(count) && count > 1 ? duration / count : NaN;
        if (Number.isInteger(cell) && cell >= 1) cells = new Array(count).fill(cell);
      }
      if (cells) {
        replacement = cells.map((length) => ({
          from: operation.from, length, repeats: 1,
          transpose: operation.transpose || 0,
          ...(operation.harmony ? { harmony: operation.harmony } : {}),
          fill: 'machinegun',
        }));
      }
    } else if (action === 'mute' || action === 'unmute') {
      // Silence is a property of the slice, not a removal of it: the time is still taken,
      // the parts around it do not move, and turning it back on returns the material that
      // was always there. Deleting and re-adding could not promise that.
      const silent = action === 'mute';
      if (!!operation.mute !== silent) {
        if (silent) replacement = [{ ...operation, mute: true }];
        else { const { mute, ...heard } = operation; void mute; replacement = [heard]; }
      }
    } else if (action === 'harmony') {
      // MIX AND MATCH. A walk sets a part's chords in one go, but which chord any ONE
      // slice plays is its own business — a bar of the 4 inside a 1 4 6 7 part, or a bar
      // left as written inside a walked one. Setting a chord clears any chromatic
      // transpose on that slice, because a recipe carries one pitch system at a time.
      const degree = int(value) || 0;
      if (degree && !recipe.key) throw new Error('Choose a key before setting a slice chord');
      if (Math.abs(degree) > REARRANGE_HARMONY_RANGE) throw new Error('That chord is out of range');
      if (degree) replacement = [{ ...operation, harmony: degree, transpose: 0 }];
      else { const { harmony, ...plain } = operation; void harmony; replacement = [plain]; }
    } else if (action === 'walk-off' && operation.harmony) {
      // Dropping a walk is per-SLICE, unlike turning one on. A walk is a progression over
      // a section's bars, so switching it on is a decision about the whole part — but the
      // bars you want back as written are whichever ones you picked, and making you undo
      // the part's whole walk to free two of them is not the same edit.
      const { harmony, ...plain } = operation;
      void harmony;
      replacement = [plain];
    }
    if (replacement.length !== 1 || !operationEqual(replacement[0], operation)) changed++;
    operations.push(...replacement);
    for (let pass = 0; pass < replacement.length; pass += 1) ownership.push(owners[index]);
  });
  return {
    recipe: {
      ...rebuildForm(recipe, operations, ownership),
      seed: Number(seed) >>> 0,
    },
    changed,
  };
}

/** Validate and clone a recipe before it reaches the audio engine. */
export function validateRearrangement(value, sourceSteps, { songId = null } = {}) {
  if (!value || value.kind !== REARRANGE_KIND
    || ![1, REARRANGE_VERSION].includes(value.version)) {
    throw new Error('Not a supported Rearrange JSON file');
  }
  if (value.grid !== REARRANGE_GRID) throw new Error('Rearrange JSON uses an unsupported grid');
  if (!Number.isInteger(sourceSteps) || sourceSteps <= 0) {
    throw new RangeError('The current song has no playable steps');
  }
  if (value.source?.steps !== sourceSteps) {
    throw new Error(`This recipe needs ${value.source?.steps || '?'} steps; the current song has ${sourceSteps}`);
  }
  const outputSteps = int(value.output?.steps) || sourceSteps;
  if (outputSteps <= 0 || outputSteps % 4 !== 0) {
    throw new Error('Rearrange JSON has an invalid beat-aligned output length');
  }
  const form = validateForm(value.form, outputSteps, sourceSteps);
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
    const fill = raw?.fill == null ? null : String(raw.fill);
    const favourite = raw?.favourite === true;
    if (from < 0 || length < 1 || from + length > sourceSteps) {
      throw new Error(`Operation ${index + 1} is outside the source song`);
    }
    if (length < 4 && !fill && !favourite) {
      throw new Error(`Operation ${index + 1} is a sub-beat slice without a fill`);
    }
    if (!fill && !favourite && (from % 4 !== 0 || length % 4 !== 0)) {
      throw new Error(`Operation ${index + 1} is not beat-aligned`);
    }
    if (fill && !REARRANGE_FILL_NAMES.includes(fill)) {
      throw new Error(`Operation ${index + 1} has an unsupported fill`);
    }
    const mute = raw?.mute === true;
    if (repeats < 1 || repeats > 4) throw new Error(`Operation ${index + 1} has invalid repeats`);
    if (!REARRANGE_TRANSPOSES.includes(transpose)) {
      throw new Error(`Operation ${index + 1} has an unsupported transpose`);
    }
    if (harmony && (!key || Math.abs(harmony) > REARRANGE_HARMONY_RANGE)) {
      throw new Error(`Operation ${index + 1} has a chord offset ${key ? 'out of range' : 'but the recipe names no key'}`);
    }
    total += length * repeats;
    return {
      from, length, repeats, transpose,
      ...(harmony ? { harmony } : {}),
      ...(mute ? { mute: true } : {}),
      ...(fill ? { fill } : {}),
      ...(favourite ? { favourite: true } : {}),
    };
  });
  if (total !== outputSteps) {
    throw new Error(`Rearrange output is ${total} steps, expected ${outputSteps}`);
  }
  const repairedForm = form?.map((section) => {
    if (section.source != null) return section;
    let cursor = 0;
    let source = null;
    for (const operation of operations) {
      const end = cursor + operation.length * operation.repeats;
      if (cursor < section.end && end > section.start) {
        source = source == null ? operation.from : Math.min(source, operation.from);
      }
      cursor = end;
      if (cursor >= section.end) break;
    }
    return source == null ? section : { ...section, source };
  });
  const fills = fillOverlays(operations);
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
    ...(outputSteps === sourceSteps ? {} : { output: { steps: outputSteps } }),
    ...(drums === 'original' ? {} : { drums }),
    ...(key ? { key } : {}),
    ...(fills.length ? { fills } : {}),
    ...(repairedForm ? { form: repairedForm } : {}),
    operations,
  };
}

/** Return the source mapping and operation/repeat row for an output step. */
export function rearrangementPosition(recipe, outputStep) {
  const total = rearrangementOutputSteps(recipe) || recipe?.output?.steps || recipe?.source?.steps || 0;
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
