// MAKE A BANGER, in the game — what is kept. 3 Oct 2026.
//
// Beside the settings in the save, not inside them: RESET TO DEFAULTS must not throw
// anyone's songs away, and it rebuilds `settings` wholesale. Per install, like the
// settings, not per slot — a song is not campaign progress.
//
//   save.data.bangers = { draft: { v, mode, bars, simple, advanced, simpleEdited, style, mood },
//                         kept: [recipe…], next, lastPlayed }
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
// made from it again when the jukebox plays it (make.js), and cached for the session. A recipe made since 4 Oct
// also carries `expression`, the version of the playing policy it opts into (make.js RECIPE_EXPRESSION); one
// saved before has none and is made exactly as it was.
import { energyOf } from '../../../tools/lib/banger/energy.js';
import { normaliseTrackEffects } from '../../../tools/lib/banger/production.js';
import { currentMood } from '../../../tools/lib/banger/moods.js';
import { save as defaultSave } from '../../engine/save.js';
import { RIFF_VERSION, normaliseNotes, upgradeDraft, upgradeRecipeNotes, modeOf } from './riff.js';
import {
  MAKER_STYLES, MAKER_MOODS, defaultMoodFor, makeBanger, styleLabel, moodLabel, RECIPE_EXPRESSION, expressionVersionOf,
} from './make.js';
import { moodSongName } from './mood-names.js';
import { STARTERS, FIRST_STARTER } from './starters.js';
import { voltageFor, voltageSettings } from './voltage.js';
import { mixWithKept } from './club-voices.js';

/**
 * How many the jukebox keeps. A recipe is a few dozen bytes, so this is only a ceiling on
 * a runaway list. Past it, saving a NEW banger is refused (keepBanger returns null) and the
 * player deletes one first — nothing is ever silently dropped (Peter, 4 Oct 2026).
 */
export const MAX_KEPT = 99;

function freshDraft() {
  const style = MAKER_STYLES[0].id;
  const voltage = 1;
  const preset = voltageSettings(voltage);
  return { v: RIFF_VERSION, ...upgradeDraft({}), style, mood: defaultMoodFor(style), voltage,
    variation: 'some', wild: preset.wild, energy: preset.energy, production: { mode: preset.production, version: 1 } };
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
  const voltage = voltageFor(d);
  const preset = voltageSettings(voltage);
  // NEW BANGER never opens on Pure (Peter, 5 Oct 2026). Drafts saved before DNA had its own
  // picker carry Voltage's old Pure (Safe and Charged), and a Pure chosen once is not a
  // default either: the draft keeps Hybrid, Spliced or Mutant, and Pure comes back as Hybrid.
  const variation = ['some', 'more', 'wild'].includes(d.variation) ? d.variation : 'some';
  const mood = currentMood(d.mood);
  b.draft = { v: RIFF_VERSION, ...upgradeDraft(d), style, mood: validMood(mood) ? mood : defaultMoodFor(style), voltage,
    variation, wild: preset.wild, energy: preset.energy, production: { mode: preset.production, version: 1 } };
  // A kept song whose style has been held back since stays playable: the generator
  // still has it. Only recipes that are not recipes at all are dropped.
  b.kept = Array.isArray(b.kept) ? b.kept.filter((r) => r && typeof r.style === 'string' && Number.isInteger(r.seed)) : [];
  for (const r of b.kept) if (r.v !== RIFF_VERSION) { Object.assign(r, upgradeRecipeNotes(r)); r.v = RIFF_VERSION; }
  // A starter already handed over follows its song file: when the file is replaced (a new
  // take), the kept record's style, mood, seed and BPM come with it, so its title is true.
  for (const r of b.kept) {
    const st = r.preset && STARTERS[r.preset];
    if (st) Object.assign(r, { mode: st.recipe.mode, notes: [...st.recipe.notes], lengths: [...(st.recipe.lengths || [])], style: st.recipe.style, mood: st.recipe.mood, seed: st.recipe.seed, bpm: st.recipe.bpm });
  }
  b.next = Number.isInteger(b.next) && b.next > 0 ? b.next : b.kept.reduce((m, r) => Math.max(m, (r.n | 0) + 1), 1);
  // Every Lab gets the starter song (starters.js) once: a first-time Lab opens on it rather
  // than an empty list, and one that already has songs gets it at the end of them (Peter,
  // 3 Oct 2026). `startersGiven` remembers it was handed over, so once deleted it is gone
  // for good. Only into a loaded save.
  const given = Array.isArray(b.startersGiven) ? b.startersGiven : (b.startersGiven = []);
  if (save.data && !given.includes(FIRST_STARTER)) {
    given.push(FIRST_STARTER);
    if (!b.kept.some((r) => r.preset === FIRST_STARTER)) {
      const st = STARTERS[FIRST_STARTER];
      b.kept.push({ v: RIFF_VERSION, n: b.next++, name: st.name, ...st.recipe, notes: [...st.recipe.notes], lengths: [...(st.recipe.lengths || [])], preset: FIRST_STARTER });
    }
    save.persist?.();
  }
  if (!b.kept.some((r) => r.n === b.lastPlayed)) delete b.lastPlayed;
  return b;
}

