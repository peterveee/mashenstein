// Node-side discovery and musical benches for the periodic calibration command.
import { BANGER_STYLES } from './banger/styles/index.js';
import { BANGER_SOUNDS } from './banger/sounds.js';
import { BANGER_CHANNELS } from './banger/channels.js';
import { BANGER_COMBOS } from './banger/combos.js';
import { BANGER_LEVEL_DATA } from './banger/levels-data.js';
import { PART_SLOTS, RANDOM_JOBS, resolveSounds } from './banger/sound-rules.js';
import { withChannels } from './banger/index.js';
import { buildMix } from './banger/lanes.js';
import { styleDefaults } from './banger/options.js';
import { VOICES } from '../../src/data/voices.js';
import { L, nameOf, packBank } from './banger/theory.js';
import { soundOf, predictedProcessedPart } from './banger/levels.js';
import { profileKey, measurementStrip, phraseFeatures } from './banger/calibration.js';
import { applyTrackEffects, PRODUCTION_ROLES } from './banger/production.js';

// Enumerate the planner's finite presets through its real decisions. Fixture shapes
// cover sparse, held and busy phrases; fixed draws cover both timings and strengths.
// Only strip variants that actually change are returned, never a fabricated effect.
export function trackEffectProfiles(context, style, mood) {
  if (!PRODUCTION_ROLES.includes(context.role)) return [];
  const found = new Map();
  const phrases = [L('A4:1 . . . E5:1 . . . C5:1 . . . . . . .'),
    L('A4:16 . . . . . . . . . . . . . . .'), L('A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4 A4')];
  for (const mode of ['subtle', 'adventurous']) for (const phrase of phrases) {
    for (const choice of [0.05, 0.5, 0.8, 0.99]) for (const strength of [0, 0.5, 0.999]) for (const timing of [0, 0.9]) {
      const mix = { fx: context.fx, lanes: { [context.lane]: structuredClone(context.strip) },
        voiceParams: { [`${context.lane}Voice`]: context.voice } };
      const result = applyTrackEffects({ style, options: { mood, production: { mode } }, mix,
        bars: [{ [context.role]: phrase }], laneOf: new Map([[context.role, context.lane]]),
        riffParts: [{ key: 'lead', strip: null }], hookKey: 'lead', bpm: context.bpm,
        rng: { stream: () => { const draws = [choice, strength, timing]; return { next: () => draws.shift() }; } } });
      if (!result.applied.length) continue;
      const variant = { ...context, strip: measurementStrip(mix.lanes[context.lane]), production: { mode, treatment: result.applied[0].treatment } };
      const key = profileKey(variant);
      if (!found.has(key)) found.set(key, variant);
    }
  }
  return [...found.values()];
}

