// MAKE A BANGER, in the game — what is kept. 3 Oct 2026.
//
// Beside the settings in the save, not inside them: RESET TO DEFAULTS must not throw
// anyone's songs away, and it rebuilds `settings` wholesale. Per install, like the
// settings, not per slot — a song is not campaign progress.
//
//   save.data.bangers = { draft: { v, mode, simple, advanced, simpleEdited, style, mood },
//                         kept: [recipe…], next }
//
// A GENER8 with a new riff, style or mood keeps a new song (Peter, 3 Oct 2026), added at
// the END, so the songs already there keep their numbers; the same riff, style and mood
// as the last song made again REGENERATES that song in place — same name and number, a
// new take; DELETE on the jukebox takes one out and the ones
// after it move up a number. They are listed after the shipped tracks, each under a name
// from the desk's new-song names (song-names.js).
//
// A recipe is { v, n, name, mode, notes, style, mood, seed, bpm }; `v` says what the note
// numbers mean (riff.js RIFF_VERSION), and an older grid is read in today's shape — a few dozen bytes. The song is
// made from it again when the jukebox plays it (make.js), and cached for the session.
import { save as defaultSave } from '../../engine/save.js';
import { RIFF_VERSION, normaliseNotes, upgradeDraft, upgradeRecipeNotes, modeOf } from './riff.js';
import { MAKER_STYLES, MAKER_MOODS, defaultMoodFor, makeBanger, styleLabel, moodLabel } from './make.js';
import { randomSongName } from '../../../tools/lib/song-names.js';

/**
 * How many the jukebox keeps. A recipe is a few dozen bytes, so this is only a ceiling on
 * a runaway list: past it, making another lets the OLDEST go.
 */
export const MAX_KEPT = 99;

function freshDraft() {
  const style = MAKER_STYLES[0].id;
  return { v: RIFF_VERSION, ...upgradeDraft({}), style, mood: defaultMoodFor(style) };
}

const validStyle = (id) => MAKER_STYLES.some((s) => s.id === id);
const validMood = (id) => MAKER_MOODS.some((m) => m.id === id);

/** The banger corner of a save, created and repaired on first touch. */
export function bangerState(save = defaultSave) {
  // Before the save has loaded (only ever a headless test) there is nothing to keep
  // into: hand back a fresh corner that is never written anywhere.
  const data = save.data || {};
  const b = data.bangers && typeof data.bangers === 'object' ? data.bangers : (data.bangers = {});
  const d = b.draft && typeof b.draft === 'object' ? b.draft : freshDraft();
  const style = validStyle(d.style) ? d.style : MAKER_STYLES[0].id;
  b.draft = { v: RIFF_VERSION, ...upgradeDraft(d), style, mood: validMood(d.mood) ? d.mood : defaultMoodFor(style) };
  // A kept song whose style has been held back since stays playable: the generator
  // still has it. Only recipes that are not recipes at all are dropped.
  b.kept = Array.isArray(b.kept) ? b.kept.filter((r) => r && typeof r.style === 'string' && Number.isInteger(r.seed)) : [];
  for (const r of b.kept) if (r.v !== RIFF_VERSION) { Object.assign(r, upgradeRecipeNotes(r)); r.v = RIFF_VERSION; }
  b.next = Number.isInteger(b.next) && b.next > 0 ? b.next : b.kept.reduce((m, r) => Math.max(m, (r.n | 0) + 1), 1);
  return b;
}

/** `draft` is { mode, simple, advanced, simpleEdited, style, mood }. */
export function saveDraft(draft, save = defaultSave) {
  const b = bangerState(save);
  b.draft = { v: RIFF_VERSION, ...upgradeDraft({ ...draft, v: RIFF_VERSION }), style: draft.style, mood: draft.mood };
  save.persist?.();
}

/**
 * Keep a newly made banger. The same riff, style and mood as the last song in the list
 * is a new take of THAT song: its seed and BPM change, its name and place do not. Anything
 * else is a new song at the end of the list, under a name no kept song has. Returns the
 * recipe (the same object, for a new take).
 */
export function keepBanger({ notes, mode = 'simple', style, mood, seed, bpm }, save = defaultSave, random = Math.random) {
  const b = bangerState(save);
  const m = modeOf(mode).id;
  const grid = normaliseNotes(notes, m);
  const last = b.kept.at(-1);
  if (last && last.mode === m && last.style === style && last.mood === mood && last.notes.join() === grid.join()) {
    songs.delete(keyOf(last));
    Object.assign(last, { seed, bpm });
    save.persist?.();
    return last;
  }
  const name = randomSongName({ taken: b.kept.map((r) => r.name).filter(Boolean), random });
  const rec = { v: RIFF_VERSION, n: b.next++, name, mode: m, notes: grid, style, mood, seed, bpm };
  b.kept.push(rec);
  if (b.kept.length > MAX_KEPT) b.kept.splice(0, b.kept.length - MAX_KEPT);
  save.persist?.();
  return rec;
}

/**
 * A kept banger changed in place — the club's pencil (Peter, 3 Oct 2026): its riff, style
 * and mood as edited and a fresh seed, under the same name and number. The old song is
 * dropped from the cache.
 */
export function reviseBanger(rec, { notes, mode = rec.mode, style, mood, seed, bpm }, save = defaultSave) {
  songs.delete(keyOf(rec));
  const m = modeOf(mode).id;
  Object.assign(rec, { mode: m, notes: normaliseNotes(notes, m), style, mood, seed, bpm });
  save.persist?.();
  return rec;
}

/** Take a kept banger out of the list (DELETE on the jukebox). True if it was there. */
export function deleteBanger(rec, save = defaultSave) {
  const b = bangerState(save);
  const i = b.kept.indexOf(rec);
  if (i < 0) return false;
  b.kept.splice(i, 1);
  songs.delete(keyOf(rec));
  save.persist?.();
  return true;
}

const songs = new Map();
const keyOf = (r) => `${r.mode}|${r.style}|${r.mood}|${r.seed}|${r.notes.join(',')}`;

/** The song for a recipe, made on first ask and kept for the session. */
export function songFor(rec, prebuilt = null) {
  const k = keyOf(rec);
  if (prebuilt) songs.set(k, prebuilt);
  if (!songs.has(k)) songs.set(k, makeBanger(rec));
  return songs.get(k);
}

/** A kept song's title: its name, then what it was made as — PINK SCOOTER (TRANCE/HYPNOTIC). */
export const bangerTitle = (rec) => `${rec.name || `BANGER ${rec.n}`} (${styleLabel(rec.style)}/${moodLabel(rec.mood)})`;

/**
 * A kept banger as a jukebox row. The song is made when the row is first PLAYED —
 * listing eight of them must not cost eight generations on a phone — so `bank`,
 * `mix` and `arrangement` are getters, and the BPM the list shows is the recipe's.
 */
export function bangerRow(rec) {
  return {
    name: bangerTitle(rec),
    bpm: rec.bpm,
    banger: rec,
    get bank() { return songFor(rec).bank; },
    get mix() { return songFor(rec).mix; },
    get arrangement() { return songFor(rec).arrangement; },
  };
}

/** The jukebox's banger rows: the kept songs, oldest first — none until one is made. */
export function jukeboxBangerRows(save = defaultSave) {
  return bangerState(save).kept.map(bangerRow);
}