/** `draft` is { mode, simple, advanced, simpleEdited, style, mood }. */
export function saveDraft(draft, save = defaultSave) {
  const b = bangerState(save);
  const voltage = voltageFor(draft);
  const preset = voltageSettings(voltage);
  b.draft = { v: RIFF_VERSION, ...upgradeDraft({ ...draft, v: RIFF_VERSION }), style: draft.style, mood: draft.mood, voltage,
    variation: ['faithful', 'some', 'more', 'wild'].includes(draft.variation) ? draft.variation : 'some',
    wild: preset.wild, energy: preset.energy, production: { mode: preset.production, version: 1 } };
  save.persist?.();
}

/** The name keepBanger would give a fresh recipe — shown while a new banger plays before it is kept. */
export function bangerNameFor(recipe, save = defaultSave, random = Math.random) {
  const b = bangerState(save);
  return moodSongName({ mood: recipe.mood, taken: b.kept.map((r) => r.name).filter(Boolean), random });
}

/**
 * A recipe for a banger that is not kept yet — the club previews it under the name it will
 * keep, before the player has chosen to save. `from` is the kept song being edited, or null
 * for a new one: an edit keeps its name (the pencil remakes in place), a new one takes the
 * desk's next unused name.
 */
export function pendingRecipe(recipe, from, save = defaultSave, random = Math.random) {
  return { v: RIFF_VERSION, n: from ? from.n : 0, name: from ? from.name : bangerNameFor(recipe, save, random), ...recipe };
}

/**
 * A recipe's expression version, written where it is one and absent where it is none: a recipe
 * saved before expression existed has no such field, and a legacy-shaped one stays that shape.
 */
const writeExpression = (rec, expression) => {
  if (expression >= 1) rec.expression = expression;
  else delete rec.expression;
};
const variationOf = (variation, wild) => variation || (wild ? 'wild' : 'some');

/**
 * Keep a newly made banger. The same riff, style and mood as the last song in the list
 * is a new take of THAT song: its seed and BPM change, its name and place do not. Anything
 * else is a new song at the end of the list, under a name no kept song has. Returns the
 * recipe (the same object, for a new take).
 *
 * `expression` is the recipe's expression version (make.js): a new recipe from the maker carries 1.
 * It is part of what a song IS — a legacy recipe with Go Wild on and the same recipe opting in are
 * made differently — so it is compared with the rest, and a new take writes it onto the record, or
 * the song just made and cached would be made differently the next time it is played.
 */
