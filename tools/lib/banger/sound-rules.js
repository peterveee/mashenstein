import { CREATIVE_DRUM_KITS } from '../../../src/data/creative-drum-kits.js';
// MAKE A BANGER — the sound rulebook. What every sound slot is, and what may go in it.
//
// One answer, asked from three places: the Banger Sounds page (which only offers what
// passes, and says why the rest is shut), the generator (which reads the table through
// `resolveSounds`), and the tests (which hold the shipped table to the same rules). A
// rule written anywhere else is a rule that will disagree with this one sooner or later.
//
// HARD RULES block a choice outright:
//   · not a library preset — a song's own copy, or a name for a lane's built-in sound
//     (a frozen STARTER is fine: it is a library sound frozen so a generator's choice can
//     never be changed under it by a library edit — see STARTER in src/data/voices.js)
//   · an ENGINE preset — it is a bundle of bank keys a lane's built-in body reads, and a
//     banger's parts play on layer tracks, where it makes no sound at all
//   · a drum on a tuned part, or a tuned sound on a drum part
//   · a preset locked to other lanes
//   · a CRLS-1 on a busy part (more than eight notes a bar) — the CPU budget, see
//     docs/audio/remixes.md
//   · a JMJR-4 speech synth on a Random list — it needs words to say
//   · a wobble or a growl (WUB …, … Growl) as the MAIN bass, chosen or Random — too much
//     to stand a banger on; it can still be a layer, like future bass's WOBBLE (2 Oct 2026)
//   · anything on the style's never-use list
//   · an MRDR-3 or a JMJR-4 in a PHONE style (a lite recipe, `phone: true`) — the two synths
//     whose cost a phone cannot carry (work/local/_banger-lanes-webkit-2026-10-04.txt)
// SOFT RULES only warn: a CRLS-1 on a Random list (skipped whenever the riff part is
// busy), a sound outside the usual categories for a Random job.
//
// Browser-safe: no `node:*` imports.
import { VOICES, voicesFor } from '../../../src/data/voices.js';
import { SHARED_MOODS } from './moods.js';
import { styleFor } from './styles/index.js';
import { fusionIds } from './styles/fusion.js';

/**
 * Every slot a style's table fills. `prefer` only ORDERS a slot's list — its usual
 * categories first — and is never a rule: a bell is a fine bass if it passes the rules. `family` is the lane family the sound plays in (a
 * banger's parts land on layers of it — `lead2`, `bass3` — so that is what the picker
 * rules are asked about); `busy` marks a part that can run past eight notes a bar.
 */
