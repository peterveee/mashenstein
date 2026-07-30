// Scratch-song generation for the mixer. The engine still owns playback and the desk
// only chooses a starter shape; what this file does is turn one seed into a playable
// song whose source reads like every other song file in the repository.
//
// The musical vocabulary is NOT here — it is in song-styles.js, one pack per style,
// and this file is the machinery that plays a pack: pick a style, pick a key, pick a
// progression, a kit, a bass figure and a melody out of it, and write the result as
// note names so the source comes out in `seq('A2 . . .')` shorthand rather than as
// arrays of frequencies.
//
// Everything is chosen by the seed, once, at creation time. Seed 0 takes the first
// entry of every list, which is what makes the canonical starter in the tests fixed:
// the first style is Electropop, its home key is A minor, and its first patterns are
// the quarter-note kick and backbeat snare the desk has always opened with.
import { n, chord } from '../../src/engine/notes.js';
import { songFile } from './song-source.js';
import { slugFor } from './imported-index.js';
import { randomSongName } from './song-names.js';
import {
  SONG_STYLES, STYLE_BY_ID, STYLE_IDS, AUTO_STYLE, MODES,
  degreePitch, inRegister, melodyNote, shift, styleSummary,
} from './song-styles.js';

export const NEW_SONG_TEMPLATES = ['blank', 'beat', 'full-band'];
export const NEW_SONG_STYLES = [AUTO_STYLE, ...STYLE_IDS];
// No default title: an unnamed song is given an adjective-and-noun name instead of
// a number, so the drawer reads as a list of songs rather than a stack of drafts.
// No default BPM either — `null` means "whatever the style is written at", and the
// dialog's BPM field overrides it only when somebody types in it.
export const NEW_SONG_DEFAULTS = { bpm: 120, bars: 8, template: 'blank', style: AUTO_STYLE };
export const NEW_SONG_LIMITS = { minBpm: 40, maxBpm: 220, minBars: 1, maxBars: 64 };
export const NEW_SONG_DEFAULT_SEED = 0;

const STEPS = 32;
const emptyMelody = () => Array.from({ length: STEPS }, () => null);
const emptyPercussion = () => Array.from({ length: STEPS }, () => false);
const put = (arr, values) => {
  for (const [i, value] of values) arr[i] = value;
  return arr;
};

/** Coerce any supplied seed into the unsigned 32-bit value stored in a song file. */
export function normalizeSeed(value, fallback = NEW_SONG_DEFAULT_SEED) {
  const nValue = Number(value);
  return Number.isFinite(nValue) ? (Math.trunc(nValue) >>> 0) : (fallback >>> 0);
}

function seedStep(seed, salt) {
  let x = (seed ^ salt) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}

