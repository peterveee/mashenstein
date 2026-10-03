// MAKE A BANGER — the forms beyond the Club banger: Pop Song, Anthem, Groove.
//
// A template is DATA: its sections at their natural lengths (a 64-bar song), what to give
// up first when the song is shorter (`shrink`) and what to grow when it is longer
// (`grow`), fitted exactly the way the Club form is (form.js). The result is a list of
// typed sections ({ type, bars, label, energy, lift, variant }) — the same thing the
// dialog's form editor draws and stores — which form.js `formFromList` turns into the
// form the sections are written from.
//
//   Pop Song   intro (a chorus quote) · verse · pre-chorus · chorus · verse 2 · pre 2 ·
//              chorus 2 · MIDDLE 8 · final chorus, lifted · outro (a chorus tag)
//   Anthem     intro · build · drop · a long breakdown with the hook alone · rebuild ·
//              one huge final drop, lifted · outro
//   Groove     no drops: eight-bar sections over one groove, the parts arriving one at a
//              time, a drums-out dip in the middle, leaving again at the end
//
// Browser-safe.
import { SECTION_TYPES } from './form-types.js';

const S = (id, type, bars, extra = {}) => ({ id, type, bars, ...extra });

export const FORM_TEMPLATES = Object.freeze({
  pop: {
    label: 'Pop Song',
    title: 'Verse, pre-chorus, chorus — twice — then a middle 8 and a lifted final chorus',
    slots: [
      S('intro', 'intro', 4, { variant: 'quote' }),
      S('verse1', 'verse', 8, { label: 'Verse 1' }),
      S('pre1', 'preChorus', 4),
      S('chorus1', 'chorus', 8),
      S('verse2', 'verse', 8, { label: 'Verse 2', energy: 0.52 }),
      S('pre2', 'preChorus', 4, { label: 'Pre-Chorus 2', energy: 0.66 }),
      S('chorus2', 'chorus', 8, { label: 'Chorus 2', energy: 0.88 }),
      S('mid8', 'middle8', 8),
      S('final', 'chorus', 8, { label: 'Final Chorus', energy: 1, lift: true }),
      S('outro', 'outro', 4, { variant: 'tag' }),
    ],
    // A short song loses its second verse and chorus first — a radio edit — then trims.
    shrink: [['verse2', 0], ['pre2', 0], ['chorus2', 0], ['outro', 2], ['intro', 2], ['mid8', 4], ['verse1', 4],
      ['pre1', 2], ['chorus1', 4], ['final', 4]],
    grow: [['chorus1', 16], ['final', 16], ['chorus2', 16], ['verse1', 16], ['verse2', 16], ['intro', 8], ['outro', 8],
      ['mid8', 16], ['pre1', 8], ['pre2', 8], ['chorus1', 24], ['final', 32], ['chorus2', 24], ['intro', 16], ['outro', 16]],
    step: { chorus1: 8, chorus2: 8, final: 8, verse1: 8, verse2: 8 },
    sink: 'final',
  },
  anthem: {
    label: 'Anthem',
    title: 'One drop, a long breakdown with the hook alone, a rebuild, and one huge lifted final drop',
    slots: [
      S('intro', 'intro', 4),
      S('build', 'build', 4),
      S('drop', 'drop', 8, { label: 'First Drop' }),
      S('breakdown', 'breakdown', 16, { variant: 'exposed' }),
      S('rebuild', 'build', 8, { label: 'Rebuild', variant: 'rebuild', energy: 0.7 }),
      S('final', 'drop', 20, { label: 'Final Drop', energy: 1, lift: true }),
      S('outro', 'outro', 4),
    ],
    // The breakdown is the point of an anthem: it is the last thing cut.
    shrink: [['final', 16], ['outro', 2], ['intro', 2], ['rebuild', 4], ['drop', 4], ['final', 12], ['breakdown', 12],
      ['outro', 0], ['final', 8], ['breakdown', 8], ['build', 2], ['final', 4]],
    grow: [['breakdown', 32], ['final', 32], ['drop', 16], ['intro', 16], ['rebuild', 16], ['outro', 8], ['build', 8],
      ['final', 48], ['drop', 32]],
    step: { breakdown: 8, final: 8, drop: 8 },
    sink: 'final',
  },
  groove: {
    label: 'Groove',
    title: 'No drops: one long groove in eight-bar sections, the parts arriving one at a time, a drums-out dip, then leaving',
  },
});
export const TEMPLATE_IDS = Object.freeze(['club', ...Object.keys(FORM_TEMPLATES)]);

