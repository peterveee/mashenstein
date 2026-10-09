// MAKE A BANGER — a few bars in, a certified banger out. 2 Oct 2026.
//
// The desk's "Make a Banger…": take a riff (1–8 bars, read off a song by riff.js), put it
// through a style recipe (styles/), and write a whole arranged song — bank, mix,
// arrangement with automation — that the desk saves as a scratch song of its own. The
// source song is never touched.
//
//   generateBanger({ riff, options, seed }) → { title, bank, mix, arrangement, note,
//     summary, form, banger, warnings }
//
// Deterministic: the same riff, options and seed always make the same song (the seed is
// split into streams — harmony, drums, form — so changing one concern does not reshuffle
// the others). That is what lets a take be re-made from its seed, and lets Another Take
// be nothing more than a new seed.
//
// Browser-safe: no `node:*` imports. The static mixer runs this in the page; the server
// only writes the file it makes.
import { Rng } from '../../../src/engine/rng.js';
import { riffNeedsLead, writeLead, freeLeadLane } from './lead.js';
import { PERCUSSION_LANES, baseLane } from '../../../src/data/voices.js';
import { LANE_KEYS } from '../../../src/engine/lanes.js';
import { arrangementIssues } from '../../../src/data/arrangements.js';
import { packBank, hasNotes, isDrumPart, midi, MIDI_MIN, MIDI_MAX, BASS_FIGURES, echoPart } from './theory.js';
import { normaliseBangerOptions, bangerBars, bangerBpm } from './options.js';
import { styleFor, soundSetOf, flavourOf, fusionOf } from './styles/index.js';
import { fuseChannels } from './styles/fusion.js';
import { validateRiff, parseRiff, pickHook } from './riff.js';
import { analyseRiff, romanChord, keyName, MODE_INFO } from './analyse.js';
import { buildForm } from './form.js';
import { buildSections, LIFT_SEMIS } from './sections.js';
import { BREAKDOWN_WAYS } from './breakdown-ways.js';
import { voiceLeadChords } from './voice-leading.js';
import { allocateLanes, buildMix, pickRiffSounds, BASS_ECHO } from './lanes.js';
import { levelMix } from './levels.js';
import { rollReport } from './report.js';
import { buildFx } from './fx.js';
import { applySectionEffects } from './section-effects.js';
import { BANGER_SOUNDS } from './sounds.js';
import { BANGER_CHANNELS } from './channels.js';
import { BANGER_COMBOS } from './combos.js';
import { bangerPrints } from './modify.js';
import { applyExpression } from './expression.js';
import { applyTrackEffects } from './production.js';
import { PART_SLOTS, soundAllowed, resolveSounds } from './sound-rules.js';
import { BANGER_PALETTE, paletteSnapshot, resolvePalette, weightedPalettePick } from './palette.js';

export { BANGER_DEFAULTS, BANGER_GROUPS, BANGER_MOODS, BANGER_KEYS, BANGER_MODES, BANGER_RIFF_NOTES, MOOD_MODES,
  BANGER_VARIATIONS, BANGER_LENGTHS,
  BANGER_TEMPOS, BANGER_LIMITS, normaliseBangerOptions, surpriseBangerOptions, goCrazyBangerOptions, styleDefaults, classicDefaults,
  bangerBars, bangerBpm, MOOD_BASS, moodBass, BANGER_STRUCTURE, keepStructure,
  BANGER_EXPRESSION_VERSION, normaliseExpression } from './options.js';
export { EXPRESSION_ROLES, EXPRESSION_POLICY, planExpression, applyExpression, voiceOfLane } from './expression.js';
export { TRACK_EFFECTS_VERSION, TRACK_EFFECTS_MODES, PRODUCTION_ROLES, trackEffectsMode,
  normaliseTrackEffects, productionFeatures, planTrackEffects, applyTrackEffects } from './production.js';
export { BANGER_STYLES, BANGER_SOUND_SETS, BANGER_FLAVOURS, styleFor, soundSetOf, soundSetsFor, flavoursFor, flavourOf, moodFlavour, fusionOf } from './styles/index.js';
export { modifyBanger, describeModify, bangerPrints } from './modify.js';
export { BREAKDOWN_WAYS, VARIED_WAYS, variedWay } from './breakdown-ways.js';
export { extractRiff, laneVoiceOf, validateRiff, pickHook, riffSummary, parseRiff } from './riff.js';
export { keyName, MODE_INFO } from './analyse.js';
export { BANGER_SOUNDS } from './sounds.js';
export {
  PART_SLOTS, KIT_ROLES, KITS, RANDOM_JOBS, CHOICE_SLOTS, MOOD_IDS, soundIssues, soundAllowed, slotChoices, tableIssues, resolveSounds,
} from './sound-rules.js';

