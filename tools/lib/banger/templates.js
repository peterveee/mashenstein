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
  // THE CLUB SHAPES (Peter, 10 Oct 2026: other forms for a club track — "no radio edit though"). Each is
  // the build-and-drop banger laid out another way; the joins between sections are the other forms'.
  double: {
    label: 'Double Breakdown',
    title: 'Two breakdowns: drop, breakdown, drop two, a short second breakdown and build, then the lifted final drop',
    slots: [
      S('intro', 'intro', 4), S('build', 'build', 4), S('drop', 'drop', 16),
      S('bd1', 'breakdown', 8), S('build2', 'build', 4, { label: 'Build 2' }), S('drop2', 'drop', 16, { label: 'Drop 2', energy: 0.9 }),
      S('bd2', 'breakdown', 4, { label: 'Breakdown 2' }), S('build3', 'build', 4, { label: 'Build 3' }),
      S('final', 'drop', 16, { label: 'Final Drop', energy: 1, lift: true }), S('outro', 'outro', 4),
    ],
    shrink: [['final', 12], ['drop', 12], ['drop2', 8], ['final', 8], ['drop', 8], ['bd1', 4], ['outro', 2], ['intro', 2], ['build', 2],
      ['build2', 2], ['build3', 2], ['drop2', 4], ['drop', 4], ['final', 4], ['outro', 0], ['intro', 0], ['bd2', 0]],
    grow: [['final', 32], ['drop', 32], ['bd1', 16], ['drop2', 16], ['intro', 8], ['outro', 8], ['build', 8], ['build2', 8], ['build3', 8],
      ['bd2', 8], ['final', 48], ['drop', 48], ['drop2', 32]],
    step: { final: 8, drop: 8, drop2: 8, bd1: 8 },
    sink: 'final',
  },
  fakeout: {
    label: 'Fake-Out Drop',
    title: 'The first build lands on a half-time fake drop, builds again, then the real drop — a breakdown, and the lifted final drop',
    slots: [
      S('intro', 'intro', 4), S('build', 'build', 4), S('fake', 'halfDrop', 4, { label: 'Fake Drop', energy: 0.65 }),
      S('again', 'build', 4, { label: 'Build Again' }), S('drop', 'drop', 16), S('breakdown', 'breakdown', 8),
      S('build2', 'build', 4, { label: 'Build 2' }), S('final', 'drop', 16, { label: 'Final Drop', energy: 1, lift: true }), S('outro', 'outro', 4),
    ],
    shrink: [['final', 8], ['drop', 8], ['breakdown', 4], ['outro', 2], ['intro', 2], ['build', 2], ['again', 2], ['build2', 2], ['drop', 4],
      ['final', 4], ['outro', 0], ['intro', 0], ['breakdown', 0], ['build2', 0]],
    grow: [['final', 32], ['drop', 32], ['breakdown', 16], ['intro', 8], ['outro', 8], ['build', 8], ['again', 8], ['build2', 8],
      ['final', 64], ['drop', 64]],
    step: { final: 8, drop: 8, breakdown: 8 },
    sink: 'final',
  },
  dropfirst: {
    label: 'Drop First',
    title: 'Opens on four bars of the drop, then the intro and the build — the drop proper, a breakdown, and the lifted final drop',
    slots: [
      S('open', 'drop', 4, { label: 'Cold Drop', energy: 0.85 }), S('intro', 'intro', 4), S('build', 'build', 4), S('drop', 'drop', 16),
      S('breakdown', 'breakdown', 12), S('build2', 'build', 4, { label: 'Build 2' }),
      S('final', 'drop', 16, { label: 'Final Drop', energy: 1, lift: true }), S('outro', 'outro', 4),
    ],
    shrink: [['final', 8], ['drop', 8], ['breakdown', 8], ['breakdown', 4], ['outro', 2], ['intro', 2], ['build', 2], ['build2', 2],
      ['drop', 4], ['final', 4], ['outro', 0], ['intro', 0], ['breakdown', 0], ['build2', 0]],
    grow: [['final', 32], ['drop', 32], ['breakdown', 16], ['intro', 8], ['outro', 8], ['build', 8], ['build2', 8], ['open', 8],
      ['final', 64], ['drop', 64]],
    step: { final: 8, drop: 8 },
    sink: 'final',
  },
  longbuild: {
    label: 'Long Build',
    title: 'No breakdown: one long build, the arp from its first bar, into a long drop that lifts for its second half',
    slots: [
      S('intro', 'intro', 8), S('build', 'build', 16, { label: 'Long Build', variant: 'rebuild', energy: 0.7 }), S('drop', 'drop', 16),
      S('final', 'drop', 16, { label: 'Final Drop', energy: 1, lift: true }), S('outro', 'outro', 8),
    ],
    shrink: [['outro', 4], ['intro', 4], ['final', 8], ['drop', 8], ['build', 8], ['outro', 2], ['intro', 2], ['final', 4], ['drop', 4],
      ['build', 4], ['outro', 0], ['intro', 0]],
    grow: [['drop', 32], ['final', 32], ['intro', 16], ['outro', 16], ['final', 64], ['drop', 64]],
    step: { drop: 8, final: 8 },
    sink: 'final',
  },
  peaks: {
    label: 'Peak and Valley',
    title: 'Drop, breakdown, drop, breakdown, final drop — each drop bigger than the last, straight out of the breakdown into the second',
    slots: [
      S('intro', 'intro', 4), S('build', 'build', 4), S('drop', 'drop', 8, { energy: 0.8 }), S('valley1', 'breakdown', 8, { label: 'Valley' }),
      S('drop2', 'drop', 8, { label: 'Drop 2', energy: 0.9 }), S('valley2', 'breakdown', 8, { label: 'Valley 2' }),
      S('build2', 'build', 4, { label: 'Build 2' }), S('final', 'drop', 16, { label: 'Final Drop', energy: 1, lift: true }), S('outro', 'outro', 4),
    ],
    shrink: [['final', 8], ['valley1', 4], ['valley2', 4], ['outro', 2], ['intro', 2], ['build', 2], ['build2', 2], ['drop', 4], ['drop2', 4],
      ['final', 4], ['outro', 0], ['intro', 0], ['valley2', 0]],
    grow: [['final', 32], ['drop', 16], ['drop2', 16], ['valley1', 16], ['valley2', 16], ['intro', 8], ['outro', 8], ['build', 8], ['build2', 8],
      ['final', 64], ['drop', 32], ['drop2', 32]],
    step: { final: 8, drop: 8, drop2: 8 },
    sink: 'final',
  },
});
export const TEMPLATE_IDS = Object.freeze(['club', ...Object.keys(FORM_TEMPLATES)]);

