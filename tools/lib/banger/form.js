// MAKE A BANGER — the form: which sections, how long, in what order, fitted to a length.
//
// The full shape is ABSOLUTE ZERO's: intro, build, drop, breakdown, build, drop two, a
// stop, a lifted drop three, outro. A switch turns a section off; the length decides how
// long each one is. Presets in bars, at the banger's tempo (128 → Medium is two minutes).
//
// Fitting is two lists of moves, tried in order: shrink until the form fits, then grow
// until it is exactly the length asked for. Drops move by whole eight-bar phrases where
// they can; everything else by four. Browser-safe.

export const SECTION_LABELS = Object.freeze({
  intro: 'Intro', build: 'Build', drop: 'Drop', breakdown: 'Breakdown', build2: 'Build 2',
  drop2: 'Drop 2', drop3: 'Drop 3', false: 'False Ending', reprise: 'Reprise', outro: 'Outro', groove: 'Groove',
});
export const DROP_ROLES = new Set(['drop', 'drop2', 'drop3', 'reprise']);
// Build in Layers: the intro and the outro are named for what they do.
const LAYERED_LABELS = Object.freeze({ intro: 'Layers In', outro: 'Layers Out' });
/**
 * The order the parts arrive in when a style builds in layers and says nothing of its own
 * (a style's `layers`): the kick, the rest of the kit, the bass, the chords, the hook last
 * — the DJ's intro. Each entry is roles or groups of them (sections.js `GROUP`): `riff` is
 * the hook and the riff's own tuned parts, `riffDrums` its drums, `chords` whichever chord
 * part plays, `perc` the percussion, `doubles` everything that doubles or answers the hook.
 */
export const DEFAULT_LAYERS = Object.freeze([
  ['kick', 'riffDrums'],
  ['hats', 'ohats', 'clap', 'snare', 'fill', 'perc'],
  ['bass', 'sub'],
  ['chords', 'arp'],
  ['riff', 'doubles'],
]);
/** Build in Layers on Long Songs: a song longer than this (Medium's 64 bars) builds up. */
export const LAYERS_FROM_BARS = 64;
/** Does a song of `total` bars build in layers? Off, Long Songs (past 64 bars) or Always. */
export const layersOn = (form, total) => form.layers === 'always' || (form.layers === 'long' && total > LAYERS_FROM_BARS);
/** Bars a layered intro wants: four a layer. A layered outro wants eight. */
const layerBars = (style) => 4 * (style?.layers || DEFAULT_LAYERS).length;
/** What plays in a Drums & Bass Intro, unless a style says otherwise (`grooveParts`). */
export const DEFAULT_GROOVE = Object.freeze(['kick', 'clap', 'snare', 'hats', 'ohats', 'fill', 'perc', 'riffDrums', 'bass', 'sub']);
/** The least a layered intro or outro is shrunk to — below that it is not a build any more. */
const LAYERED_FLOOR = Object.freeze({ intro: 8, outro: 4 });
const STEP = { drop: 8, drop2: 8, drop3: 8, reprise: 8 };

// [role, bars] — shrink this one to this many (0 removes it). Tried in order.
// A switch the request turned on outlasts the length's own preferences: a false ending
// asked for in a Short banger costs the double drop and half the first drop before it goes.
const SHRINK = [
  ['breakdown', 4], ['drop3', 8], ['reprise', 8], ['drop2', 8], ['outro', 0], ['drop3', 0],
  ['drop', 8], ['false', 0], ['reprise', 0], ['intro', 0], ['build2', 0], ['breakdown', 0],
  ['drop2', 0], ['build', 0],
];
// [role, up to] — grow this one toward this many. Cycled until the form is long enough.
const GROW = [
  ['drop', 32], ['drop3', 32], ['drop2', 16], ['breakdown', 16], ['intro', 8], ['outro', 8],
  ['build', 8], ['build2', 8], ['drop2', 32], ['intro', 16], ['outro', 16], ['reprise', 16],
  ['drop', 48], ['drop3', 48], ['drop2', 48],
];

/**
 * The sections a request asks for, at their natural lengths, before fitting.
 */
function wanted(form, natural = {}, style = null, layered = false) {
  const out = [];
  if (form.intro) out.push({ role: 'intro', bars: layered ? natural.layers ?? layerBars(style) : natural.intro ?? 4 });
  if (form.build) out.push({ role: 'build', bars: 4 });
  out.push({ role: 'drop', bars: 16 });
  if (form.breakdown) out.push({ role: 'breakdown', bars: natural.breakdown ?? 8 });
  if (form.secondDrop) {
    if (form.build) out.push({ role: 'build2', bars: 4 });
    out.push({ role: 'drop2', bars: form.doubleDrop ? 8 : 16 });
    if (form.doubleDrop) out.push({ role: 'drop3', bars: 16 });
  }
  if (form.falseEnding) {
    out.push({ role: 'false', bars: 4 });
    out.push({ role: 'reprise', bars: 8 });
  }
  if (form.outro) out.push({ role: 'outro', bars: layered ? natural.layersOut ?? 8 : 4 });
  return out;
}

/** Does this request play its style's own bar-by-bar arrangement (Style's Own Form)? */
export const scriptOn = (options, style) => !!(options.form.script && style?.script?.length);

