// BANGER SOUND PALETTE — optional, scoped alternatives to the shipped style sounds.
// Browser-safe: generator, Lab, Desk preview and the Palette editor share this resolver.
import { VOICES } from '../../../src/data/voices.js';
import { EFFECT_BY_ID, INSERT_EFFECTS, MAX_EFFECTS, TEMPO_DIVISIONS, AUTOPANNER_RATE_DIVISIONS, paramRange } from '../../../src/engine/effects.js';
import { BANGER_STYLES } from './styles/index.js';
import { BANGER_MOODS } from './options.js';
import { PART_SLOTS, RANDOM_JOBS, soundIssues, resolveSounds, phoneStyle, soundsRow } from './sound-rules.js';
import { BANGER_SOUNDS } from './sounds.js';
import paletteData from './palette.json' with { type: 'json' };

export const BANGER_PALETTE = Object.freeze(paletteData);
export const PALETTE_VERSION = 1;
const STYLE_IDS = new Set(BANGER_STYLES.map((s) => s.id));
const MOOD_IDS = new Set(BANGER_MOODS.map((m) => m.id));
const PART_KEYS = new Set([
  ...PART_SLOTS.filter((p) => p.kind === 'tone').map((p) => `part:${p.key}`),
  ...RANDOM_JOBS.map((j) => `riff:${j.key}`),
]);
const clone = (v) => structuredClone(v);
const obj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const rounded = (n) => Math.round(n * 10) / 10;

export function tidyPalette(raw = {}) {
  const out = { version: PALETTE_VERSION, styles: {}, moods: {}, combinations: {} };
  for (const scope of ['styles', 'moods']) {
    for (const [id, value] of Object.entries(raw?.[scope] || {}).sort(([a], [b]) => a.localeCompare(b))) {
      out[scope][id] = tidyScope(value);
    }
  }
  for (const [styleId, moods] of Object.entries(raw?.combinations || {}).sort(([a], [b]) => a.localeCompare(b))) {
    out.combinations[styleId] = {};
    for (const [moodId, value] of Object.entries(moods || {}).sort(([a], [b]) => a.localeCompare(b))) {
      out.combinations[styleId][moodId] = tidyScope(value);
    }
  }
  return out;
}

function tidyScope(scope = {}) {
  const out = { parts: {} };
  for (const [part, patch] of Object.entries(scope?.parts || {}).sort(([a], [b]) => a.localeCompare(b))) {
    out.parts[part] = { entries: {} };
    for (const [id, entry] of Object.entries(patch?.entries || {}).sort(([a], [b]) => a.localeCompare(b))) {
      const e = {};
      for (const k of ['enabled', 'favourite']) if (typeof entry?.[k] === 'boolean') e[k] = entry[k];
      if (Number.isFinite(entry?.trimDb)) e.trimDb = rounded(entry.trimDb);
      if (Array.isArray(entry?.inserts)) e.inserts = entry.inserts.map((fx) => ({
        id: fx.id,
        ...(obj(fx.params) && Object.keys(fx.params).length ? { params: Object.fromEntries(Object.entries(fx.params).sort(([a], [b]) => a.localeCompare(b))) } : {}),
        ...(fx.bypass ? { bypass: true } : {}),
      }));
      if (obj(entry?.send)) e.send = Object.fromEntries(Object.entries(entry.send).filter(([, v]) => Number.isFinite(v)).sort(([a], [b]) => a.localeCompare(b)));
      out.parts[part].entries[id] = e;
    }
  }
  return out;
}