/**
 * Bumped whenever the same seed would make different music — a take records it.
 * 3 (4 Oct 2026): the `expression` option (Auto Portamento). With it off a take is made exactly as
 * it was under 2; with it on, the lead lane gets a Note FX setting, so the music is played differently.
 * The version does not protect an old Lab recipe by itself — the Lab records none — which is what a
 * recipe's own `expression` field is for (src/game/banger/make.js).
 * 4 (4 Oct 2026): opt-in ongoing track production, under production policy 1.
 * Keep Style (also the default for old recipes) retains v3's mix and music.
 * 7 (6 Oct 2026): the Machine-Gun Sweep into one build in three, in the styles that have it (fx.js).
 * 8 (6 Oct 2026): nothing grinds (Peter: "a little discordant"). Chords are chosen against notes that
 * would grind on them (analyse.js chordFit); the lines made from the hook — pre-chorus, middle 8,
 * verse, the third below, the breakdown bell — are fitted to their chords (theory.js fitToChords);
 * a breakdown's walk gives way to a hook that grinds on it; a pedal or walking bass steps off a note
 * a semitone under the tune (clearUnder). Every take with such a moment changes, kept Lab songs too.
 * 9 (7 Oct 2026): voice leading (voice-leading.js). The coloured chords on the saws, pad, piano and
 * choir move least from the chord before, with no needless semitone clusters, instead of each sitting
 * nearest its centre on its own. Peter chose it by ear over the clusters-only fix. Every take with a
 * coloured chord changes, kept Lab songs too; NEON ORBIT, played from its file, does not.
 */
/* 10 (9 Oct 2026): CHORD MEMORY picked by the mood in Deep House and Afro House (and its flavours) —
 * Moody and Mystery stab one minor-ninth shape, Dark and Hypnotic one minor-seventh, moved onto every
 * chord's root (sections.js chordPart). Every take of those styles in those moods changes, kept Lab
 * songs too. The new styles and the Acid bass, ghost notes and filter moves move nothing that existed.
 */
/* 11 (9 Oct 2026): BREAKDOWN HOOK: VARIED (breakdown-ways.js) — a take with Varied draws how its
 * breakdown plays the hook, any of nine ways, each as often. A request that
 * names its form but no Breakdown Hook was made before there was one, and is Half Speed as it was
 * (options.js), so a desk take re-made from its recipe does not move. Kept Lab songs keep Half
 * Speed by recipe expression 6 (src/game/banger/make.js).
 */
export const BANGER_GENERATOR_VERSION = 11;
/** How each way of playing a breakdown reads in a take's note. */
const BREAKDOWN_WAY_LABELS = { ...Object.fromEntries(BREAKDOWN_WAYS.map((w) => [w.id, w.label])), exposed: 'Hook Alone' };

/** A seed as an unsigned 32-bit number. */
export const normaliseSeed = (seed) => (Number.isFinite(Number(seed)) ? (Number(seed) >>> 0) : 1);
/** A fresh seed for a new take. */
export const randomBangerSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

/** The bank's lane keys, layers included — what arrangementIssues checks lanes against. */
const laneKeysOf = (bank, mix) => [...new Set([...LANE_KEYS, ...(mix.layers || []).map((l) => l.key),
  ...Object.keys(bank).filter((k) => Array.isArray(bank[k]) && k !== 'sections' && k !== 'order' && !/Len$/.test(k))])];

/**
 * Make a banger. Throws with a readable message when the riff or the options cannot
 * make one — the dialog checks both first, so a throw from inside is a generator bug.
 */
/**
 * A style as a banger is made with it: the recipe, under the channels its seed banger set
 * (channels.js), under a Sound Combo's channels when one is chosen — job by job.
 */
export function withChannels(style, ...layers) {
  let out = style;
  for (const ch of layers) {
    if (!ch) continue;
    out = {
      ...out,
      strips: { ...out.strips, ...(ch.strips || {}) },
      master: ch.master ? { ...out.master, ...ch.master } : out.master,
      pump: ch.pump || out.pump,
      exciter: ch.exciter || out.exciter,
      sectionFx: ch.sectionFx ?? out.sectionFx,
    };
  }
  return out;
}

/**
 * The recipe a request's `fusion` names for `style` to play over, or null: a style, a flavour or a
 * Sound Set, never a fusion, never `style` itself or one of its own.
 */
function beatRecipe(style, id) {
  if (!id || id === 'none') return null;
  const beat = styleFor(id);
  return beat && !beat.fusion && (beat.base || beat.id) !== style.id ? beat : null;
}
/** The channels a recipe's seed set (channels.js): a flavour's own, a Sound Set's style's, a style's. */
const seededChannels = (channels, r) => (r.flavour ? channels?.[r.id] : channels?.[r.soundSet ? r.base : r.id]);