export const PART_SLOTS = Object.freeze([
  { key: 'bass', label: 'Bass', family: 'bass', kind: 'tone', busy: true, prefer: ['Bass'], phrase: 'bass', group: 'Bass',
    note: 'the off-beat (or rolling) bass under the builds and drops' },
  { key: 'sub', label: 'Sub', family: 'bass', prefer: ['Bass'], kind: 'tone', phrase: 'sub', group: 'Bass',
    note: 'the sine sub an octave under the bass' },
  { key: 'square', label: 'Square Double', prefer: ['Lead', 'Keys'], family: 'lead', kind: 'tone', phrase: 'hook', group: 'Hook doubles',
    note: 'doubles the hook at unison in every drop' },
  { key: 'squareDense', label: 'Square Double · Busy Hook', prefer: ['Lead', 'Keys'], family: 'lead', kind: 'tone', busy: true, phrase: 'busy', group: 'Hook doubles',
    note: 'the same job when the hook runs past eight notes a bar' },
  { key: 'bell', label: 'Bell Octave', prefer: ['Bells', 'Pluck', 'Keys'], family: 'lead', kind: 'tone', busy: true, phrase: 'hook8', group: 'Hook doubles',
    note: 'the hook an octave up, from the second phrase' },
  { key: 'megaSaw', label: 'Mega Saw', prefer: ['Lead'], family: 'lead', kind: 'tone', busy: true, phrase: 'hook8', group: 'Hook doubles',
    note: 'the hook an octave up in drop two and after' },
  { key: 'third', label: 'Third Below', prefer: ['Keys', 'Lead'], family: 'lead', kind: 'tone', busy: true, phrase: 'third', group: 'Hook doubles',
    note: 'a harmony a third under the hook' },
  { key: 'arp', label: 'Arp', prefer: ['Pluck', 'Bells', 'Lead'], family: 'lead', kind: 'tone', busy: true, phrase: 'arp', group: 'Texture',
    note: 'sixteenths through the chords in the builds and later drops' },
  { key: 'counter', label: 'Counter-Melody', prefer: ['Pluck', 'Bells', 'Lead'], family: 'lead', kind: 'tone', phrase: 'counter', group: 'Texture',
    note: 'a new line in the hook\'s rests' },
  { key: 'choir', label: 'Choir', prefer: ['Orch', 'Pad'], family: 'lead', kind: 'tone', phrase: 'pad', group: 'Texture',
    note: 'held chords in the breakdown and the final drop' },
  { key: 'saws', label: 'Supersaws', prefer: ['Lead', 'Pad'], family: 'chords', kind: 'tone', phrase: 'saws', group: 'Chords',
    note: 'Chords = Pumping Supersaws' },
  { key: 'pad', label: 'Pad', prefer: ['Pad', 'Orch'], family: 'chords', kind: 'tone', phrase: 'pad', group: 'Chords',
    note: 'the build and breakdown pad, and Chords = Pad' },
  { key: 'piano', label: 'Piano Stabs', prefer: ['Keys', 'Organ'], family: 'chords', kind: 'tone', phrase: 'stabs', group: 'Chords',
    note: 'Chords = Piano Stabs' },
  { key: 'impact', label: 'Impact', prefer: ['Sweep', 'Tom', 'Kick'], family: 'tom', kind: 'drum', phrase: 'one', group: 'Percussion',
    note: 'the hit on the first beat of every drop' },
  { key: 'shaker', label: 'Shaker', prefer: ['Perc'], family: 'rim', kind: 'drum', phrase: 'shaker', group: 'Percussion' },
  { key: 'tambourine', label: 'Tambourine', prefer: ['Perc'], family: 'rim', kind: 'drum', phrase: 'tambourine', group: 'Percussion' },
  { key: 'congas', label: 'Congas', prefer: ['Perc', 'Tom'], family: 'tom', kind: 'drum', phrase: 'congas', group: 'Percussion' },
  { key: 'cowbell', label: 'Cowbell', prefer: ['Perc'], family: 'rim', kind: 'drum', phrase: 'cowbell', group: 'Percussion' },
  { key: 'ride', label: 'Ride', prefer: ['Crash', 'Hats'], family: 'crash', kind: 'drum', phrase: 'ride', group: 'Percussion' },
  { key: 'fallbackMelodic', label: 'Riff Fallback', prefer: ['Keys', 'Lead'], family: 'lead', kind: 'tone', phrase: 'hook', group: 'Fallback',
    note: 'what a riff part plays when its own built-in engine sound cannot follow it onto a layer track' },
  // A style's own parts: only the styles named in `styles` play them, so only theirs name a sound.
  { key: 'sonar', label: 'Sonar', prefer: ['Keys', 'Lead', 'Bells'], family: 'lead', kind: 'tone', phrase: 'sonar', group: 'Style parts',
    styles: ['kraftwerk'], note: 'a filtered ping on the chord\'s root every two bars' },
  { key: 'vocoder', label: 'Vocoder', prefer: ['FX', 'Lead'], family: 'lead', kind: 'tone', busy: true, phrase: 'hook', group: 'Style parts',
    styles: ['kraftwerk'], note: 'sings the hook, and repeats its first note in eighths as the spoken word' },
  { key: 'rim', label: 'Rim Clicks', prefer: ['Rim', 'Perc'], family: 'rim', kind: 'drum', phrase: 'rim', group: 'Style parts',
    styles: ['kraftwerk'], note: 'short clicks on the off-beats' },
]);
/** The part slots a style's table fills: every shared one, and its own (`styles`). */
export const slotsFor = (styleId) => PART_SLOTS.filter((p) => !p.styles || p.styles.includes(styleId));