/**
 * A style's own arrangement (`style.script`, Kraftwerk's), fitted to `total` bars. A script
 * is written at its own length — sections, and in each the blocks `[at, parts, extras?]`
 * saying what plays from bar `at` of it — and any other length scales every section and
 * every block in proportion: in fours from 56 bars up, in twos below, the difference going
 * to the section marked `grows` (or, cutting, coming off the longest first).
 *
 * Returns the form entries, each with its blocks as `plays: [{ at, parts: Set, ... }]`.
 */
export function scriptForm(script, total) {
  const natural = script.reduce((s, x) => s + x.bars, 0);
  const q = total >= 56 ? 4 : 2;
  const bars = script.map((x) => (total === natural ? x.bars : Math.max(q, Math.round((x.bars * total) / natural / q) * q)));
  let diff = total - bars.reduce((s, b) => s + b, 0);
  const grows = Math.max(0, script.findIndex((x) => x.grows));
  for (let guard = 0; diff !== 0 && guard < 999; guard++) {
    const step = Math.min(Math.abs(diff), q) * Math.sign(diff);
    let at = grows;
    if (step < 0 && bars[at] + step < q) {
      at = bars.reduce((best, b, i) => (b > bars[best] ? i : best), 0);
      if (bars[at] + step < Math.min(q, 2)) break;
    }
    bars[at] += step;
    diff -= step;
  }
  let bar = 1;
  return script.map((x, i) => {
    const n = bars[i];
    // A block lands where it would in proportion, on an even bar; one squeezed out by the
    // block after it never plays.
    const plays = x.plays.map(([at, parts, extras = {}]) => ({
      at: at === 0 ? 0 : Math.min(n - 1, Math.round((at * n) / x.bars / 2) * 2), parts: new Set(parts), ...extras,
    })).filter((blk, k, all) => !all.slice(k + 1).some((later) => later.at <= blk.at));
    const out = { role: x.role, label: x.label, bars: n, from: bar, to: bar + n - 1, lifted: false, plays, dropIndex: x.dropIndex ?? 0 };
    bar += n;
    return out;
  });
}

/**
 * The form for `options`, exactly `total` bars long: `[{ role, label, bars, from, to,
 * lifted }]` with `from`/`to` counted from 1. `lifted` marks the sections the key lift
 * applies to — the last drop and anything after it that plays the drop.
 */
export function buildForm(options, total, style = null) {
  if (scriptOn(options, style)) {
    const form = scriptForm(style.script, total);
    // The key lift, if asked for, from the last drop to the outro — as for any form.
    const liftRole = form.some((s) => s.role === 'drop3') ? 'drop3' : form.some((s) => s.role === 'drop2') ? 'drop2' : null;
    let lifting = false;
    for (const s of form) {
      if (s.role === liftRole) lifting = true;
      if (s.role === 'outro') lifting = false;
      s.lifted = lifting && DROP_ROLES.has(s.role);
    }
    return form;
  }
  // A style may lengthen its sections (trance's long breakdown) and say which to give up
  // first when the length is short; everything else is the shared shape.
  const layered = layersOn(options.form, total);
  const parts = wanted(options.form, style?.form?.bars, style, layered);
  const sum = () => parts.reduce((s, p) => s + p.bars, 0);
  const find = (role) => parts.find((p) => p.role === role);
  for (const [role, want] of style?.form?.shrink || SHRINK) {
    if (sum() <= total) break;
    // A layered intro or outro is shrunk, never taken away: it is the point of the switch.
    const to = layered ? Math.max(want, LAYERED_FLOOR[role] ?? 0) : want;
    const p = find(role);
    if (!p || p.bars <= to) continue;
    if (to === 0) parts.splice(parts.indexOf(p), 1);
    else p.bars = to;
  }
  // Grow: whole steps while they fit, cycling the list until nothing more will go in. A
  // style may grow its own way (Kraftwerk keeps its four-bar intro).
  let grew = true;
  while (sum() < total && grew) {
    grew = false;
    for (const [role, to] of style?.form?.grow || GROW) {
      const p = find(role);
      if (!p) continue;
      const step = STEP[role] || 4;
      if (p.bars + step <= to && sum() + step <= total) { p.bars += step; grew = true; }
    }
  }
  // Whatever is left (a remainder of four, or a length past every ceiling) goes to the
  // last drop, as half or whole phrases — the one section that can always take more.
  const drops = parts.filter((p) => DROP_ROLES.has(p.role));
  const last = drops[drops.length - 1] || parts[parts.length - 1];
  if (sum() < total) last.bars += total - sum();
  // The key lift belongs to the final drop — drop three, or drop two without it — and
  // to the reprise after a false ending, which plays that drop again.
  const liftRole = find('drop3') ? 'drop3' : find('drop2') ? 'drop2' : null;
  let bar = 1;
  let lifting = false;
  return parts.map((p) => {
    if (p.role === liftRole) lifting = true;
    if (p.role === 'outro') lifting = false;
    const label = (layered && LAYERED_LABELS[p.role])
      || (options.form.grooveIntro && p.role === 'intro' && 'Drums & Bass')
      || style?.sectionLabels?.[p.role] || SECTION_LABELS[p.role];
    const out = {
      role: p.role, label, bars: p.bars, from: bar, to: bar + p.bars - 1,
      lifted: lifting && (DROP_ROLES.has(p.role) || p.role === 'false'),
    };
    bar += p.bars;
    return out;
  });
}

/** The section a bar (from 1) is in. */
export const sectionAt = (form, bar) => form.find((s) => bar >= s.from && bar <= s.to) || null;