/** A style's sounds with a Sound Combo's over them. */
/** Every tuned note in `bank` held at most `steps` steps — each lane's `…Len`, in every section. */
function blipBank(bank, steps) {
  const cap = (obj) => {
    for (const [k, v] of Object.entries(obj)) {
      if (/Len$/.test(k) && Array.isArray(v)) obj[k] = v.map((len) => (len == null ? len : Math.min(len, steps)));
    }
  };
  cap(bank);
  for (const sec of bank.sections || []) cap(sec);
}

function withComboSounds(sounds, combo) {
  if (!combo?.sounds) return sounds;
  return {
    ...sounds,
    parts: { ...sounds.parts, ...(combo.sounds.parts || {}) },
    kits: { ...sounds.kits, style: { ...(sounds.kits?.style || {}), ...(combo.sounds.kits?.style || {}) } },
  };
}

export function generateBanger({
  riff, options: raw = {}, seed = 1, sounds: table = BANGER_SOUNDS, level = true,
  channels = BANGER_CHANNELS, combos = BANGER_COMBOS, levelData = undefined, calibration = undefined, rerolls = null,
  palette = BANGER_PALETTE,
}) {
  const recipe = styleFor(raw?.style) || styleFor('big-room');
  // A FUSION (styles/fusion.js): one recipe's SOUND over another's GROOVE, asked for two ways.
  //   · `infusion` (the desk's Infusion, 7 Oct 2026): the style is the groove — its flavour, its Sound
  //     Set, as it would play alone — and the infusion is the sound.
  //   · `fusion` (a desk take made earlier that day; the Lab, which names both): the style is the sound
  //     and the fusion is the groove (`beat`).
  // The request's defaults are the fusion's: the groove's drum switches, bass and pump, the sound's
  // everything else.
  const infusionAsked = beatRecipe(recipe, raw?.infusion);
  const beatAsked = infusionAsked ? null : beatRecipe(recipe, raw?.fusion);
  const { options, issues } = normaliseBangerOptions(raw, infusionAsked ? fusionOf(infusionAsked, recipe)
    : beatAsked ? fusionOf(recipe, beatAsked) : recipe);
  if (issues.length) throw new Error(`can't make that banger: ${issues.join('; ')}`);
  // (A fusion's defaults ask for its sound's style over its groove; an infusion asked the other way round.)
  if (infusionAsked) { options.style = recipe.id; delete options.fusion; }
  riff = sourceRiff(riff);
  const riffIssues = validateRiff(riff);
  if (riffIssues.length) throw new Error(`can't make a banger from that: ${riffIssues.join('; ')}`);
  // The riff as read off the song is what the recipe keeps: a Written Lead belongs to its
  // take, so every take — in any style — writes its own.
  const source = riff;
  const s = normaliseSeed(seed);
  const root = new Rng(s);
  // RE-ROLLS (Modify This Take): a stream drawn from a seed of its own, so one part is
  // drawn again and nothing else moves. See BANGER_REROLLS and modify.js.
  const reroll = rerolls && typeof rerolls === 'object'
    ? Object.fromEntries(Object.entries(rerolls).filter(([, v]) => v != null).map(([k, v]) => [k, normaliseSeed(v)])) : {};
  const stream = (name) => (reroll[name] != null ? new Rng(reroll[name]).stream(name) : root.stream(name));
  const partStream = (key) => (reroll.partSounds != null
    ? new Rng(reroll.partSounds).stream(`palette:${key}`) : root.stream(`palette:${key}`));
  const rng = {
    harmony: stream('harmony'), drums: stream('drums'), form: stream('form'), sounds: stream('sounds'),
    arps: stream('arps'), parts: stream('partSounds'),
    // The other forms' own (verse material, the joins) — new names, so Club's draws never move.
    verse: stream('verse'), transitions: stream('transitions'),
    // Auto Portamento's settings (expression.js), split again by role. A stream draws nothing from
    // the seed to exist, so turning it on moves no other part.
    expression: stream('expression'),
    production: stream('production'),
    sectionFx: stream('sectionFx'),
    // The builds' Machine-Gun Sweep (fx.js) — drawn only in a style that has one.
    spotFx: stream('spotFx'),
    // The acid line (theory.js acidLine) — drawn only when the bass is Acid.
    acid: stream('acid'),
    // Breakdown Hook: Varied's way (sections.js BREAKDOWN_WAYS).
    breakdown: stream('breakdown'),
  };
  const warnings = [];
  if (raw?.production?.mode && raw.production.mode !== 'style' && options.production.mode === 'style') {
    warnings.push(`Track Effects policy ${JSON.stringify(raw.production.version)} is unknown — kept the style's production`);
  }
  // Only an unknown version can have been refused (the option is read, never reported): say so.
  if (raw?.expression?.autoPortamento === true && !options.expression.autoPortamento) {
    warnings.push(`Auto Portamento was asked for by expression version ${JSON.stringify(raw.expression.version)}, which this generator does not know — made without it`);
  }
  // A SOUND SET (styles/index.js BANGER_SOUND_SETS): the style's music on another set of
  // sounds — a recipe of its own, with its own entry in sounds.js, and maybe a phone budget
  // or blips. Its channels are the style's.
  const set = options.parts.soundSet === 'style' ? null : soundSetOf(recipe, options.parts.soundSet);
  if (options.parts.soundSet !== 'style' && !set) {
    warnings.push(`${recipe.label} has no ${({ light: 'Light', '8bit': '8-Bit' })[options.parts.soundSet] || options.parts.soundSet} Sound Set — made with its own sounds`);
  }
  // A FLAVOUR (styles/flavours.js): another arrangement of the style — its drums, rhythms,
  // sounds and how long its chords are held — chosen by the mood (the default), by name, or
  // drawn from the seed. Not under a Sound Set, which is the style's own music re-voiced.
  const flavour = set ? null : flavourOf(recipe, options.flavour, { seed: s, mood: options.mood });
  // The other recipe, as asked for when that is a flavour or a Sound Set, else the style's own on the
  // take's Sound Set where it has one — never its mood's flavour: it is asked for by name (the Lab
  // names the mood's). With an infusion the style as it plays is the groove; with a fusion, the sound.
  const asked = infusionAsked || beatAsked;
  const other = asked && (asked.base ? asked : soundSetOf(asked, options.parts.soundSet) || asked);
  const own = set || flavour || recipe;
  const music = infusionAsked ? other : own;
  const beat = infusionAsked ? own : other;
  const fusion = other ? fusionOf(music, beat) : null;
  if (asked && !fusion) warnings.push(`${recipe.label} cannot be fused with ${asked.label} — made on its own`);
  for (const k of ['infusion', 'fusion']) {
    if (options[k] && options[k] !== 'none' && !styleFor(options[k])) warnings.push(`there is no style called "${options[k]}" to fuse with — made with ${recipe.label} on its own`);
  }
  // (A set asked for by its own id — the Banger Sounds page's audition — is played as itself.)
  for (const [k, swap] of Object.entries((fusion || set || flavour || recipe).remapParts || {})) if (swap[options.parts[k]]) options.parts[k] = swap[options.parts[k]];
  // A flavour may move any switch, off as well as on: { group: { key: { from: to } } }. A fusion
  // moves each the way the flavour it came from would (its music's, or its beat's).
  for (const [group, keys] of Object.entries((fusion || flavour)?.remap || {})) {
    for (const [k, swap] of Object.entries(keys)) {
      const at = String(options[group]?.[k]);
      if (options[group] && Object.hasOwn(swap, at)) options[group][k] = swap[at];
    }
  }
  // A Sound Combo, when one is chosen and the style has it: its sounds and channels over
  // the style's own, and its own banger as what the faders are matched against. Not over a
  // Sound Set: a combo's sounds are the style's kind, and would undo a Light set's budget.
  const combo = options.combo && !set && !fusion ? combos?.[recipe.id]?.[options.combo] || null : null;
  if (options.combo && fusion) warnings.push(`a Sound Combo does not go over a fusion — made with ${fusion.label}'s own sounds`);
  else if (options.combo && set) warnings.push(`a Sound Combo does not go over a Sound Set — made with the ${set.label} sounds`);
  else if (options.combo && !combo) warnings.push(`${recipe.label} has no Sound Combo "${options.combo}" — made with its own sounds`);
  // A flavour's channels are its own seed's (6 Oct 2026), never its base style's: the base
  // seed's were set for the base's sounds and drowned every flavour's own mix.
  const seeded = flavour && !set ? channels?.[flavour.id] : channels?.[recipe.id] ?? channels?.[recipe.base];
  // A fusion's channels are the two seeds', role by role (fusion.js fuseChannels).
  const style = fusion ? withChannels(fusion, fuseChannels(seededChannels(channels, music), seededChannels(channels, beat)))
    : withChannels(set || flavour || recipe, seeded, combo?.channels);
  // Every sound it is made with — the style's table, with the mood's overrides. `table`
  // is the shipped one unless the Banger Sounds page is auditioning unsaved choices.
  const sounds = withComboSounds(resolveSounds(table, style.id, options.mood), combo);
  const paletteForTake = combo ? null : resolvePalette(palette, style.id, options.mood, { sounds: table });
  const paletteSelected = new Map();
  const sourceRole = (key) => `part:${key}`;
  for (const slot of PART_SLOTS) {
    if (slot.kind !== 'tone' || !Object.hasOwn(sounds.parts || {}, slot.key)) continue;
    const list = paletteForTake?.[sourceRole(slot.key)];
    if (!list) continue;
    const base = sounds.parts[slot.key];
    const defaultChoice = list.find((x) => x.id === base && x.enabled !== false);
    if (options.parts.partSounds === 'roll') {
      const available = list.filter((x) => soundAllowed(x.id, slot, { never: sounds.never, phone: sounds.phone }));
      const draw = partStream(slot.key);
      const selected = weightedPalettePick(available, draw);
      if (selected) { sounds.parts[slot.key] = selected.id; paletteSelected.set(slot.key, selected); }
    } else if (defaultChoice) paletteSelected.set(slot.key, defaultChoice);
    else {
      const available = list.filter((x) => soundAllowed(x.id, slot, { never: sounds.never, phone: sounds.phone }));
      const fallback = weightedPalettePick(available, partStream(slot.key));
      if (fallback) { sounds.parts[slot.key] = fallback.id; paletteSelected.set(slot.key, fallback); }
    }
  }
  // Part Sounds = Roll: each part with a shortlist draws its sound for this take. A combo
  // is a set of sounds chosen together, so it is played as chosen.
  if (options.parts.partSounds === 'roll' && !combo) {
    for (const [k, list] of Object.entries(sounds.choices || {})) {
      if (paletteForTake?.[sourceRole(k)]) continue;
      if (list.length > 1) sounds.parts[k] = rng.parts.pick(list);
    }
  }

  // Write a Lead: a riff with no tune gets one, written from its own chords (lead.js), and
  // from here on it is a riff part like any other — the hook, unless one was chosen.
  let hookWanted = options.hook;
  if (options.parts.writeLead === 'always' || (options.parts.writeLead !== 'off' && riffNeedsLead(riff))) {
    const lane = freeLeadLane(riff);
    if (lane) {
      const pre = analyseRiff(parseRiff(riff), options, style);
      const bars = writeLead({ chords: pre.riffChords, scale: pre.key.melodyScale || pre.key.scale, rng: stream('lead') });
      const names = bars.flatMap((s) => s.split(/\s+/).filter((t) => t !== '.').map((t) => midi(t.split(':')[0])));
      const meanPitch = names.reduce((a, x) => a + x, 0) / Math.max(1, names.length);
      riff = { ...riff, parts: [...riff.parts.map((p) => (p.role === 'hook' ? { ...p, role: p.kind === 'chord' ? 'chords' : (p.meanPitch < 52 ? 'bass' : 'counter') } : p)),
        { key: lane, label: 'Written Lead', kind: 'melodic', role: 'hook', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch, bars }] };
      if (!hookWanted || hookWanted === 'auto' || options.parts.writeLead === 'always') hookWanted = lane;
      warnings.push(`the riff had no lead, so one was written from its chords (${lane})`);
    } else warnings.push('the riff has no lead and every lead lane is taken — none was written');
  }

  // The riff, parsed, with the hook chosen.
  const parts = parseRiff(riff);
  const hookKey = pickHook(riff, hookWanted);
  for (const p of parts) {
    if (p.key === hookKey) p.role = 'hook';
    else if (p.role === 'hook') p.role = p.kind === 'chord' ? 'chords' : (p.meanPitch < 52 ? 'bass' : 'counter');
  }
  const analysis = analyseRiff(parts, options, style);
  const { key } = analysis;
  // From here on the riff is the riff in the banger's key — moved into the mode and to
  // the new home if the options said so (analyseRiff did it, with the key it chose).
  const tparts = analysis.parts;
  const hookPart = tparts.find((p) => p.key === hookKey);
  const bpm = bangerBpm(options, style, riff.source?.bpm);
  const total = bangerBars(options);
  const form = buildForm(options, total, style);

  const ctx = {
    options, style, form, key, analysis, riffParts: tparts, hookPart, rng,
    // The riff's lines move in `scale` — its own, when its notes are kept against a new
    // mode. The chord a phrase turns round on is the mode's colour chord, or plain V when
    // the riff keeps its notes (the colour chord would bring the mode's note into the tune).
    scale: key.melodyScale, candidates: analysis.candidates, modeChords: analysis.modeChords,
    dominant: key.own ? romanChord('V', key.own) : romanChord(MODE_INFO[key.mode]?.turn || 'V', key),
  };
  const { bars, events, asWritten } = buildSections(ctx);
  // The coloured chords voice-led, each moving least from the one before (voice-leading.js) — in
  // a lifted section, about its centre lifted with it.
  const liftOf = (bar1) => (form.find((f) => f.from <= bar1 && bar1 <= f.to)?.lifted ? LIFT_SEMIS[options.form.keyLift] || 0 : 0);
  // Chord Memory's stabs keep their one shape (sections.js chordPart): the main chord part's role.
  const chordRoleOf = { none: null, stabs: 'saws' };
  // (By mood, when the style says so: the song's mood or its second one.)
  const memoryOn = typeof style.chordMemory === 'string'
    || [options.mood, options.form?.mood2].some((m) => m && style.chordMemory?.[m]);
  const fixedRole = memoryOn ? (Object.hasOwn(chordRoleOf, options.parts.chords) ? chordRoleOf[options.parts.chords] : options.parts.chords) : null;
  voiceLeadChords(bars, form, { centres: style.centres, liftOf, asWritten, fixed: fixedRole ? [fixedRole] : [] });
  // A bass figure with an echo (Sequencer): the bass again on a channel of its own, a
  // sixteenth behind — the record's delay, written as notes.
  if (BASS_FIGURES.find((f) => f.id === options.parts.bass)?.echo) echoPart(bars, 'bass', 'bassEcho');

  // Roles onto lanes.
  const roles = new Set(bars.flatMap((b) => Object.keys(b)));
  const { laneOf, warnings: laneWarnings } = allocateLanes(roles, tparts, hookKey, ctx.coreFromRiff);
  warnings.push(...laneWarnings);
  const laneBars = bars.map((b) => Object.fromEntries(Object.entries(b).map(([role, part]) => [laneOf.get(role), part])));
  const drumLanes = [...laneOf.values()].filter((lane) => PERCUSSION_LANES.includes(baseLane(lane)));
  // Riff Sound = Random: the riff's tuned parts re-voiced (see pickRiffSounds).
  const riffSounds = options.parts.riffSound === 'random'
    ? pickRiffSounds({ riffParts: tparts, laneOf, hookKey, rng: rng.sounds, sounds, palette: paletteForTake }) : new Map();
  const bank = packBank(laneBars, { bpm, drums: drumLanes });
  // A style that plays only BLIPS (chipstep-8bit.js): every tuned note cut to `blips` steps.
  if (style.blips > 0) blipBank(bank, style.blips);
  // A riff part playing its lane's own engine body brings the bank keys that body reads.
  for (const p of parts) {
    const role = p.key === hookKey ? 'hook' : `riff:${p.key}`;
    const lane = laneOf.get(role);
    if (lane && p.engineKeys && lane === baseLane(lane) && !riffSounds.has(p.key)) {
      for (const [k, v] of Object.entries(p.engineKeys)) bank[k.replace(new RegExp(`^${baseLane(p.key)}`), lane)] = v;
    }
  }

  // FX — cuts need to know which lanes might be ringing at a bar.
  const lanesSounding = (bar1) => {
    const out = new Set();
    for (let b = Math.max(0, bar1 - 3); b <= Math.min(bars.length - 1, bar1 - 1); b++) {
      for (const [role, part] of Object.entries(bars[b])) if (hasNotes(part)) out.add(laneOf.get(role));
    }
    return [...out];
  };
  const automation = buildFx({ options, events, laneOf, total, lanesSounding, form, bpm, style, rng: rng.spotFx });
  // The loop: from the first build (or drop) of a Club banger; from the first section after
  // the intro of any other form.
  const loopFrom = form[0]?.joins ? (form.find((x) => x.role !== 'intro') || form[0])
    : form.find((x) => x.role === 'build') || form.find((x) => x.role === 'drop');
  const arrangement = {
    ...(options.fx.tapeStop || options.spot?.ending === 'tapeStop' ? {} : { loop: { fromBar: loopFrom.from, toBar: total } }),
    // A style that swings (Shibuya-Kei) says so on the arrangement, as the desk's Swing does.
    ...(style.swing ? { swing: style.swing } : {}),
    ...(automation ? { automation } : {}),
  };

  const hookOnsets = hookPart.parsed.reduce((n, bar) => n + bar.notes.filter((v) => v != null).length, 0);
  const mix = buildMix({
    style, sounds, options, laneOf, riffParts: tparts, hookKey, coreFromRiff: ctx.coreFromRiff, bpm,
    denseHook: hookOnsets / hookPart.parsed.length > 8, riffSounds,
  });
  // Palette production is ordinary channel data. Apply it before the production planner
  // so the planner sees authored inserts/sends and leaves that channel alone.
  const paletteByLane = new Map();
  for (const [role, lane] of laneOf) {
    let choice = null;
    if (role === 'hook' || role.startsWith('riff:')) {
      const key = role === 'hook' ? hookKey : role.slice(5);
      choice = riffSounds.get(key) || null;
    } else {
      const voice = mix.voice?.[`${lane}Voice`];
      choice = paletteSelected.get(role) || (voice ? { id: voice } : null);
      if (choice && !choice.palettePart) choice = { ...choice, palettePart: `part:${role}` };
    }
    if (!choice) continue;
    const strip = mix.lanes[lane] ||= {};
    if (choice.inserts != null) strip.effects = structuredClone(choice.inserts);
    if (choice.send != null) strip.send = { ...(strip.send || {}), ...structuredClone(choice.send) };
    paletteByLane.set(lane, choice);
  }
  const trackEffects = applyTrackEffects({ style, options, mix, bars, laneOf, riffParts: tparts,
    hookKey, bpm, rng: rng.production, combo, protectedLanes: new Set([...paletteByLane].filter(([, p]) => p.inserts != null || p.send != null).map(([lane]) => lane)) });
  const sectionEffects = applySectionEffects({ automation, options, style, form, bars, laneOf, mix, bpm, rng: rng.sectionFx });
  if (sectionEffects.automation) arrangement.automation = sectionEffects.automation;
  // Every channel's fader, from what its part plays and on what (levels.js). `level: false`
  // is for tools/banger-levels.js, which reads the style's own default parts from here.
  const levels = level ? levelMix({ style, form, bars, laneOf, mix, bank, bpm, riffParts: tparts, hookKey, refs: combo?.refs, data: levelData, calibration }) : [];
  for (const [lane, choice] of paletteByLane) {
    if (choice.trimDb) mix.lanes[lane].gain = Math.round(((mix.lanes[lane].gain || 0) + choice.trimDb) * 10) / 10;
  }
  // The bass echo has no reference of its own: it rides the bass's final levelled fader,
  // including any palette trim.
  if (laneOf.has('bassEcho') && laneOf.has('bass')) {
    mix.lanes[laneOf.get('bassEcho')].gain = Math.round(((mix.lanes[laneOf.get('bass')]?.gain ?? 0) + BASS_ECHO.gain) * 10) / 10;
  }
  // Auto Portamento (expression.js), when asked for: a Note FX setting on the lead lane the take's
  // notes and sound suit, added to the finished mix. Nothing above is read again or redrawn.
  const expressed = options.expression.autoPortamento
    ? applyExpression({ bank, mix, laneOf, bpm, bars: total, rng: rng.expression }) : null;

  // ---- the self-check: a failure here is a generator bug, never the request's fault.
  const laneKeys = laneKeysOf(bank, mix);
  const arrIssues = arrangementIssues(bank, arrangement, laneKeys);
  if (arrIssues.length) throw new Error(`banger generator: ${arrIssues.join('; ')}`);
  for (const b of laneBars) {
    for (const [lane, part] of Object.entries(b)) {
      if (!part || isDrumPart(part)) continue;
      for (const v of part.notes) {
        for (const name of v == null ? [] : Array.isArray(v) ? v : [v]) {
          const m = midi(name);
          if (m < MIDI_MIN || m > MIDI_MAX) throw new Error(`banger generator: ${lane} plays ${name}, out of range`);
        }
      }
    }
  }
  if (bars.length !== total) throw new Error(`banger generator: ${bars.length} bars, not ${total}`);

  const title = `${String(riff.source?.title || 'RIFF').toUpperCase()} BANGER`;
  const hook = parts.find((p) => p.key === hookKey);
  const seconds = Math.round((total * 240) / bpm);
  const summary = {
    style: style.label, mood: options.mood, key: keyName(key), reads: keyName(analysis.detected), bars: total, bpm, seconds,
    variation: options.variation, hook: hook?.label || hookKey,
  };
  // A breakdown says how its hook played (Breakdown Hook: Varied draws one per take).
  const wayOf = (x) => events.breakdowns.find((d) => d.from === x.from)?.mode;
  const formLines = form.map((x) => `  ${String(x.from).padStart(3)}–${String(x.to).padEnd(3)}  ${x.label}${x.lifted && options.form.keyLift !== 'none' ? ' (lifted)' : ''}${wayOf(x) ? ` — ${BREAKDOWN_WAY_LABELS[wayOf(x)] || wayOf(x)}` : ''}`);
  const note = [
    `A BANGER, made on the desk from bars ${riff.source.from + 1}–${riff.source.to + 1} of ${riff.source.title || riff.source.id || 'a song'}.`,
    `${style.label} · ${options.mood} · ${keyName(key)} · ${options.variation} · ${total} bars at ${bpm} BPM, ${seconds}s.`,
    `The hook is ${hook?.label || hookKey}. Seed ${s}; generator v${BANGER_GENERATOR_VERSION}.`,
    ...(expressed?.applied.length ? [`Auto Portamento on ${expressed.applied.map((a) => `${(mix.labels[a.lane] || a.role).split(' · ')[0]} (Amount ${a.set.amount}, Glide ${a.set.glide})`).join(', ')} — a lane Note FX setting, editable on the desk.`] : []),
    ...(trackEffects.mode !== 'style' ? ['', `Track Effects (${trackEffects.mode}):`,
      ...trackEffects.roles.map(x => `  ${(mix.labels[x.lane] || x.role).split(' · ')[0]}: ${x.treatment} — ${x.reason}.`)] : []),
    '',
    ...formLines,
    ...(events.transitions?.length ? ['', 'Joins:', ...events.transitions.map((t) => `  bar ${String(t.bar).padStart(3)}  ${t.from} → ${t.to}: ${t.moves.join(', ')}`)] : []),
    '',
    'Written by tools/lib/banger/ (Make a Banger…). The recipe — riff, options, seed — is in',
    '`banger` below, which is what Another Take re-rolls. Mix it freely: the desk saves under',
    'the marker and never touches the music above it.',
  ].join('\n');
  const resolvedPaletteSnapshot = paletteSnapshot(palette, style.id, options.mood, { sounds: table });
  const paletteReport = [...paletteByLane].map(([lane, selected]) => ({ lane, part: selected.palettePart || null, preset: selected.id,
    trimDb: selected.trimDb || 0, favourite: !!selected.favourite, origin: selected.origin || 'style default' }));
  const banger = {
    version: 1,
    generator: BANGER_GENERATOR_VERSION,
    style: style.id,
    ...(style.flavour ? { flavour: style.flavour } : {}),
    ...(style.fusion ? { fusion: style.fusion } : {}),
    options,
    seed: s,
    paletteSnapshot: resolvedPaletteSnapshot,
    palette: paletteReport,
    riff: source,
    source: { id: riff.source?.id ?? null, title: riff.source?.title ?? null, from: riff.source?.from, to: riff.source?.to },
    take: 1,
    // Which lane does which job, and the form — what Save as Combo and Use as Style read a
    // tuned banger back by (tools/lib/banger-seeds.js).
    laneOf: Object.fromEntries(laneOf),
    form: form.map((f) => ({ id: f.id, role: f.role, type: f.type, label: f.label, from: f.from, to: f.to, energy: f.energy, ...(f.hook ? { hook: true } : {}) })),
    report: rollReport({ summary, warnings, levels, transitions: events.transitions || [], expressed,
      mix, laneOf: Object.fromEntries(laneOf) }),
    ...(trackEffects.mode !== 'style' ? { trackEffects } : {}),
    sectionEffects: sectionEffects.report,
    ...(Object.keys(reroll).length ? { rerolls: reroll } : {}),
    // Each part's fingerprint as generated — what Modify This Take tells hand edits by.
    prints: bangerPrints({ bank, mix, arrangement, laneOf: Object.fromEntries(laneOf) }),
  };
  return { title, bank, mix, arrangement, note, summary, form, banger, warnings, levels, trackEffects, laneOf: Object.fromEntries(laneOf), transitions: events.transitions || [] };
}

