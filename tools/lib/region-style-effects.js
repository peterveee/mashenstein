// Reuse Banger treatments on any arrangement range, independent of its song form.
import { BANGER_CHANNELS } from './banger/channels.js';
import { BANGER_STYLES, styleFor } from './banger/styles/index.js';
import { SECTION_FX_PRESETS, sectionEffectPreset } from './banger/section-effects.js';
import { SECTION_EFFECTS } from '../../src/engine/effects.js';

const names = new Map(SECTION_EFFECTS.map(e => [e.id, e.name || e.id]));
const ordered = value => Array.isArray(value) ? value.map(ordered)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k])])) : value;

/** Fresh chains on every call: card edits can never change a saved style preset.
 * Seed positions are deliberately omitted; the region editor owns the destination. */
export function regionStyleEffects(channels = BANGER_CHANNELS, styles = BANGER_STYLES) {
  const generic = SECTION_FX_PRESETS.filter(([id]) => id !== 'none').map(([id, label]) => ({
    id: `generic:${id}`, label, chain: sectionEffectPreset(id, true),
    note: id === 'stack' ? 'Tempo-locked repeats overlap arp notes; works on busy parts' : 'Banger treatment · editable after adding',
  }));
  const saved = [];
  for (const [id, channel] of Object.entries(channels)) {
    if (channel.sectionFx?.version !== 1) continue;
    const seen = new Set();
    for (const rule of channel.sectionFx.rules || []) {
      if (!rule.chain?.length || !rule.chain.every(e => names.has(e.id))) continue;
      const signature = JSON.stringify(ordered(rule.chain));
      if (seen.has(signature)) continue;
      seen.add(signature);
      const label = styles.find(s => s.id === id)?.label || styleFor(id)?.label || id;
      const effects = rule.chain.map(e => names.get(e.id)).join(' + ');
      saved.push({ id: `style:${id}:${seen.size}`, label: `${label} · ${effects}`,
        note: `Saved from ${rule.role} · ${rule.sourceSection || rule.section}; apply to any region`,
        chain: structuredClone(rule.chain) });
    }
  }
  return [...generic.sort((a, b) => a.label.localeCompare(b.label)), ...saved.sort((a, b) => a.label.localeCompare(b.label))];
}
