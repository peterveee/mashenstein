// Browser-safe scratch-song plan — the musical machinery without any Node imports.
//
// Extracted from new-song.js so the static mixer can generate a playable bank without
// a server. The file-writing half (`newScratchSong`) stays in new-song.js because it
// needs song-source.js and imported-index.js, which pull in `fs` and `path`.
//
// The musical vocabulary is in song-styles.js; this file is the machinery that plays
// a pack: pick a style, pick a key, pick a progression, a kit, a bass figure and a
// melody out of it. Everything is chosen by the seed, once, at creation time.
import { n, chord } from '../../src/engine/notes.js';
import { randomSongName } from './song-names.js';
import {
  SONG_STYLES, STYLE_BY_ID, STYLE_IDS, AUTO_STYLE, MODES,
  degreePitch, inRegister, melodyNote, shift, styleSummary,
} from './song-styles.js';

export const NEW_SONG_TEMPLATES = ['blank', 'beat', 'full-band'];
export const NEW_SONG_STYLES = [AUTO_STYLE, ...STYLE_IDS];
export const NEW_SONG_DEFAULTS = { bpm: 120, bars: 8, template: 'blank', style: AUTO_STYLE };
export const NEW_SONG_LIMITS = { minBpm: 40, maxBpm: 240, minBars: 1, maxBars: 64 };
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

function drumLane(style, seed, laneKey) {
  const pattern = choose(style.drums?.[laneKey], seed, `drum:${laneKey}`);
  if (!pattern) return null;
  return put(emptyPercussion(), pattern.map((i) => [i, true]));
}

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
    const lift = style.bassLift != null && step % 8 === style.bassLift;
    lane[step] = n(lift ? shift(name, 12) : name);
  }
  return lane;
}

function chordLaneFor(style) {
  return style.lanes.band.find((key) => key === 'chords' || key === 'organChords') || null;
}

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

function lanesFor(style, template) {
  if (template === 'beat') return [...style.lanes.beat];
  if (template === 'full-band') return [...style.lanes.band];
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