/**
 * The parts Modify This Take can draw again on their own, each one random stream. Re-rolling
 * one gives it a seed of its own; everything drawn from the other streams stays put.
 */
export const BANGER_REROLLS = Object.freeze([
  { stream: 'sectionFx', label: 'Section FX', title: 'New automatic section treatments, keeping explicit rules, notes and sounds' },
  { stream: 'production', label: 'Track Effects', title: 'New ongoing track treatments, keeping the notes, sounds and transitions' },
  { stream: 'arps', label: 'Arp', title: 'A new arp figure in every section that has one' },
  { stream: 'drums', label: 'Drum Fills', title: 'New fills' },
  { stream: 'partSounds', label: 'Part Sounds', title: 'New sounds for the chords, pad, arp, choir and bell (Part Sounds: Roll)' },
  { stream: 'sounds', label: 'Riff Sound', title: 'New sounds for the riff\'s own parts (Riff Sound: Random)' },
  { stream: 'lead', label: 'Written Lead', title: 'A new tune, where the banger wrote one' },
  { stream: 'verse', label: 'Verse Tune', title: 'New verse material, in the forms that have verses' },
  { stream: 'transitions', label: 'Joins', title: 'New moves between sections, in the forms that have them' },
  { stream: 'breakdown', label: 'Breakdown', title: 'Another way for the hook through the breakdown (Breakdown Hook: Varied)' },
]);

/**
 * The riff as it was read off the song. A recipe saved before 3 Oct kept its riff with the
 * Written Lead in it, so every later take reused that first take's tune: the lead comes out
 * again here and the hook it displaced goes back, chosen as extractRiff chose it. A take
 * re-made from such a recipe writes the same lead again from the same seed.
 */
export function sourceRiff(riff) {
  if (!riff?.parts?.some((p) => p.label === 'Written Lead')) return riff;
  const parts = riff.parts.filter((p) => p.label !== 'Written Lead').map((p) => ({ ...p }));
  const out = { ...riff, parts };
  if (!parts.some((p) => p.role === 'hook')) {
    const hook = pickHook(out);
    for (const p of parts) if (p.key === hook) p.role = 'hook';
  }
  return out;
}

/** A banger re-made from a stored recipe with a new seed — Another Take. */
export function anotherTake(recipe, seed, sounds = BANGER_SOUNDS) {
  return generateBanger({ riff: recipe.riff, options: recipe.options, seed, sounds });
}
