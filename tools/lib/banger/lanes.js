// MAKE A BANGER — roles onto lanes, and the mix that goes with them.
//
// The riff's parts are placed first, the hook first of all: each takes its own BASE lane
// if it is free (so a part playing a lane's engine body keeps sounding — an engine
// preset does nothing on a layer), otherwise the next free layer of that family. The
// recipe's roles follow, ABSOLUTE ZERO's way: bass/bass2, lead2–lead6, chords/chords2,
// crash2 for the riser, tom/tom2 for the impact and the fill. Every lane that is not a
// base lane is an independent layer in `mix.layers`. Browser-safe.
import { stripGate } from './fx.js';
import { LANE_KEYS } from '../../../src/engine/lanes.js';
import { baseLane, VOICES } from '../../../src/data/voices.js';
import { riserVoice, subDropVoice } from './theory.js';
import { DROP_HIT_WAY, RISER_WAY } from './build-ways.js';
import { RANDOM_JOBS, soundAllowed, slotChoices } from './sound-rules.js';
import { weightedPalettePick } from './palette.js';

/** Which lane family each generated role lives in. */
export const ROLE_FAMILY = Object.freeze({
  kick: 'kick', snare: 'snare', clap: 'clap', hats: 'hats', hatsSoft: 'hats', ohats: 'ohats', crash: 'crash',
  riser: 'crash', riser2: 'crash', impact: 'tom', fill: 'tom', shaker: 'rim', tambourine: 'rim', cowbell: 'rim',
  congas: 'tom', ride: 'crash', rim: 'rim',
  bass: 'bass', sub: 'bass', bassEcho: 'bass',
  saws: 'chords', pad: 'chords', piano: 'chords',
  square: 'lead', bell: 'lead', megaSaw: 'lead', arp: 'lead', choir: 'lead', third: 'lead', counter: 'lead',
  sonar: 'lead', vocoder: 'lead', word: 'lead',
});
/** The order roles are given lanes in — and the desk's strip order, kit first. */
export const ROLE_ORDER = Object.freeze([
  'kick', 'snare', 'clap', 'hats', 'hatsSoft', 'ohats', 'crash', 'riser', 'riser2', 'impact', 'fill',
  'shaker', 'tambourine', 'cowbell', 'congas', 'ride', 'rim',
  'bass', 'sub', 'bassEcho', 'saws', 'piano', 'pad',
  'square', 'bell', 'megaSaw', 'arp', 'choir', 'third', 'counter', 'sonar', 'vocoder', 'word',
]);
export const DRUM_ROLES = new Set(['kick', 'snare', 'clap', 'hats', 'hatsSoft', 'ohats', 'crash', 'riser', 'riser2', 'impact',
  'fill', 'shaker', 'tambourine', 'cowbell', 'congas', 'ride', 'rim']);
/**
 * Roles that play another role's sound on a channel of their own: the soft hats are the
 * kit's hats a step quieter (a drum machine's accent, which a bank cannot store per hit),
 * the vocoder's spoken word is the vocoder, the bass echo (Bass = Sequencer) is the bass.
 */
const SOUND_OF = Object.freeze({ hatsSoft: 'hats', word: 'vocoder', bassEcho: 'bass' });
/**
 * The bass echo's channel: the bass's own, this much quieter and off to one side. Its
 * fader follows the bass's after levelling (index.js), so it stays this far under.
 */
export const BASS_ECHO = Object.freeze({ gain: -5, pan: 0.35, label: 'BASS ECHO' });

const isEngineVoice = (part) => (!part.voice && !part.voiceParams) || VOICES[part.voice]?.kind === 'engine';

/**
 * Lanes for every role the song plays. `roles` is the set of role keys in the bars
 * (`hook`, `riff:<key>`, `kick` …); `riffParts` are the riff's parts by key. Returns
 * `{ laneOf: Map(role → lane), warnings }`.
 */