export function paletteIssues(raw, { sounds = BANGER_SOUNDS } = {}) {
  const issues = [];
  if (!obj(raw) || raw.version !== PALETTE_VERSION) return ['palette version must be 1'];
  const table = tidyPalette(raw);
  const contexts = [];
  for (const [styleId, style] of Object.entries(table.styles)) {
    if (!STYLE_IDS.has(styleId)) issues.push(`styles.${styleId}: unknown style`);
    for (const [part, patch] of Object.entries(style.parts)) contexts.push({ styleId, moodId: null, part, patch, where: `styles.${styleId}.parts.${part}` });
  }
  for (const [moodId, mood] of Object.entries(table.moods)) {
    if (!MOOD_IDS.has(moodId)) issues.push(`moods.${moodId}: unknown mood`);
    for (const [part, patch] of Object.entries(mood.parts)) contexts.push({ styleId: null, moodId, part, patch, where: `moods.${moodId}.parts.${part}` });
  }
  for (const [styleId, moods] of Object.entries(table.combinations)) {
    if (!STYLE_IDS.has(styleId)) issues.push(`combinations.${styleId}: unknown style`);
    for (const [moodId, mood] of Object.entries(moods)) {
      if (!MOOD_IDS.has(moodId)) issues.push(`combinations.${styleId}.${moodId}: unknown mood`);
      for (const [part, patch] of Object.entries(mood.parts)) contexts.push({ styleId, moodId, part, patch, where: `combinations.${styleId}.${moodId}.parts.${part}` });
    }
  }
  for (const x of contexts) {
    if (!PART_KEYS.has(x.part)) { issues.push(`${x.where}: unknown part`); continue; }
    const role = x.part.slice(x.part.indexOf(':') + 1);
    const slot = x.part.startsWith('part:') ? PART_SLOTS.find((p) => p.key === role) : RANDOM_JOBS.find((p) => p.key === role);
    for (const [id, entry] of Object.entries(x.patch.entries || {})) {
      const path = `${x.where}.entries.${id}`;
      if (!VOICES[id] || VOICES[id].songLocal || VOICES[id].kind === 'engine') { issues.push(`${path}: not a selectable library preset`); continue; }
      if (entry.enabled !== false && slot) {
        const never = x.styleId ? sounds[x.styleId]?.never || [] : [];
        const blocked = soundIssues(id, slot, { never, phone: phoneStyle(x.styleId) }).blocked;
        if (blocked.length) issues.push(`${path}: ${blocked[0]}`);
      }
      if (entry.trimDb != null && (!Number.isFinite(entry.trimDb) || entry.trimDb < -18 || entry.trimDb > 6)) issues.push(`${path}.trimDb: must be from -18 to +6 dB`);
      if (entry.inserts != null) {
        if (!Array.isArray(entry.inserts) || entry.inserts.length > MAX_EFFECTS) { issues.push(`${path}.inserts: use at most ${MAX_EFFECTS} effects`); continue; }
        for (const [i, fx] of entry.inserts.entries()) {
          const def = EFFECT_BY_ID[fx?.id];
          if (!def || !INSERT_EFFECTS.some((x) => x.id === fx.id)) { issues.push(`${path}.inserts[${i}]: unknown channel effect`); continue; }
          for (const [name, value] of Object.entries(fx.params || {})) {
            if (!(def.params || []).includes(name)) { issues.push(`${path}.inserts[${i}].${name}: invalid parameter`); continue; }
            const range = paramRange(name, def);
            if (range.options) {
              if (!range.options.includes(value)) issues.push(`${path}.inserts[${i}].${name}: invalid choice`);
              continue;
            }
            if (!Number.isFinite(value)) { issues.push(`${path}.inserts[${i}].${name}: invalid parameter`); continue; }
            if (range.division) {
              const divisions = def.id === 'autopanner' ? AUTOPANNER_RATE_DIVISIONS : TEMPO_DIVISIONS;
              if (!Object.values(divisions).includes(value)) issues.push(`${path}.inserts[${i}].${name}: not a supported note division`);
              continue;
            }
            if (value < range.min || value > range.max) issues.push(`${path}.inserts[${i}].${name}: outside effect parameter range`);
          }
        }
      }
      for (const [send, value] of Object.entries(entry.send || {})) {
        if (!['delay', 'reverb'].includes(send) || !Number.isFinite(value) || value < 0 || value > 1) issues.push(`${path}.send.${send}: must be from 0 to 1`);
      }
    }
  }
  for (const style of BANGER_STYLES) for (const mood of BANGER_MOODS) {
    const resolved = resolvePalette(table, style.id, mood.id, { sounds });
    for (const [part, list] of Object.entries(resolved || {})) {
      if (!list.length) issues.push(`${style.id}/${mood.id}.${part}: all presets are disabled`);
    }
  }
  return [...new Set(issues)];
}

const contextPatches = (config, styleId, moodId) => [
  config.styles?.[styleId]?.parts,
  config.moods?.[moodId]?.parts,
  config.combinations?.[styleId]?.[moodId]?.parts,
];

/**
 * Resolve optional scope patches over the style/mood sound table. An untouched slot
 * returns null so the generator can preserve the exact legacy choice path.
 */
export function resolvePalette(config, styleId, moodId, { sounds = BANGER_SOUNDS } = {}) {
  if (!config || config.version !== PALETTE_VERSION) return null;
  if (config.resolved === true) return clone(config.parts || {});
  const base = resolveSounds(sounds, styleId, moodId);
  const patches = contextPatches(config, styleId, moodId);
  const touched = new Set(patches.flatMap((p) => Object.keys(p || {})));
  if (!touched.size) return null;
  const result = {};
  for (const part of touched) {
    const isPart = part.startsWith('part:');
    const key = part.slice(part.indexOf(':') + 1);
    const choices = isPart
      ? [...new Set([base.parts?.[key], ...(base.choices?.[key] || [])].filter(Boolean))]
      : [...new Set(base.random?.[key] || [])];
    const entries = new Map(choices.map((id) => [id, { id, enabled: true, favourite: false, trimDb: 0, origin: 'style default' }]));
    for (const [i, scopeEntries] of patches.entries()) {
      const patch = scopeEntries?.[part];
      if (!patch?.entries) continue;
      const origin = ['style', 'mood', 'combination'][i];
      for (const [id, value] of Object.entries(patch.entries)) {
        const previous = entries.get(id) || { id, enabled: false, favourite: false, trimDb: 0 };
        entries.set(id, { ...previous, ...clone(value), id,
          enabled: value.enabled ?? previous.enabled,
          favourite: value.favourite ?? previous.favourite,
          trimDb: value.trimDb ?? previous.trimDb,
          origin });
      }
    }
    const role = part.slice(part.indexOf(':') + 1);
    const slot = isPart ? PART_SLOTS.find((p) => p.key === role) : RANDOM_JOBS.find((j) => j.key === role);
    const never = soundsRow(sounds, styleId)?.never || [];
    result[part] = [...entries.values()].filter((e) => e.enabled && slot && !soundIssues(e.id, slot, { never, phone: phoneStyle(styleId) }).blocked.length)
      .map((e) => ({ ...e, weight: e.favourite ? 3 : 1 }));
  }
  return result;
}

/** Immutable, context-specific snapshot to keep a saved Lab take reproducible. */
export function paletteSnapshot(config, styleId, moodId, opts) {
  const resolved = resolvePalette(config, styleId, moodId, opts);
  return { version: PALETTE_VERSION, resolved: true, styleId, moodId, parts: resolved ? clone(resolved) : {} };
}

/** Test and editor helper: convert a resolved candidate list into a seeded weighted draw. */
export function weightedPalettePick(list, rng) {
  if (!list?.length) return null;
  const total = list.reduce((sum, item) => sum + (item.weight || 1), 0);
  let point = rng.next() * total;
  for (const item of list) { point -= item.weight || 1; if (point < 0) return item; }
  return list.at(-1);
}
