// The compact, block-local inspector. Presets are copied, never linked live.
import { regionStyleEffects } from './lib/region-style-effects.js';
import { SECTION_FX_PARTS, SECTION_FX_RANGES, sectionEffectPreset } from './lib/banger/section-effects.js';
import { MAX_EFFECTS, TEMPO_DIVISIONS, EFFECT_BY_ID } from '../src/engine/effects.js';

const presets = regionStyleEffects();
const primary = row => { const chain = row.chain || sectionEffectPreset(row.legacyEffect); return chain.find(e => e.id !== 'gain') || chain[0]; };
const parameters = effect => {
  if (['delay', 'pingpong', 'chandelay'].includes(effect.id)) {
    const params = { ...EFFECT_BY_ID[effect.id].defaults, ...effect.params };
    return [['wet', 'Mix', 0, 1, .01], ['division', 'Timing', { Free: 'free', ...TEMPO_DIVISIONS }],
      ...(!params.sync ? [['delayMs', 'Delay ms', 1, 8000, 1]] : []), ['feedback', 'Feedback', 0, .9, .01]];
  }
  if (['chorus', 'chorus2'].includes(effect.id)) return [['wet', 'Mix', 0, 1, .01], ['depth', 'Depth', 0, 1, .01]];
  if (effect.id === 'ambience') return [['wet', 'Mix', 0, 1, .01], ['space', 'Size', 0, 1, .01]];
  if (effect.id === 'reverb') return [['wet', 'Mix', 0, 1, .01], ['decay', 'Decay', .1, 10, .1]];
  if (effect.id === 'filter') return [['frequency', 'Cutoff', 20, 20000, 10]];
  return [];
};
export function sectionFxInspector(rows, escapeHtml, warnings = []) {
  const options = (list, value) => list.map(([id, label]) => `<option value="${escapeHtml(String(id))}"${String(value) === String(id) ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
  return '<div class="bgsectionfx"><b>Effects in this section</b><span class="bangernote">Effects follow this block. They do not add notes or enable a part.</span>'
    + rows.map((row, i) => {
      const effect = primary(row);
      const params = { ...EFFECT_BY_ID[effect.id].defaults, ...effect.params };
      const choices = presets.map(p => [p.id, p.label]);
      if (!choices.some(([id]) => id === row.presetId)) choices.unshift([row.presetId || '', 'Saved effect chain']);
      return `<div class="bgsectionfxrow" data-fx-row="${i}">`
        + `<label class="askcheck"><input type="checkbox" data-fx-key="enabled"${row.enabled !== false ? ' checked' : ''}>On</label>`
        + `<label class="askfield">Part<select data-fx-key="part">${options(SECTION_FX_PARTS, row.part)}</select></label>`
        + `<label class="askfield">Effect<select data-fx-key="presetId">${options(choices, row.presetId || '')}</select></label>`
        + `<label class="askfield">Where<select data-fx-key="range">${options(SECTION_FX_RANGES, row.range)}</select></label>`
        + parameters(effect).map(([key, label, min, max, step]) => `<label class="askfield bgfxparam">${label}${typeof min === 'object'
          ? `<select data-fx-param="${key}">${options(Object.entries(min).map(([label, value]) => [value, label]), key === 'division' && !params.sync ? 'free' : params[key] ?? .5)}</select>`
          : `<input type="number" data-fx-param="${key}" min="${min}" max="${max}" step="${step}" value="${params[key] ?? 0}">`}</label>`).join('')
        + `<button type="button" data-fx-remove="${i}" aria-label="Remove section effect ${i + 1}">Remove</button>`
        + (warnings[i] ? `<span class="bangerwarn">${escapeHtml(warnings[i])}</span>` : '') + '</div>';
    }).join('')
    + `<button type="button" data-fx-add${rows.length >= MAX_EFFECTS ? ' disabled' : ''}>Add effect</button>`
    + `<span class="bangernote">Up to ${MAX_EFFECTS} rows; each lane chain allows ${MAX_EFFECTS} effects. Later rows replace matching effect families.</span></div>`;
}
export function wireSectionFx(host, rows, update) {
  host.querySelector('[data-fx-add]')?.addEventListener('click', () => {
    if (rows.length >= MAX_EFFECTS) return;
    const preset = presets.find(p => p.id === 'generic:pingpong');
    update([...rows, { part: 'hook', range: 'whole', enabled: true, presetId: preset.id, chain: structuredClone(preset.chain) }]);
  });
  host.querySelectorAll('[data-fx-remove]').forEach(el => el.onclick = () => update(rows.filter((_, i) => i !== Number(el.dataset.fxRemove))));
  host.querySelectorAll('[data-fx-key], [data-fx-param]').forEach(el => {
    el.addEventListener('input', e => e.stopPropagation());
    el.addEventListener('change', e => {
      e.stopPropagation();
      const next = structuredClone(rows), row = next[Number(el.closest('[data-fx-row]').dataset.fxRow)];
      const key = el.dataset.fxKey;
      if (key === 'presetId') {
        const preset = presets.find(p => p.id === el.value);
        if (!preset) return;
        row.presetId = preset.id; row.chain = structuredClone(preset.chain); delete row.legacyEffect;
      } else if (key) row[key] = key === 'enabled' ? el.checked : el.value;
      else {
        if (el.dataset.fxParam === 'division' && el.value === 'free') {
          row.chain ||= sectionEffectPreset(row.legacyEffect); delete row.legacyEffect;
          const effect = primary(row); effect.params ||= {}; effect.params.sync = 0;
          update(next); return;
        }
        const value = Number(el.value);
        if (!Number.isFinite(value)) return;
        if (el.type === 'number' && (value < Number(el.min) || value > Number(el.max))) { el.reportValidity(); return; }
        row.chain ||= sectionEffectPreset(row.legacyEffect);
        delete row.legacyEffect;
        const effect = primary(row);
      const params = { ...EFFECT_BY_ID[effect.id].defaults, ...effect.params };
        effect.params ||= {};
        effect.params[el.dataset.fxParam] = value;
        if (el.dataset.fxParam === 'division') effect.params.sync = 1;
      }
      update(next);
    });
  });
}