export function keepBanger({ notes, lengths = null, mode = 'simple', style, mood, seed, bpm, voltage = null, wild = false, variation = null, energy = 'full', expression = 0, production = null, paletteSnapshot = null, flavour = null, fresh = false, name = null }, save = defaultSave, random = Math.random) {
  const b = bangerState(save);
  const m = modeOf(mode).id;
  const grid = normaliseNotes(notes, m);
  energy = energyOf(energy);
  expression = expressionVersionOf(expression);
  const treatment = normaliseTrackEffects(production);
  const last = b.kept.at(-1);
  // `fresh` always keeps a new song (an edited starter: the starter itself is never touched)
  if (!fresh && last && !last.preset && last.mode === m && last.style === style && last.mood === mood && variationOf(last.variation, last.wild) === variationOf(variation, wild) && !!last.wild === wild && energyOf(last.energy) === energy
    && expressionVersionOf(last.expression) === expression && normaliseTrackEffects(last.production).mode === treatment.mode && last.notes.join() === grid.join()
    && (last.lengths || []).join() === (lengths || []).join()
    && JSON.stringify(last.paletteSnapshot || null) === JSON.stringify(paletteSnapshot || null)) {
    songs.delete(keyOf(last));
    Object.assign(last, { seed, bpm });
    // A new take rolls its own flavour (make.js labFlavour), kept with it.
    if (flavour) last.flavour = flavour; else delete last.flavour;
    writeExpression(last, expression);
    if (production) last.production = treatment;
    save.persist?.();
    return last;
  }
  // The list is full: a brand-new song needs a free slot, so the save is refused rather
  // than evicting the oldest (Peter, 4 Oct 2026). A new take of the last song above still
  // works — it replaces in place and takes no slot.
  if (b.kept.length >= MAX_KEPT) return null;
  // named for its mood (mood-names.js): a bittersweet song is LEMON or UNSENT something.
  // A pending preview passes the name it has already shown, so saving does not rename it.
  const keptName = name ?? moodSongName({ mood, taken: b.kept.map((r) => r.name).filter(Boolean), random });
  const rec = { v: RIFF_VERSION, n: b.next++, name: keptName, mode: m, notes: grid, lengths: [...(lengths || [])], style, mood, seed, bpm,
    voltage: voltageFor({ voltage, wild, variation, energy, production }), wild, energy };
  if (variation) rec.variation = variation;
  // The flavour the take played (make.js labFlavour): kept, so a flavour added later never moves it.
  if (flavour) rec.flavour = flavour;
  writeExpression(rec, expression);
  if (production) rec.production = treatment;
  if (paletteSnapshot) rec.paletteSnapshot = structuredClone(paletteSnapshot);
  b.kept.push(rec);
  save.persist?.();
  return rec;
}

/**
 * A kept banger changed in place — the club's pencil (Peter, 3 Oct 2026): its riff, style
 * and mood as edited and a fresh seed, under the same name and number. The old song is
 * dropped from the cache.
 */
export function reviseBanger(rec, { notes, lengths = null, mode = rec.mode, style, mood, seed, bpm, voltage = rec.voltage ?? null, wild = !!rec.wild, variation = rec.variation ?? null, energy = rec.energy, expression = RECIPE_EXPRESSION, production = rec.production, paletteSnapshot = rec.paletteSnapshot, flavour = null }, save = defaultSave) {
  songs.delete(keyOf(rec));
  const m = modeOf(mode).id;
  Object.assign(rec, { mode: m, notes: normaliseNotes(notes, m), lengths: [...(lengths || [])], style, mood, seed, bpm,
    voltage: voltageFor({ voltage, wild, variation, energy, production }), wild, energy: energyOf(energy) });
  if (variation) rec.variation = variation; else delete rec.variation;
  if (flavour) rec.flavour = flavour; else delete rec.flavour;
  // A revised song gets a fresh seed and so is made new: it opts into the current expression
  // version unless it is told otherwise, which is how a legacy recipe moves to the new policy.
  writeExpression(rec, expressionVersionOf(expression));
  if (production) rec.production = normaliseTrackEffects(production); else delete rec.production;
  if (paletteSnapshot) rec.paletteSnapshot = structuredClone(paletteSnapshot); else delete rec.paletteSnapshot;
  delete rec.preset;
  save.persist?.();
  return rec;
}

