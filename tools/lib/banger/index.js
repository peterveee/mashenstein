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
import { styleFor } from './styles/index.js';
import { validateRiff, parseRiff, pickHook } from './riff.js';
import { analyseRiff, romanChord, keyName, MODE_INFO } from './analyse.js';
import { buildForm } from './form.js';
import { buildSections } from './sections.js';
import { allocateLanes, buildMix, pickRiffSounds, BASS_ECHO } from './lanes.js';
import { levelMix } from './levels.js';
import { buildFx } from './fx.js';
import { BANGER_SOUNDS } from './sounds.js';
import { BANGER_CHANNELS } from './channels.js';
import { BANGER_COMBOS } from './combos.js';
import { bangerPrints } from './modify.js';
import { resolveSounds } from './sound-rules.js';

export { BANGER_DEFAULTS, BANGER_GROUPS, BANGER_MOODS, BANGER_KEYS, BANGER_MODES, BANGER_RIFF_NOTES, MOOD_MODES,
  BANGER_VARIATIONS, BANGER_LENGTHS,
  BANGER_TEMPOS, BANGER_LIMITS, normaliseBangerOptions, surpriseBangerOptions, goCrazyBangerOptions, styleDefaults, classicDefaults,
  bangerBars, bangerBpm, MOOD_BASS, moodBass, BANGER_STRUCTURE, keepStructure } from './options.js';
export { BANGER_STYLES, styleFor } from './styles/index.js';
export { modifyBanger, describeModify, bangerPrints } from './modify.js';
export { extractRiff, laneVoiceOf, validateRiff, pickHook, riffSummary, parseRiff } from './riff.js';
export { keyName, MODE_INFO } from './analyse.js';
export { BANGER_SOUNDS } from './sounds.js';
export {
  PART_SLOTS, KIT_ROLES, KITS, RANDOM_JOBS, CHOICE_SLOTS, MOOD_IDS, soundIssues, soundAllowed, slotChoices, tableIssues, resolveSounds,
} from './sound-rules.js';

/** Bumped whenever the same seed would make different music — a take records it. */
export const BANGER_GENERATOR_VERSION = 2;

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
    };
  }
  return out;
}