/** The drum kit roles. Only the style kit must fill every one: any other kit may leave a
 * role out, and plays the style kit's sound there. */
export const KIT_ROLES = Object.freeze([
  { key: 'kick', label: 'Kick', prefer: ['Kick'], family: 'kick', kind: 'drum', phrase: 'kick' },
  { key: 'snare', label: 'Snare', prefer: ['Snare', 'Clap'], family: 'snare', kind: 'drum', phrase: 'backbeat' },
  { key: 'clap', label: 'Clap', prefer: ['Clap', 'Snare'], family: 'clap', kind: 'drum', phrase: 'backbeat' },
  { key: 'hats', label: 'Hats', prefer: ['Hats'], family: 'hats', kind: 'drum', phrase: 'hats' },
  { key: 'ohats', label: 'Open Hats', prefer: ['Hats'], family: 'ohats', kind: 'drum', phrase: 'ohats' },
  { key: 'crash', label: 'Crash', prefer: ['Crash'], family: 'crash', kind: 'drum', phrase: 'one' },
  { key: 'fill', label: 'Fill Toms', prefer: ['Tom'], family: 'tom', kind: 'drum', phrase: 'fill' },
]);
export const KITS = Object.freeze([
  { key: 'style', label: 'Style Kit' }, { key: 'studio', label: 'Studio' }, { key: '909', label: '909' },
  { key: '808', label: '808' }, { key: 'ds', label: 'DS' }, { key: 'cr78', label: 'CR-78' },
  ...CREATIVE_DRUM_KITS.map(({ key, label, description }) => ({ key, label, title: description })),
]);

/** The Random jobs: the riff's own tuned parts, by what they do. */
export const RANDOM_JOBS = Object.freeze([
  { key: 'hook', label: 'Hook', family: 'lead', kind: 'tone', random: true, phrase: 'hook',
    categories: ['Lead', 'Keys', 'Bells', 'Pluck', 'Orch'] },
  { key: 'counter', label: 'Counter', family: 'lead', kind: 'tone', random: true, phrase: 'counter',
    categories: ['Lead', 'Keys', 'Bells', 'Pluck', 'Orch'] },
  { key: 'bass', label: 'Bass', family: 'bass', kind: 'tone', random: true, phrase: 'bass',
    categories: ['Bass', 'Lead'] },
  { key: 'chords', label: 'Chords', family: 'chords', kind: 'tone', random: true, phrase: 'saws',
    categories: ['Keys', 'Pad', 'Organ', 'Orch', 'Lead'] },
]);
/**
 * The generator's own parts that can be ROLLED: each style may list alternatives to its
 * own sound for these, and Part Sounds = Roll draws one per take (the style's own is in
 * the draw too). A part with no list always plays the style's own — which is how a
 * style's signature sounds stay put.
 */
export const CHOICE_SLOTS = Object.freeze(['saws', 'pad', 'arp', 'choir', 'bell']);
export const MOOD_IDS = Object.freeze(['anthemic', 'uplifting', 'euphoric', 'moody', 'dark', 'gothic', 'heroic', 'nostalgic', 'funky',
  ...Object.keys(SHARED_MOODS)]);

const BUSY = 'a CRLS-1 on a busy part — too heavy on the CPU (docs/audio/remixes.md)';
const HEAVY_FOR_PHONE = new Set(['MRDR-3', 'JMJR-4']);

/** Whether `styleId` is a PHONE style — a lite recipe that plays only the cheap synths. */
export const phoneStyle = (styleId) => !!styleFor(styleId)?.phone;

