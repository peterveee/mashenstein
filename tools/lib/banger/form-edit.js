// MAKE A BANGER — the form editor's moves, as pure functions on a list of sections
// ({ type, bars, label?, energy?, lift?, variant?, role? } — what `options.form.sections`
// holds). The dialog (tools/mixer-banger-form.js) draws the list and calls these; the
// tests call them too. Every move returns a new list. Browser-safe.
import { SECTION_TYPES, normaliseSections, roleFits } from './form-types.js';
import { templateSections } from './templates.js';
import { BANGER_LIMITS } from './options.js';

export const total = (list) => list.reduce((n, s) => n + s.bars, 0);
const clamp = (type, bars) => {
  const def = SECTION_TYPES[type];
  return Math.max(def.min, Math.min(def.max, Math.round(bars / 2) * 2));
};
const plain = ({ id, ...s }) => s;

/** A template's sections at `bars`, ready to edit. `form` is the request's form switches. */
export function applyTemplate(id, form, bars, layerCount = 5) {
  return templateSections(id, form, bars, layerCount).map(plain);
}

/**
 * A form (generateBanger's, or buildForm's) as an editable list. `keepRoles` keeps each
 * Club section's role, so the Club form drawn out stays exactly the Club form.
 */
export function fromForm(form, keepRoles = false) {
  return form.map((f) => ({
    ...(f.id ? { id: f.id } : {}), type: f.type, bars: f.bars, label: f.label, energy: f.energy,
    ...(f.lifted ? { lift: true } : {}),
    ...(f.variant && f.variant !== 'riff' ? { variant: f.variant } : {}),
    ...(keepRoles ? { role: f.role } : {}),
  }));
}

/** A new section of `type` after index `at` (−1 for the start), at a sensible length. */
export function addSection(list, at, type) {
  const def = SECTION_TYPES[type];
  const out = list.map((s) => ({ ...s }));
  let serial = 1;
  while (list.some(s => s.id === `section-${serial}`)) serial++;
  out.splice(at + 1, 0, { id: `section-${serial}`, type, bars: Math.max(4, def.min * 2) });
  return out;
}
export const removeSection = (list, i) => list.filter((_, j) => j !== i).map((s) => ({ ...s }));

/** The section at `from` moved to `to`. */
export function moveSection(list, from, to) {
  const out = list.map((s) => ({ ...s }));
  const [s] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, s);
  return out;
}

/** A section `delta` bars longer (or shorter), kept inside its kind's range. */
export function resizeSection(list, i, delta) {
  return list.map((s, j) => (j === i ? { ...s, bars: clamp(s.type, s.bars + delta) } : { ...s }));
}

/** One section with some of its fields changed (type, label, energy, lift, variant). */
export function setSection(list, i, patch) {
  return list.map((s, j) => {
    if (j !== i) return { ...s };
    const next = { ...s, ...patch };
    // A new kind of section loses what only the old one had.
    if (patch.type && patch.type !== s.type) {
      delete next.variant;
      // A Club drop turned Half-Time (or back) is still that drop; anything else is new.
      if (!roleFits(next.role, patch.type)) delete next.role;
      if (!patch.label) delete next.label;
      next.bars = clamp(patch.type, next.bars);
    }
    for (const k of Object.keys(next)) if (next[k] == null || next[k] === '') delete next[k];
    return next;
  });
}

/**
 * The list rescaled to `bars` in all, every section in proportion (in twos, inside its
 * range), the difference going to the longest section that can take it.
 */
export function scaleTo(list, bars) {
  const was = total(list);
  if (!was) return list;
  const out = list.map((s) => ({ ...s, bars: clamp(s.type, (s.bars * bars) / was) }));
  for (let guard = 0; guard < 999 && total(out) !== bars; guard++) {
    const diff = bars - total(out);
    const step = diff > 0 ? 2 : -2;
    const order = out.map((s, i) => i).sort((a, b) => out[b].bars - out[a].bars);
    const at = order.find((i) => clamp(out[i].type, out[i].bars + step) === out[i].bars + step);
    if (at == null) break;
    out[at].bars += step;
  }
  return out;
}

/** What is wrong with a list, as sentences — empty when it can be made. */
export function issues(list) {
  const out = [...normaliseSections(list).issues];
  const n = total(list);
  if (n < BANGER_LIMITS.minBars || n > BANGER_LIMITS.maxBars) out.push(`a song is ${BANGER_LIMITS.minBars}–${BANGER_LIMITS.maxBars} bars — this one is ${n}`);
  return out;
}