/** Take a kept banger out of the list (DELETE on the jukebox). True if it was there. */
export function deleteBanger(rec, save = defaultSave) {
  const b = bangerState(save);
  const i = b.kept.indexOf(rec);
  if (i < 0) return false;
  b.kept.splice(i, 1);
  if (b.lastPlayed === rec.n) delete b.lastPlayed;
  songs.delete(keyOf(rec));
  save.persist?.();
  return true;
}

/**
 * A kept song's club mixer — `{ levels: { drums, bass, chords, lead }, sounds: { own, swap } }`,
 * the faders and each part's sound by name (club-voices.js picksNamed) — kept on its recipe
 * (Peter, 5 Oct 2026: "save the mixer settings, esp since we can now change the presets"). Null,
 * or every fader up and no sound changed, takes it off again. Not part of what makes the song:
 * its take is the same with or without it.
 */
export function keepMixer(rec, mixer, save = defaultSave) {
  if (!rec) return;
  const plain = !mixer || (Object.values(mixer.levels || {}).every((v) => v === 1) && !mixer.pitch && !mixer.sounds?.swapped
    && !Object.keys(mixer.sounds?.own || {}).length && !Object.keys(mixer.sounds?.swap || {}).length);
  if (plain) delete rec.mixer; else rec.mixer = structuredClone(mixer);
  save.persist?.();
}

/** The last Lab song played, or null if it is no longer in the kept list. */
export function lastPlayedBanger(save = defaultSave) {
  const b = bangerState(save);
  return b.kept.find((r) => r.n === b.lastPlayed) || null;
}

/** Remember the kept song that was just opened in the Lab's club. */
export function rememberBanger(rec, save = defaultSave) {
  const b = bangerState(save);
  if (!b.kept.includes(rec)) throw new Error('Cannot remember a banger that is not kept');
  b.lastPlayed = rec.n;
  save.persist?.();
}

const songs = new Map();
const keyOf = (r) => `${r.preset || ''}|${r.mode}|${r.style}|${r.mood}|${!!r.wild}|${variationOf(r.variation, r.wild)}|${energyOf(r.energy)}|${expressionVersionOf(r.expression)}|${JSON.stringify(normaliseTrackEffects(r.production))}|${JSON.stringify(r.paletteSnapshot || null)}|${r.flavour || ''}|${r.seed}|${r.notes.join(',')}`;

/** The song for a recipe, made on first ask and kept for the session. */
export function songFor(rec, prebuilt = null) {
  const k = keyOf(rec);
  if (prebuilt) songs.set(k, prebuilt);
  if (!songs.has(k)) songs.set(k, rec.preset && STARTERS[rec.preset] ? STARTERS[rec.preset].song() : makeBanger(rec));
  return songs.get(k);
}

/** A kept song's title: its name, then what it was made as — PINK SCOOTER (TRANCE/HYPNOTIC). */
export const bangerTitle = (rec) => `${rec.name || `BANGER ${rec.n}`} (${styleLabel(rec.style)}/${moodLabel(rec.mood)})`;

/**
 * A kept banger as a jukebox row. The song is made when the row is first PLAYED —
 * listing eight of them must not cost eight generations on a phone — so `bank`,
 * `mix` and `arrangement` are getters, and the BPM the list shows is the recipe's. Its mix
 * carries the sounds it was left with in the club (keepMixer), so it plays as it was left.
 */
export function bangerRow(rec) {
  return {
    name: bangerTitle(rec),
    bpm: rec.bpm,
    banger: rec,
    get bank() { return songFor(rec).bank; },
    get mix() { return rec.mixer?.sounds ? mixWithKept(songFor(rec), rec, rec.mixer.sounds) : songFor(rec).mix; },
    get arrangement() { return songFor(rec).arrangement; },
  };
}

/** The jukebox's banger rows: the kept songs, oldest first — none until one is made. */
export function jukeboxBangerRows(save = defaultSave) {
  return bangerState(save).kept.map(bangerRow);
}