// What the desk's picker offers on a lane, asked once per lane: the page asks it of every
// preset for every slot, and the answer only changes when the library does.
const OFFERED = new Map();
/** Forget what the picker offers — after a preset was added to the library in this process. */
export const forgetOffered = () => OFFERED.clear();
const offeredOn = (laneKey) => {
  if (!OFFERED.has(laneKey)) OFFERED.set(laneKey, new Set(voicesFor(laneKey)));
  return OFFERED.get(laneKey);
};

/** A wobble or a growl: a bass with a talking filter or a snarl built into it. */
const isWobble = (v) => /^wub/i.test(v.id || '') || /\b(wub|growl)\b/i.test(v.label || '');

/**
 * Why `id` can or cannot go in `slot`: `{ blocked: [reasons], warnings: [reasons] }`.
 * An empty `blocked` means it may be chosen. `never` is the style's never-use list; `phone`
 * says the style is a phone style (`phoneStyle`).
 */
export function soundIssues(id, slot, { never = [], phone = false } = {}) {
  const blocked = [];
  const warnings = [];
  const v = VOICES[id];
  if (!v) return { blocked: ['not a preset in the library'], warnings };
  if (v.songLocal) blocked.push('a song\'s own copy, not a library preset');
  if (v.nameOnly) blocked.push('a name for a lane\'s built-in sound — it makes no sound of its own');
  if (v.kind === 'engine') {
    blocked.push('an engine preset — it needs a lane\'s built-in body, and banger parts play on layer tracks where it makes no sound');
  }
  if (slot.kind === 'drum' && v.kind !== 'drum') blocked.push('a tuned sound on a drum part');
  if (slot.kind === 'tone' && v.kind === 'drum') blocked.push('a drum on a tuned part');
  if (v.lanes && !v.lanes.includes(slot.family)) blocked.push(`only plays on ${v.lanes.join(', ')}`);
  // The picker hides starters only because each duplicates a library sound; on every
  // other count it is the same test.
  if (!blocked.length && !v.starter && !offeredOn(`${slot.family}2`).has(v)) blocked.push('the desk\'s own picker does not offer it on this track');
  if (v.synth === 'CRLS-1') {
    if (slot.busy) blocked.push(BUSY);
    else if (slot.random) warnings.push('a CRLS-1 — skipped whenever the riff part is busy');
  }
  if (slot.random && v.synth === 'JMJR-4') blocked.push('a speech synth — it needs words to say');
  if (slot.key === 'bass' && isWobble(v)) blocked.push('a wobble or growl — too much for the main bass (it can be a layer)');
  if (never.includes(id)) blocked.push('on the never-use list');
  if (phone && HEAVY_FOR_PHONE.has(v.synth)) blocked.push(`a ${v.synth} — too heavy for a phone style, which plays only the cheap synths`);
  if (slot.random && slot.categories && v.category && !slot.categories.includes(v.category) && !blocked.length) {
    warnings.push(`a ${v.category} sound, which is not the usual for a ${slot.label.toLowerCase()}`);
  }
  return { blocked, warnings };
}

/** May `id` go in `slot`? */
export const soundAllowed = (id, slot, opts) => soundIssues(id, slot, opts).blocked.length === 0;

/**
 * Every preset a slot could hold, as `{ id, label, category, synth, blocked, warnings }`
 * — the allowed ones first, by category then label. What the page's dropdowns list.
 */