const roleOf = key => ({ squareDense: 'square', fallbackMelodic: 'hook', chords: 'saws' }[key] || key);
const tuned = id => VOICES[id] && ['tone', 'noise'].includes(VOICES[id].kind);
export function discoverProfiles({ styles = BANGER_STYLES, sounds = BANGER_SOUNDS, channels = BANGER_CHANNELS, combos = BANGER_COMBOS, trackEffects = false } = {}) {
  const found = new Map();
  for (const recipe of styles) {
    for (const [comboId, combo] of [['', null], ...Object.entries(combos[recipe.id] || {})]) {
      const style = withChannels(recipe, channels[recipe.id], combo?.channels);
      for (const mood of new Set([styleDefaults(style).mood, ...Object.keys(style.moods || {}), ...Object.keys(sounds[style.id]?.moods || {})])) {
        const resolved = resolveSounds(sounds, style.id, mood);
        resolved.parts = { ...resolved.parts, ...combo?.sounds?.parts };
        const options = styleDefaults(style); options.mood = mood;
        for (const slot of [...PART_SLOTS, ...RANDOM_JOBS]) {
          if (slot.kind !== 'tone' || (slot.styles && !slot.styles.includes(style.id))) continue;
          const role = roleOf(slot.key);
          const ids = slot.random ? resolved.random[slot.key] : [resolved.parts[slot.key], ...(combo ? [] : resolved.choices[slot.key] || [])];
          for (const id of new Set(ids || [])) {
            if (!tuned(id)) continue;
            const lane = `${slot.family}2`;
            const part = { key: 'lead', kind: 'melodic', voice: id, strip: {}, label: 'Hook' };
            const opts = structuredClone(options);
            if (role === 'pad') opts.parts.chords = 'pad';
            const mix = buildMix({ style, sounds: { ...resolved, parts: { ...resolved.parts, [role]: id } }, options: opts,
              laneOf: new Map([[role, lane]]), riffParts: [part], hookKey: 'lead', coreFromRiff: new Map(), bpm: style.bpm });
            const voice = VOICES[id]; const sound = soundOf({ id });
            const curve = BANGER_LEVEL_DATA.curves[sound.curveId];
            const strip = measurementStrip(mix.lanes[lane]);
            const context = { voice, sound, curve, lane, strip, fx: mix.fx || {}, bpm: style.bpm,
              chords: slot.family === 'chords' || ['choir', 'pad'].includes(role), role, id };
            const label = `${style.id}${comboId ? '/' + comboId : ''}/${mood}/${role}/${id}`;
            const variants = trackEffects ? (combo ? [] : trackEffectProfiles(context, style, mood)) : [context];
            for (const variant of variants) {
              const key = profileKey(variant);
              const alias = trackEffects ? `${style.id}/track-effects:${variant.production.mode}:${variant.production.treatment}/${mood}/${role}/${id}` : label;
              if (found.has(key)) { found.get(key).labels.push(alias); found.get(key).chords ||= context.chords; }
              else found.set(key, { ...variant, key, labels: [alias] });
            }
          }
        }
      }
    }
  }
  return [...found.values()];
}

export function benchBars({ pitch, every, length, poly = 1, validation = false }) {
  const notes = Array(16).fill(null), lens = Array(16).fill(null);
  const starts = validation ? (every >= 8 ? [0, 7] : [0, 3, 6, 8, 12, 15]) : Array.from({ length: Math.ceil(16 / every) }, (_, i) => i * every);
  starts.forEach((step, i) => {
    const root = pitch + [0, 3, 7, 5][i % 4];
    const chord = [0, 3, 7, 10].slice(0, poly).map(n => nameOf(root + n));
    notes[step] = poly === 1 ? chord[0] : chord;
    lens[step] = Math.min(length, 16 - step);
  });
  return [{ notes, lens }, { notes: notes.map(n => Array.isArray(n) ? n.slice() : n), lens: lens.slice() }];
}
export function scenarios(context, validation = false) {
  const base = context.lane.startsWith('bass') ? 33 : context.chords ? 48 : 60;
  const rows = [];
  const add = (pitch, every, length, poly, bpm) => {
    const bars = benchBars({ pitch, every, length, poly, validation });
    rows.push({ bars, bpm, features: phraseFeatures(bars, bpm) });
  };
  if (validation) {
    add(base + 5, 3, 2, context.chords ? 3 : 1, context.bpm);
    add(base + 17, 8, 7, context.chords ? 4 : 1, context.bpm);
  } else for (const pitch of [base, base + 12, base + 24]) {
    for (const [every, length] of [[1, 1], [2, 1], [8, 8]]) {
      for (const poly of context.chords ? [3, 4] : [1]) {
        for (const bpm of [Math.round(context.bpm * 0.85), Math.round(context.bpm * 1.15)]) add(pitch, every, length, poly, bpm);
      }
    }
  }
  return rows;
}
export function scenarioSong(context, scenario) {
  const { lane, voice, strip, fx } = context;
  const bank = packBank(scenario.bars.map(part => ({ [lane]: part })), { bpm: scenario.bpm, musicTrim: 1, drums: [] });
  const family = lane.replace(/\d+$/, '');
  return { bank, mix: { master: 0, masterEffects: [], fx,
    lanes: { [lane]: measurementStrip(strip) }, voiceParams: { [`${lane}Voice`]: voice },
    layers: lane === family ? [] : [{ key: lane, from: family, independent: true }] } };
}
export function scenarioPrediction(context, scenario) {
  return predictedProcessedPart({ bars: scenario.bars, bpm: scenario.bpm, lane: context.lane,
    sound: context.sound, strip: context.strip });
}
export { BANGER_STYLES, BANGER_COMBOS, BANGER_LEVEL_DATA, L };