/** A style's sounds with a Sound Combo's over them. */
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
  channels = BANGER_CHANNELS, combos = BANGER_COMBOS, levelData = undefined, rerolls = null,
}) {
  const recipe = styleFor(raw?.style) || styleFor('big-room');
  const { options, issues } = normaliseBangerOptions(raw, recipe);
  if (issues.length) throw new Error(`can't make that banger: ${issues.join('; ')}`);
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
  const rng = {
    harmony: stream('harmony'), drums: stream('drums'), form: stream('form'), sounds: stream('sounds'),
    arps: stream('arps'), parts: stream('partSounds'),
    // The other forms' own (verse material, the joins) — new names, so Club's draws never move.
    verse: stream('verse'), transitions: stream('transitions'),
  };
  const warnings = [];
  // A Sound Combo, when one is chosen and the style has it: its sounds and channels over
  // the style's own, and its own banger as what the faders are matched against.
  const combo = options.combo ? combos?.[recipe.id]?.[options.combo] || null : null;
  if (options.combo && !combo) warnings.push(`${recipe.label} has no Sound Combo "${options.combo}" — made with its own sounds`);
  const style = withChannels(recipe, channels?.[recipe.id], combo?.channels);
  // Every sound it is made with — the style's table, with the mood's overrides. `table`
  // is the shipped one unless the Banger Sounds page is auditioning unsaved choices.
  const sounds = withComboSounds(resolveSounds(table, style.id, options.mood), combo);
  // Part Sounds = Roll: each part with a shortlist draws its sound for this take. A combo
  // is a set of sounds chosen together, so it is played as chosen.
  if (options.parts.partSounds === 'roll' && !combo) {
    for (const [k, list] of Object.entries(sounds.choices || {})) if (list.length > 1) sounds.parts[k] = rng.parts.pick(list);
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
  const { bars, events } = buildSections(ctx);
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
    ? pickRiffSounds({ riffParts: tparts, laneOf, hookKey, rng: rng.sounds, sounds }) : new Map();
  const bank = packBank(laneBars, { bpm, drums: drumLanes });
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
  const automation = buildFx({ options, events, laneOf, total, lanesSounding, form, bpm });
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
  // Every channel's fader, from what its part plays and on what (levels.js). `level: false`
  // is for tools/banger-levels.js, which reads the style's own default parts from here.
  const levels = level ? levelMix({ style, form, bars, laneOf, mix, bank, bpm, riffParts: tparts, hookKey, refs: combo?.refs, data: levelData }) : [];
  // The bass echo has no reference of its own: it rides the bass's levelled fader.
  if (laneOf.has('bassEcho') && laneOf.has('bass')) {
    mix.lanes[laneOf.get('bassEcho')].gain = Math.round(((mix.lanes[laneOf.get('bass')]?.gain ?? 0) + BASS_ECHO.gain) * 10) / 10;
  }

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
  const formLines = form.map((x) => `  ${String(x.from).padStart(3)}–${String(x.to).padEnd(3)}  ${x.label}${x.lifted && options.form.keyLift !== 'none' ? ' (lifted)' : ''}`);
  const note = [
    `A BANGER, made on the desk from bars ${riff.source.from + 1}–${riff.source.to + 1} of ${riff.source.title || riff.source.id || 'a song'}.`,
    `${style.label} · ${options.mood} · ${keyName(key)} · ${options.variation} · ${total} bars at ${bpm} BPM, ${seconds}s.`,
    `The hook is ${hook?.label || hookKey}. Seed ${s}; generator v${BANGER_GENERATOR_VERSION}.`,
    '',
    ...formLines,
    ...(events.transitions?.length ? ['', 'Joins:', ...events.transitions.map((t) => `  bar ${String(t.bar).padStart(3)}  ${t.from} → ${t.to}: ${t.moves.join(', ')}`)] : []),
    '',
    'Written by tools/lib/banger/ (Make a Banger…). The recipe — riff, options, seed — is in',
    '`banger` below, which is what Another Take re-rolls. Mix it freely: the desk saves under',
    'the marker and never touches the music above it.',
  ].join('\n');
  const banger = {
    version: 1,
    generator: BANGER_GENERATOR_VERSION,
    style: style.id,
    options,
    seed: s,
    riff: source,
    source: { id: riff.source?.id ?? null, title: riff.source?.title ?? null, from: riff.source?.from, to: riff.source?.to },
    take: 1,
    // Which lane does which job, and the form — what Save as Combo and Use as Style read a
    // tuned banger back by (tools/lib/banger-seeds.js).
    laneOf: Object.fromEntries(laneOf),
    form: form.map((f) => ({ role: f.role, type: f.type, label: f.label, from: f.from, to: f.to, energy: f.energy, ...(f.hook ? { hook: true } : {}) })),
    ...(Object.keys(reroll).length ? { rerolls: reroll } : {}),
    // Each part's fingerprint as generated — what Modify This Take tells hand edits by.
    prints: bangerPrints({ bank, mix, arrangement, laneOf: Object.fromEntries(laneOf) }),
  };
  return { title, bank, mix, arrangement, note, summary, form, banger, warnings, levels, laneOf: Object.fromEntries(laneOf), transitions: events.transitions || [] };
}

/**
 * The parts Modify This Take can draw again on their own, each one random stream. Re-rolling
 * one gives it a seed of its own; everything drawn from the other streams stays put.
 */
export const BANGER_REROLLS = Object.freeze([
  { stream: 'arps', label: 'Arp', title: 'A new arp figure in every section that has one' },
  { stream: 'drums', label: 'Drum Fills', title: 'New fills' },
  { stream: 'partSounds', label: 'Part Sounds', title: 'New sounds for the chords, pad, arp, choir and bell (Part Sounds: Roll)' },
  { stream: 'sounds', label: 'Riff Sound', title: 'New sounds for the riff\'s own parts (Riff Sound: Random)' },
  { stream: 'lead', label: 'Written Lead', title: 'A new tune, where the banger wrote one' },
  { stream: 'verse', label: 'Verse Tune', title: 'New verse material, in the forms that have verses' },
  { stream: 'transitions', label: 'Joins', title: 'New moves between sections, in the forms that have them' },
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