export function allocateLanes(roles, riffParts, hookKey, coreFromRiff) {
  const used = new Set();
  const laneOf = new Map();
  const warnings = [];
  const take = (family) => {
    if (!used.has(family)) { used.add(family); return family; }
    for (let i = 2; ; i++) {
      const k = `${family}${i}`;
      if (!used.has(k)) { used.add(k); return k; }
    }
  };
  const byKey = new Map(riffParts.map((p) => [p.key, p]));
  // Riff parts: the hook first, then the parts that NEED their base lane (engine bodies).
  const riffRoles = [...roles].filter((r) => r === 'hook' || r.startsWith('riff:'));
  const partOf = (r) => byKey.get(r === 'hook' ? hookKey : r.slice(5));
  riffRoles.sort((a, b) => (a === 'hook' ? -1 : b === 'hook' ? 1
    : Number(isEngineVoice(partOf(b))) - Number(isEngineVoice(partOf(a)))));
  // The core drum roles a riff part stands in for take that part's own base lane.
  for (const [role, part] of coreFromRiff || []) {
    if (!roles.has(role)) continue;
    const base = baseLane(part.key);
    laneOf.set(role, take(used.has(base) ? ROLE_FAMILY[role] : base));
  }
  for (const r of riffRoles) {
    const part = partOf(r);
    const base = baseLane(part.key);
    const lane = take(base);
    if (lane !== base && isEngineVoice(part)) {
      warnings.push(`${part.label} plays a lane's own engine sound, which cannot move to ${lane} — it plays the style's fallback there`);
    }
    laneOf.set(r, lane);
  }
  for (const role of ROLE_ORDER) {
    if (!roles.has(role) || laneOf.has(role)) continue;
    laneOf.set(role, take(ROLE_FAMILY[role]));
  }
  return { laneOf, warnings };
}

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

/**
 * Riff Sound = Random: a new preset for each of the riff's tuned parts — random, but only
 * from the shortlist the sounds table keeps for that part's JOB (tools/lib/banger/sounds.js,
 * edited on the Banger Sounds page), less the never-use list and the mood's skips. Every
 * pick also passes the rulebook (sound-rules.js) for the lane it actually lands on — so a
 * busy part never gets a CRLS-1 and a speech synth never comes up — and is never the sound
 * the part had, never one another riff part already got. Only when the shortlist leaves
 * nothing does it widen to the library's allowed sounds of the job's categories. Drums keep
 * theirs: the Kit switch is how the drums change. Seeded, so a take re-made from its recipe
 * gets the same sounds and Remix rolls new ones.
 *
 * Returns Map(part key → { id, label }).
 */
export function pickRiffSounds({ riffParts, laneOf, hookKey, rng, sounds, palette = null, busyInSong = null }) {
  const out = new Map();
  const taken = new Set();
  const never = sounds?.never || [];
  const phone = !!sounds?.phone;
  for (const p of riffParts) {
    if (p.kind === 'drum' || p.kind === 'gesture') continue;
    // A hook down in the bass register IS the bass (sections.js), so it is re-voiced from
    // the bass shortlist — a bell or a lead playing the bass line is nobody's banger.
    const isHook = p.key === hookKey;
    const role = isHook ? (p.kind !== 'chord' && (p.meanPitch ?? 60) < 52 ? 'bass' : 'hook') : p.role;
    const job = RANDOM_JOBS.find((j) => j.key === role) || RANDOM_JOBS.find((j) => j.key === 'counter');
    const lane = laneOf.get(isHook ? 'hook' : `riff:${p.key}`);
    if (!lane) continue;
    const onsets = p.parsed.reduce((n, bar) => n + bar.notes.filter((v) => v != null).length, 0);
    // Busy in the riff, or in the song as made (`busyInSong`: a Varied way can play a hook busier than
    // the riff does — the Arp breakdown's sixteenths, a Hook Loop).
    const slot = { ...job, family: baseLane(lane), busy: onsets / p.parsed.length > 8 || !!busyInSong?.(isHook ? 'hook' : `riff:${p.key}`) };
    // Ordinary random rolls avoid leaving the riff on its original voice. A preset
    // audition is deliberately pinned, though: it must still be heard when it happens
    // to be the same preset as the source riff.
    const fits = (choice) => (choice.audition || choice.id !== p.voice)
      && !taken.has(choice.id) && soundAllowed(choice.id, slot, { never, phone });
    const configured = palette?.[`riff:${job.key}`];
    let pool = configured?.filter(fits) || (sounds?.random?.[job.key] || [])
      .map((id) => ({ id })).filter(fits);
    if (!pool.length) {
      if (configured) continue;
      pool = slotChoices(slot, { never, phone })
        .filter((c) => !c.blocked.length && job.categories.includes(c.category)).map((c) => ({ id: c.id } )).filter(fits);
    }
    if (!pool.length) continue;
    const selected = configured ? weightedPalettePick(pool, rng) : pool[Math.floor(rng.next() * pool.length)];
    const id = selected.id;
    taken.add(id);
    out.set(p.key, { ...selected, id, label: VOICES[id].label || id, palettePart: `riff:${job.key}` });
  }
  return out;
}