/**
 * Fit slots to exactly `total` bars: shrink in order until it fits, grow by cycling the
 * list in whole steps while they fit, the rest to the `sink`. Club's algorithm (form.js).
 */
export function fitSlots(slots, total, { shrink = [], grow = [], step = {}, sink = null }) {
  const parts = slots.map((s) => ({ ...s }));
  const sum = () => parts.reduce((n, p) => n + p.bars, 0);
  const find = (id) => parts.find((p) => p.id === id);
  for (const [id, to] of shrink) {
    if (sum() <= total) break;
    const p = find(id);
    if (!p || p.bars <= to) continue;
    if (to === 0) parts.splice(parts.indexOf(p), 1);
    else p.bars = to;
  }
  let grew = true;
  while (sum() < total && grew) {
    grew = false;
    for (const [id, to] of grow) {
      const p = find(id);
      if (!p) continue;
      const st = step[id] || 4;
      if (p.bars + st <= to && sum() + st <= total) { p.bars += st; grew = true; }
    }
  }
  const last = find(sink) || parts[parts.length - 1];
  if (sum() < total) last.bars += total - sum();
  return parts;
}

/**
 * Groove: eight-bar sections, each with how many of the style's layers play (`layers`, of
 * `count`). The parts arrive over the first two-fifths, everything is in through the
 * middle with one section of the drums out, and the last two sections take them away.
 */
function grooveSlots(total, count) {
  const n = Math.max(1, Math.ceil(total / 8));
  const bars = Array.from({ length: n }, (_, i) => (i < n - 1 ? 8 : total - 8 * (n - 1)));
  const rise = Math.max(1, Math.min(count, Math.ceil(n * 0.4)));
  const fall = n >= 5 ? 2 : n >= 3 ? 1 : 0;
  const dip = n >= 6 ? Math.floor(n * 0.62) : -1;
  const down = Math.ceil(count / (fall + 1));
  return bars.map((b, i) => {
    let layers = count;
    if (i < rise) layers = rise === 1 ? count : Math.round(1 + (i * (count - 1)) / (rise - 1));
    if (i >= n - fall) layers = Math.max(1, count - (i - (n - fall) + 1) * down);
    const isDip = i === dip;
    return {
      id: `g${i}`, type: 'groove', bars: b,
      energy: isDip ? 0.4 : Math.round((layers / count) * 100) / 100,
      variant: isDip ? 'dip' : 'build',
      label: isDip ? 'Drums Out' : i < rise && layers < count ? `Groove · ${layers}/${count}` : i >= n - fall ? 'Groove Out' : 'Groove',
    };
  });
}

/**
 * A template's sections for a song of `total` bars, honouring the switches that apply to
 * any form: Intro, Outro, False Ending (before the final chorus). `count` is the style's
 * number of layers, for Groove.
 */
export function templateSections(id, form, total, count = 5) {
  if (id === 'groove') return grooveSlots(total, count);
  const t = FORM_TEMPLATES[id];
  if (!t) throw new Error(`no form template "${id}"`);
  let slots = t.slots.filter((s) => (s.type !== 'intro' || form.intro) && (s.type !== 'outro' || form.outro));
  if (form.falseEnding) {
    const at = slots.findIndex((s) => s.id === t.sink);
    if (at > 0) slots = [...slots.slice(0, at), S('false', 'falseEnding', 4), ...slots.slice(at)];
  }
  const shrink = form.falseEnding ? [...t.shrink.slice(0, 3), ['false', 2], ...t.shrink.slice(3), ['false', 0]] : t.shrink;
  return fitSlots(slots, total, { ...t, shrink });
}

/** A section list's default label for a type, numbered when the type repeats. */
export function defaultLabel(type, nth) {
  const base = SECTION_TYPES[type]?.label || type;
  return nth > 0 ? `${base} ${nth + 1}` : base;
}