export function slotChoices(slot, { never = [], phone = false } = {}) {
  const out = [];
  for (const [id, v] of Object.entries(VOICES)) {
    if (v.songLocal || v.nameOnly) continue;
    if (slot.kind === 'drum' ? v.kind !== 'drum' : v.kind === 'drum') continue;
    const { blocked, warnings } = soundIssues(id, slot, { never, phone });
    out.push({ id, label: v.label || id, category: v.category || '', synth: v.synth || (v.kind === 'drum' ? 'KLNG8' : v.kind), starter: !!v.starter, blocked, warnings });
  }
  const prefer = slot.prefer || slot.categories || [];
  const rank = (c) => (prefer.includes(c.category) ? prefer.indexOf(c.category) : prefer.length);
  return out.sort((a, b) => (a.blocked.length > 0) - (b.blocked.length > 0) || rank(a) - rank(b)
    || a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Everything wrong with a whole sounds table, as `[{ where, id, reason }]`. Empty means
 * every choice in it is allowed. Used by the page's Save, the server and the tests.
 */
export function tableIssues(table) {
  const issues = [];
  const add = (where, id, reason) => issues.push({ where, id: id ?? null, reason });
  if (!isObj(table)) return [{ where: 'table', id: null, reason: 'not a table of styles' }];
  for (const [styleId, s] of Object.entries(table)) {
    if (!isObj(s)) { add(styleId, null, 'not a style\'s sounds'); continue; }
    const never = Array.isArray(s.never) ? s.never : [];
    const phone = phoneStyle(styleId);
    if (s.never != null && !Array.isArray(s.never)) add(`${styleId}.never`, null, 'not a list');
    for (const id of never) if (!VOICES[id]) add(`${styleId}.never`, id, 'not a preset in the library');
    const check = (where, id, slot) => {
      if (typeof id !== 'string' || !id) { add(where, id, 'no sound chosen'); return; }
      for (const reason of soundIssues(id, slot, { never, phone }).blocked) add(where, id, reason);
    };
    for (const slot of slotsFor(styleId)) check(`${styleId}.parts.${slot.key}`, s.parts?.[slot.key], slot);
    for (const k of Object.keys(s.parts || {})) if (!slotsFor(styleId).some((p) => p.key === k)) add(`${styleId}.parts.${k}`, null, 'not a part a banger has');
    for (const kit of KITS) {
      const roles = s.kits?.[kit.key];
      if (!isObj(roles)) { add(`${styleId}.kits.${kit.key}`, null, 'the kit is missing'); continue; }
      for (const role of KIT_ROLES) {
        const id = roles[role.key];
        if (id == null || id === '') {
          if (kit.key === 'style') add(`${styleId}.kits.${kit.key}.${role.key}`, null, 'no sound chosen');
          continue;
        }
        check(`${styleId}.kits.${kit.key}.${role.key}`, id, role);
      }
    }
    for (const job of RANDOM_JOBS) {
      const list = s.random?.[job.key];
      if (!Array.isArray(list)) { add(`${styleId}.random.${job.key}`, null, 'the list is missing'); continue; }
      if (!list.length) add(`${styleId}.random.${job.key}`, null, 'the list is empty — Random would have nothing to pick');
      const seen = new Set();
      list.forEach((id, i) => {
        if (seen.has(id)) add(`${styleId}.random.${job.key}[${i}]`, id, 'listed twice');
        seen.add(id);
        // The never-use list simply WINS on a Random list — resolveSounds drops the sound
        // from it — so barring a sound does not mean hunting it out of every list first.
        // A part or a kit has to name SOME sound, so there it stays a problem to fix.
        if (typeof id !== 'string' || !id) { add(`${styleId}.random.${job.key}[${i}]`, id, 'no sound chosen'); return; }
        for (const reason of soundIssues(id, job, { never: [], phone }).blocked) add(`${styleId}.random.${job.key}[${i}]`, id, reason);
      });
    }
    if (s.choices != null && !isObj(s.choices)) add(`${styleId}.choices`, null, 'not a set of lists');
    for (const [k, list] of Object.entries(isObj(s.choices) ? s.choices : {})) {
      const slot = CHOICE_SLOTS.includes(k) && slotsFor(styleId).find((p) => p.key === k);
      if (!slot) { add(`${styleId}.choices.${k}`, null, 'not a part that can be rolled'); continue; }
      if (!Array.isArray(list)) { add(`${styleId}.choices.${k}`, null, 'not a list'); continue; }
      const seen = new Set([s.parts?.[k]]);
      list.forEach((id, i) => {
        if (seen.has(id)) add(`${styleId}.choices.${k}[${i}]`, id, 'listed twice, or the style\'s own sound');
        seen.add(id);
        check(`${styleId}.choices.${k}[${i}]`, id, slot);
      });
    }
    for (const [mood, m] of Object.entries(s.moods || {})) {
      if (!MOOD_IDS.includes(mood)) { add(`${styleId}.moods.${mood}`, null, 'not a mood'); continue; }
      for (const [k, id] of Object.entries(m?.parts || {})) {
        const slot = slotsFor(styleId).find((p) => p.key === k);
        if (!slot) add(`${styleId}.moods.${mood}.parts.${k}`, id, 'not a part a banger has');
        else check(`${styleId}.moods.${mood}.parts.${k}`, id, slot);
      }
      for (const id of m?.skip || []) if (!VOICES[id]) add(`${styleId}.moods.${mood}.skip`, id, 'not a preset in the library');
    }
  }
  return issues;
}

/**
 * A FUSION's row (styles/fusion.js): the music's row with the beat's in the beat's slots — the
 * kits, the percussion, the bass and sub, the bass's Random list — mood by mood the same way.
 * A sound either style never uses stays out. Null unless both rows are in the table.
 */
const beatSlot = (key) => {
  const slot = PART_SLOTS.find((p) => p.key === key);
  return !!slot && (slot.group === 'Bass' || slot.group === 'Percussion' || slot.kind === 'drum');
};
const beatPicked = (music, beat) => {
  const out = {};
  for (const [k, v] of Object.entries(music || {})) if (!beatSlot(k)) out[k] = v;
  for (const [k, v] of Object.entries(beat || {})) if (beatSlot(k)) out[k] = v;
  return out;
};
export function fusionRow(table, id) {
  const pair = fusionIds(id);
  const m = pair && table?.[pair.music];
  const b = pair && table?.[pair.beat];
  if (!m || !b) return null;
  const moods = {};
  for (const mood of new Set([...Object.keys(m.moods || {}), ...Object.keys(b.moods || {})])) {
    const mm = m.moods?.[mood] || {};
    const bm = b.moods?.[mood] || {};
    moods[mood] = { parts: beatPicked(mm.parts, bm.parts), skip: [...new Set([...(mm.skip || []), ...(bm.skip || [])])] };
  }
  return {
    parts: beatPicked(m.parts, b.parts),
    kits: b.kits,
    random: { ...m.random, bass: b.random?.bass || [] },
    choices: beatPicked(m.choices, b.choices),
    moods,
    never: [...new Set([...(m.never || []), ...(b.never || [])])],
  };
}
/** The row of `table` a recipe id plays: its own, or a fusion's put together from its two. */
export const soundsRow = (table, id) => table?.[id] ?? fusionRow(table, id) ?? undefined;

/**
 * The sounds a banger in `styleId` and `mood` is made with: the mood's part overrides
 * over the style's own, and the Random lists without the never-use list and the mood's
 * skips. What the generator reads.
 */
export function resolveSounds(table, styleId, mood) {
  const s = soundsRow(table, styleId);
  if (!s) throw new Error(`no sounds for the style "${styleId}"`);
  const m = s.moods?.[mood] || {};
  const never = new Set(s.never || []);
  const skip = new Set([...(m.skip || []), ...never]);
  const random = {};
  for (const job of RANDOM_JOBS) random[job.key] = (s.random?.[job.key] || []).filter((id) => !skip.has(id));
  // What a part may roll between: the style's own and its list, less the barred — and
  // nothing for a part the mood has chosen a sound for, since the mood's choice stands.
  const choices = {};
  for (const k of CHOICE_SLOTS) {
    if (m.parts?.[k] || !s.choices?.[k]?.length) continue;
    choices[k] = [s.parts?.[k], ...s.choices[k]].filter((id) => id && !never.has(id));
  }
  return {
    parts: { ...s.parts, ...(m.parts || {}) },
    kits: s.kits,
    random,
    choices,
    never: [...never],
    phone: phoneStyle(styleId),
  };
}