// Each axis of the song is chosen with its own salt so that two of them never move
// together — a seed that changes the kick has no reason to also change the key. The
// salt is folded from the axis's NAME rather than kept in a table of magic numbers,
// which is what lets a pack add a lane without anybody allocating it a constant.
function saltOf(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function choose(list, seed, axis) {
  if (!list || !list.length) return undefined;
  if (seed === NEW_SONG_DEFAULT_SEED) return list[0];
  return list[seedStep(seed, saltOf(axis)) % list.length];
}

/** The style a song is generated in: the one named, or the one the seed picks. */
export function styleFor(seed = NEW_SONG_DEFAULT_SEED, id = AUTO_STYLE) {
  if (id && id !== AUTO_STYLE) return STYLE_BY_ID[id] || SONG_STYLES[0];
  return choose(SONG_STYLES, normalizeSeed(seed), 'style');
}

/**
 * The chords of one 32-step loop: `[[step, chordName]]`, plus the chord under every
 * step so the bass can follow it.
 *
 * A progression spreads evenly over the loop however long it is — four chords are a
 * block of eight steps each, two are sixteen, one holds the whole loop — and the
 * pack's `chordHits` are offsets inside a block. That is the whole of the harmonic
 * rhythm, and it is why a dub skank and a pop half-bar chord are the same code.
 */
function harmony(style, seed, root) {
  const progression = choose(style.progressions, seed, 'progression');
  const block = STEPS / progression.length;
  const hits = (choose(style.chordHits, seed, 'chordhits') || [0]).filter((h) => h < block);
  const names = progression.map(([degree, quality]) => {
    const pc = degreePitch(root, style.mode, degree);
    return `${inRegister(pc, style.registers.chord)}${quality}`;
  });
  const roots = progression.map(([degree]) => inRegister(
    degreePitch(root, style.mode, degree), style.registers.bass,
  ));
  const chordAt = (step) => Math.min(progression.length - 1, Math.floor(step / block));
  const steps = [];
  for (let i = 0; i < progression.length; i++) {
    for (const h of hits) steps.push([i * block + h, names[i]]);
  }
  return { steps, rootAt: (step) => roots[chordAt(step)] };
}

/** One percussion lane, as booleans. */
function drumLane(style, seed, laneKey) {
  const pattern = choose(style.drums?.[laneKey], seed, `drum:${laneKey}`);
  if (!pattern) return null;
  return put(emptyPercussion(), pattern.map((i) => [i, true]));
}

/**
 * One pitched line: the pack's rhythm says WHEN, its contour says WHICH DEGREE.
 *
 * The steps a rhythm does not name are rests, which is the whole difference between
 * this and the fixed eighth-note ladder it replaced — a melody with holes in it is
 * the single loudest cue that two songs are not the same song. Note LENGTH is not
 * here because a lane holds one value per step: how long a note rings is the voice's
 * own `dur`, which the pack chooses when it chooses the voice.
 */
function melodyLane(style, seed, melody, root) {
  const rhythm = choose(melody.rhythms, seed, `rhythm:${melody.lane}`);
  const contour = choose(melody.contours, seed, `contour:${melody.lane}`);
  const lane = emptyMelody();
  for (let i = 0; i < rhythm.length; i++) {
    const degree = contour[i % contour.length];
    lane[rhythm[i]] = n(melodyNote(root, style.mode, melody.register, degree));
  }
  return lane;
}

function bassLane(style, seed, chords) {
  const rhythm = choose(style.bassRhythms, seed, 'bass');
  const lane = emptyMelody();
  for (const step of rhythm) {
    const name = chords.rootAt(step);
    // A lifted step is an octave figure — the bass note the pack asked for, up top.
    const lift = style.bassLift != null && step % 8 === style.bassLift;
    lane[step] = n(lift ? shift(name, 12) : name);
  }
  return lane;
}

function chordLaneFor(style) {
  return style.lanes.band.find((key) => key === 'chords' || key === 'organChords') || null;
}

/**
 * One section holding exactly the lanes a template asks for.
 *
 * Driven by the lane LIST rather than by a fixed set of parts, because a pack is
 * allowed to have no drums, no chord lane, or a second pitched line. Anything in the
 * list the pack cannot fill is dropped rather than faked: a lane with no data is a
 * strip that plays nothing, which is worse than a starter with one fewer track.
 */
function sectionFor(style, seed, root, laneKeys) {
  const chords = harmony(style, seed, root);
  const chordLane = chordLaneFor(style);
  const section = {};
  for (const key of laneKeys) {
    if (style.drums?.[key]) {
      const lane = drumLane(style, seed, key);
      if (lane) section[key] = lane;
      continue;
    }
    if (key === chordLane) {
      section[key] = put(emptyMelody(), chords.steps.map(([step, name]) => [step, chord(name)]));
      continue;
    }
    if (key === 'bass') { section[key] = bassLane(style, seed, chords); continue; }
    const melody = style.melodies.find((m) => m.lane === key);
    if (melody) section[key] = melodyLane(style, seed, melody, root);
  }
  return section;
}

/** Validate and normalize the fields in the New Song dialog. */
export function validateNewSong(input = {}) {
  const title = String(input.title ?? '').trim() || randomSongName();
  if (title.length > 80) throw new Error('title must be 80 characters or fewer');

  const style = String(input.style ?? NEW_SONG_DEFAULTS.style);
  if (!NEW_SONG_STYLES.includes(style)) {
    throw new Error(`style must be one of: ${NEW_SONG_STYLES.join(', ')}`);
  }
  const pack = styleFor(normalizeSeed(input.seed), style);

  // An empty BPM field means "the tempo this style is written at" — a dirge at the
  // dialog's old fixed 120 is not a dirge. A number typed in it still wins.
  const asked = input.bpm === '' || input.bpm == null ? pack.bpm : input.bpm;
  const bpm = Number(asked);
  if (!Number.isFinite(bpm) || bpm < NEW_SONG_LIMITS.minBpm || bpm > NEW_SONG_LIMITS.maxBpm) {
    throw new Error(`bpm must be between ${NEW_SONG_LIMITS.minBpm} and ${NEW_SONG_LIMITS.maxBpm}`);
  }
  const bars = Number(input.bars ?? NEW_SONG_DEFAULTS.bars);
  if (!Number.isInteger(bars)
    || bars < NEW_SONG_LIMITS.minBars || bars > NEW_SONG_LIMITS.maxBars) {
    throw new Error(`bars must be an integer between ${NEW_SONG_LIMITS.minBars} and ${NEW_SONG_LIMITS.maxBars}`);
  }
  const template = String(input.template ?? NEW_SONG_DEFAULTS.template);
  if (!NEW_SONG_TEMPLATES.includes(template)) {
    throw new Error(`template must be one of: ${NEW_SONG_TEMPLATES.join(', ')}`);
  }

  return { title: title.toUpperCase(), bpm: Math.round(bpm), bars, template, style };
}

function orderForBars(bars) {
  const order = Array.from({ length: Math.floor(bars / 2) }, () => 0);
  if (bars % 2) order.push({ s: 0, bars: 1 });
  return order.length ? order : [{ s: 0, bars: 1 }];
}

/** Which lanes a template plays, in this style. */
function lanesFor(style, template) {
  if (template === 'beat') return [...style.lanes.beat];
  if (template === 'full-band') return [...style.lanes.band];
  // Blank is one silent pitched lane — the style's own melody lane, so the track is
  // already on the right instrument before a single note is drawn into it.
  return [style.melodies[0].lane];
}

/**
 * Everything one seed decides, worked out once: the style, the key, the lanes and the
 * bank. Both public entry points go through this so the bank a test builds and the
 * bank a file is written from cannot drift apart.
 */
export function newSongPlan(input = {}) {
  const spec = validateNewSong(input);
  const seed = normalizeSeed(input.seed);
  const style = styleFor(seed, spec.style);
  const laneKeys = lanesFor(style, spec.template);
  const root = choose(style.roots, seed, 'root');
  const section = spec.template === 'blank'
    ? { [laneKeys[0]]: emptyMelody() }
    : sectionFor(style, seed, root, laneKeys);
  const bank = {
    bpm: spec.bpm,
    // The style's own bank keys — its trim, its echo, and a voice for each lane this
    // starter actually has. A `chordsVoice` on a Beat would be a bank key naming an
    // instrument the song does not play.
    ...Object.fromEntries(Object.entries(style.bank)
      .filter(([key]) => !key.endsWith('Voice') || laneKeys.some((lane) => `${lane}Voice` === key))),
    starterLanes: [...laneKeys],
    sections: [section],
    order: orderForBars(spec.bars),
  };
  return { spec, seed, style, root, bank, key: `${root} ${MODES[style.mode].label}` };
}

/** Build a playable starter bank with exactly the requested number of bars. */
export function buildNewSongBank(input = {}) {
  return newSongPlan(input).bank;
}

/** Build the source file written into src/data/imported for a new scratch song. */
export function newScratchSong({ id, title, slug = id, ...input } = {}) {
  if (!id) throw new Error('a scratch song needs an id');
  const { spec, seed, style, root, bank, key } = newSongPlan({ title, ...input });
  const source = songFile({
    id,
    title: spec.title,
    slug,
    group: 'scratch',
    bank,
    mix: null,
    arrangement: null,
    seed,
    note: `Created in the Song Mixer as a ${spec.template} starter.\n`
      + styleSummary(style, root, spec.bpm),
  });
  return {
    ...spec, id, slug, seed, bank, source, key,
    style: style.id, styleLabel: style.label,
  };
}

export { slugFor };
export { randomSongName, songNameAt, SONG_NAME_COUNT } from './song-names.js';
export { SONG_STYLES, STYLE_BY_ID } from './song-styles.js';