/**
 * CLUB SHAPE — a Club song laid out another way now and then (Peter, 10 Oct 2026, on the suggested
 * frequency: "lets do all of them"): the plain Club form about half the time, each shape about one in
 * ten — Fake-Out Drop only in the bass-heavy styles, Long Build only in the big trance-and-room ones.
 * index.js draws it (Varied, from Ways Era 4) where the form is Club and nothing is drawn by hand.
 */
export const CLUB_SHAPES = Object.freeze([
  { id: 'club', label: 'Club', note: 'Intro, build, drop, breakdown, build, drop two, drop three — the classic', varied: true, weight: 5 },
  { id: 'double', label: 'Double Breakdown', note: FORM_TEMPLATES.double.title, varied: true, since: 4 },
  { id: 'fakeout', label: 'Fake-Out Drop', note: FORM_TEMPLATES.fakeout.title, varied: true, since: 4,
    onlyFor: { styles: ['future-bass', 'dnb', 'electro', 'moombahton', 'big-room'] } },
  { id: 'dropfirst', label: 'Drop First', note: FORM_TEMPLATES.dropfirst.title, varied: true, since: 4 },
  { id: 'longbuild', label: 'Long Build', note: FORM_TEMPLATES.longbuild.title, varied: true, since: 4,
    onlyFor: { styles: ['trance', 'big-room', 'eurodance', 'rave'] } },
  { id: 'peaks', label: 'Peak and Valley', note: FORM_TEMPLATES.peaks.title, varied: true, since: 4 },
]);

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
