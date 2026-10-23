import { PRESET_CATEGORIES, PRESET_TAXONOMY, presetClassification } from '../../src/data/preset-browsing.js';
import { synthDisplayName } from './synth-display.js';

export const presetEngine = (v) => v?.kind === 'engine' ? 'Built-in'
  : synthDisplayName(v?.kind === 'drum' ? 'drum' : v?.synth || v?.kind || 'Unknown');

export const emptyPresetFilters = () => ({ category: 'all', subcategory: 'all', engine: 'all' });

/** Pure, shared cascading facets. Search never silently changes a selected filter. */
export function presetBrowserModel(voices, filters, query = '', { reconcile = false } = {}) {
  const rows = voices.map((voice) => ({ voice, ...presetClassification(voice), engine: presetEngine(voice) }));
  const state = { ...emptyPresetFilters(), ...filters };
  const matches = (row, key) => state[key] === 'all' || row[key] === state[key];
  if (reconcile) {
    if (!rows.some((r) => matches(r, 'category'))) state.category = 'all';
    if (!rows.some((r) => matches(r, 'category') && matches(r, 'subcategory'))) state.subcategory = 'all';
    if (!rows.some((r) => matches(r, 'category') && matches(r, 'subcategory') && matches(r, 'engine'))) state.engine = 'all';
  }
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searched = rows.filter((r) => {
    const text = `${r.voice.label} ${r.category} ${r.subcategory} ${r.engine} ${r.voice.note || ''}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
  const facet = (pool, key, order) => {
    const counts = new Map();
    for (const row of pool) counts.set(row[key], (counts.get(row[key]) || 0) + 1);
    // Keep an explicitly selected zero-result filter visible so search is explainable.
    if (state[key] !== 'all' && !counts.has(state[key])) counts.set(state[key], 0);
    const keys = [...counts.keys()].sort((a, b) => order
      ? order.indexOf(a) - order.indexOf(b) || a.localeCompare(b) : a.localeCompare(b));
    return [{ value: 'all', label: 'All', count: pool.length },
      ...keys.map((value) => ({ value, label: value, count: counts.get(value) }))];
  };
  const categorized = searched.filter((r) => matches(r, 'category'));
  const subcategorized = categorized.filter((r) => matches(r, 'subcategory'));
  return {
    filters: state,
    facets: {
      category: facet(searched, 'category', PRESET_CATEGORIES),
      subcategory: facet(categorized, 'subcategory', PRESET_TAXONOMY[state.category]),
      engine: facet(subcategorized, 'engine'),
    },
    results: subcategorized.filter((r) => matches(r, 'engine'))
      .sort((a, b) => a.voice.label.localeCompare(b.voice.label) || a.voice.id.localeCompare(b.voice.id)),
  };
}