/**
 * The mix: the recipe's strips by role, the riff parts' own strips, every voice, the
 * riser's song-local voice, the layers, the labels and the desk order.
 */
export function buildMix({
  style, sounds, options, laneOf, riffParts, hookKey, coreFromRiff, bpm, denseHook = false, riffSounds = new Map(),
  riserWay = 'noise', dropHit = 'style', tonic = 9, riserLands = {},
}) {
  const mood = style.moods[options.mood] || {};
  // The chosen kit, with the style kit's sound wherever it leaves a drum out.
  const kit = { ...sounds.kits.style, ...(sounds.kits[options.drums.kit] || {}) };
  const mix = {
    master: style.master.master,
    masterEffects: clone(style.master.masterEffects),
    fx: clone(style.master.fx),
    layers: [],
    order: [],
    labels: {},
    voice: {},
    voiceParams: {},
    lanes: {},
  };
  const byKey = new Map(riffParts.map((p) => [p.key, p]));
  const coreParts = new Map([...(coreFromRiff || [])]);
  const entries = [...laneOf.entries()];
  // Desk order: kit, bass, the hook, the rest of the tune, chords.
  const rank = (role) => {
    const i = ROLE_ORDER.indexOf(role);
    if (role === 'hook') return ROLE_ORDER.indexOf('square') - 0.5;
    if (role.startsWith('riff:')) {
      const p = byKey.get(role.slice(5));
      return p?.kind === 'drum' ? ROLE_ORDER.indexOf('ride') + 0.5 : ROLE_ORDER.indexOf('counter') + 0.5;
    }
    return i;
  };
  entries.sort((a, b) => rank(a[0]) - rank(b[0]));
  for (const [role, lane] of entries) {
    if (!LANE_KEYS.includes(lane)) {
      mix.layers.push({ key: lane, from: baseLane(lane), independent: true });
    }
    mix.order.push(lane);
    const vk = `${lane}Voice`;
    const riffPart = role === 'hook' ? byKey.get(hookKey) : role.startsWith('riff:') ? byKey.get(role.slice(5)) : coreParts.get(role);
    if (riffPart) {
      // The riff's own sound and its own channel, gain set by its new job — or, with Riff
      // Sound on Random, a new preset on the same channel. Its insert effects stay behind
      // with the sound they were chosen for; the EQ, pan, sends and note FX are the part's.
      const engine = isEngineVoice(riffPart);
      const swapped = DRUM_ROLES.has(role) ? null : riffSounds.get(riffPart.key);
      if (swapped) mix.voice[vk] = swapped.id;
      else if (riffPart.voiceParams) mix.voiceParams[vk] = clone(riffPart.voiceParams);
      else if (riffPart.voice && !(engine && lane !== baseLane(lane))) mix.voice[vk] = riffPart.voice;
      else if (engine && lane !== baseLane(lane)) mix.voice[vk] = DRUM_ROLES.has(role) ? 'tom' : sounds.parts.fallbackMelodic;
      const strip = clone(riffPart.strip || {});
      if (swapped) delete strip.effects;
      const roleStrip = role === 'hook' ? style.strips.hook : DRUM_ROLES.has(role) ? style.strips[role] : style.strips.riff;
      strip.gain = roleStrip?.gain ?? 0;
      if (role === 'hook') {
        strip.send = { ...(roleStrip.send || {}), ...(strip.send || {}) };
        // Only a pan the recipe names: `pan: undefined` would reach the desk as NaN.
        if (strip.pan == null && roleStrip?.pan != null) strip.pan = roleStrip.pan;
        const effects = strip.effects || [];
        if (mood.exciter && !effects.some((e) => e.id === 'exciter')) strip.effects = [...effects, clone(style.exciter)];
        if (mood.high && !(strip.eq && strip.eq.high != null)) strip.eq = { ...(strip.eq || {}), high: mood.high };
      }
      mix.lanes[lane] = strip;
      const name = swapped ? swapped.label : (riffPart.label || riffPart.key);
      mix.labels[lane] = role === 'hook' ? `RIFF ${name} · HOOK` : DRUM_ROLES.has(role) ? `${style.labels[role]} (riff)` : `RIFF ${name}`;
      continue;
    }
    const as = SOUND_OF[role] || role;
    // The riser: the take's Riser Type (build-ways.js), a voice of the song's own.
    // A tonal one lands on its sections' note — `riser2`, a second note's (sections.js).
    if (role === 'riser' || role === 'riser2') mix.voiceParams[vk] = riserVoice(riserWay, bpm, riserLands[role] ?? tonic);
    // The impact: the take's Drop Hit (build-ways.js) — the style's own, a library preset, or the Sub Drop.
    else if (role === 'impact' && dropHit === 'sub') mix.voiceParams[vk] = subDropVoice(bpm, tonic);
    else if (role === 'impact' && VOICES[DROP_HIT_WAY[dropHit]?.voice]) mix.voice[vk] = DROP_HIT_WAY[dropHit].voice;
    else if (DRUM_ROLES.has(role)) mix.voice[vk] = kit[as] || sounds.parts[as] || kit.fill;
    else if (role === 'square' && denseHook) mix.voice[vk] = sounds.parts.squareDense;
    else mix.voice[vk] = sounds.parts[as];
    const strip = role === 'bassEcho'
      ? { ...clone(style.strips.bass || {}), gain: (style.strips.bass?.gain ?? 0) + BASS_ECHO.gain, pan: BASS_ECHO.pan }
      : clone(style.strips[role === 'riser2' ? 'riser' : role] || {});
    // The chords' gate: the style's own, or the one Chord Gate names (fx.js stripGate).
    const gate = stripGate(options, style);
    // Supersaw Stabs are a rhythm already: never gated. Gate the Choir chops the choir with the chords.
    if (role === 'saws' && gate && options.parts.chords !== 'stabs') strip.effects = [...(strip.effects || []), clone(gate)];
    if (role === 'choir' && gate && options.fx.gateChoir) strip.effects = [...(strip.effects || []), clone(gate)];
    if (role === 'pad' && gate && (options.parts.chords === 'pad' || style.padUnder)) {
      strip.effects = [...(strip.effects || []), { ...clone(gate), params: { ...gate.params, depth: 0.5 } }];
    }
    // The riser's fader moves by its Riser Type's trim (build-ways.js RISER_WAYS).
    if ((role === 'riser' || role === 'riser2') && RISER_WAY[riserWay]?.trimDb) strip.gain = (strip.gain ?? 0) + RISER_WAY[riserWay].trimDb;
    mix.lanes[lane] = strip;
    // A tuned part's strip says what it is AND what it plays — `PAD · Polar Drift` — because
    // the sound is editable on the Banger Sounds page and a name baked into the label would
    // go on naming the old one. A drum's part name is enough.
    const base = role === 'saws' && options.parts.chords === 'stabs' ? 'CHORDS Stabs'
      : role === 'riser2' ? `${style.labels.riser || 'RISER'} 2`
        : style.labels[role] || (role === 'bassEcho' ? BASS_ECHO.label : role.toUpperCase());
    const preset = DRUM_ROLES.has(role) ? null : VOICES[mix.voice[vk]]?.label;
    mix.labels[lane] = preset ? `${base} · ${preset}` : base;
  }
  if (!Object.keys(mix.voiceParams).length) delete mix.voiceParams;
  if (!mix.layers.length) delete mix.layers;
  return mix;
}
