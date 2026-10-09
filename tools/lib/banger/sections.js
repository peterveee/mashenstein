// MAKE A BANGER — the sections, bar by bar. ABSOLUTE ZERO's builders, made general.
//
// Every bar is written against ROLES, not lanes: `hook`, `square`, `saws`, `kick`,
// `riff:lead2` … `lanes.js` decides afterwards which lane each role lands on. That keeps
// the music here and the plumbing there.
//
// The whole song is a list of bars plus a list of EVENTS — where the builds are, where a
// drop lands, where the stops and the throws go — which `fx.js` turns into automation.
// Browser-safe: no `node:*` imports.
import {
  P, blank, clonePart, shift, legato, diatonic, octaves, cut, augment, bassBar, padBar,
  chordBar, arpBar, ARP_FIGURES, BASS_FIGURES, BASS_LIFTS, openVoicing, parseChord, withQuality, nameOf, midi, hasNotes, isDrumPart, overlay,
  chordSym, clampMidi, fitToChords, clearUnder, acidLine, acidMarks, acidBar,
} from './theory.js';
import { Rng } from '../../../src/engine/rng.js';
import { moodLifts } from './moods.js';
import { moodBass } from './options.js';
import { fillIn, passFilled } from './embellish.js';
import { romanChord, partWeights, chordFit, bestChord, triadOf, chordsOfBar, fitsScale, grindShare } from './analyse.js';
import { hookCell, phrasePlan, realise, head, cellLength, fragment } from './variation.js';
import { variedWay } from './breakdown-ways.js';
import { BUILD_WAYS, DROP_IN_WAYS, buildsNotAfter, dropInsNotAfter } from './build-ways.js';
import { drawWay } from './ways.js';
import { pitchesOf } from './cohesion.js';
import { DROP_ROLES, DEFAULT_LAYERS, DEFAULT_GROOVE, layersOn, scriptOn } from './form.js';
import { DROP_INDEX } from './form-types.js';
import { songMaterial } from './cohesion.js';
import { arrangeEnergy } from './energy.js';
import { planTransitions, withPickup, cutAny } from './transitions.js';

const LIFT_SEMIS = { none: 0, half: 1, whole: 2, third: 4 };

/** The core drum roles a riff's own drums can stand in for, by the lane they came from. */
const CORE_OF = { kick: 'kick', snare: 'clap', clap: 'clap', hats: 'hats', ohats: 'ohats' };
/** Roles that are PITCHED — what a key lift moves. */
const PITCHED = new Set(['hook', 'square', 'bell', 'megaSaw', 'arp', 'choir', 'third', 'counter',
  'bass', 'sub', 'saws', 'pad', 'piano', 'sonar', 'vocoder', 'word']);

/**
 * A chord coloured the way the mood colours chords: moody turns triads into sevenths,
 * uplifting adds a ninth to the major ones. Bass lines and arps keep the plain triad. A
 * colour that would bring in a note from outside the key — a minor seventh on the tonic
 * of harmonic minor — is left off, so the mode stays the mode.
 */
function colour(sym, mood) {
  const { quality } = parseChord(sym);
  const want = mood.colour?.[quality];
  if (want == null || want === quality) return sym;
  const coloured = withQuality(sym, want);
  return !mood.fits || mood.fits(coloured) ? coloured : sym;
}
const colourAll = (c, mood) => (Array.isArray(c) ? c.map((x) => colour(x, mood)) : colour(c, mood));
const triads = (c) => (Array.isArray(c) ? c.map(triadOf) : triadOf(c));

/**
 * The chord (or the pair of half-bar chords) under one bar of hook. The mood's chord is
 * the first choice and is kept wherever the hook sits on it; otherwise the chord that
 * fits the hook. `riffChord` is the riff's own chord for a bar played as written.
 */
function chordsUnder(hookPart, numerals, ctx, { riffChord = null, turn = false } = {}) {
  const { key, candidates, dominant } = ctx;
  const syms = numerals.map((nm) => romanChord(nm, key));
  const pool = [...new Set([...candidates, ...syms.map(triadOf)])];
  if (turn) {
    const first = bestChord(partWeights(hookPart, 'hook', 0), pool, { [triadOf(syms[0])]: 0.25 }).sym;
    return first === dominant ? dominant : [first, dominant];
  }
  if (syms.length === 2) {
    const fits = [0, 1].map((h) => {
      const w = partWeights(hookPart, 'hook', h);
      return w.w.some((x) => x > 0) ? chordFit(w, syms[h]) : 1;
    });
    if (fits.every((f) => f >= 0.2)) return syms;
  }
  const bonus = { [triadOf(syms[0])]: 0.25 };
  // A chord borrowed from the riff's own key (Riff Notes kept against a new mode) is there
  // for when the riff needs it, not as a first choice: the mode's own wins a tie.
  for (const c of pool) if (ctx.modeChords && !ctx.modeChords.includes(c)) bonus[c] = (bonus[c] || 0) - 0.08;
  // The riff's own chord for a bar played as written — a pair when the riff changes
  // chord on the half, which the split below finds again from the notes.
  for (const c of [].concat(riffChord || [])) bonus[c] = (bonus[c] || 0) + (ctx.options.variation === 'faithful' ? 0.3 : 0.15);
  const picked = chordsOfBar((half) => partWeights(hookPart, 'hook', half), pool, bonus);
  // The mood's own chord won: play it AS WRITTEN. The pool only holds triads, and a quality
  // on a numeral (Soulful's I7, Mystery's i(maj7) and i6, Lounge's VI7) is part of the
  // mood, not a colour — the mood's colour would make I7 a maj7 and the line cliché four
  // bars of one chord (6 Oct 2026). Not where the hook leans on a note the quality takes
  // away, or sits a semitone from one it adds.
  if (syms.length === 1 && picked === triadOf(syms[0]) && syms[0] !== picked && !hookClashes(hookPart, syms[0], picked)) return syms[0];
  return picked;
}

/** Whether the hook fights what a quality does to a triad: leans on a note it drops, or rubs a semitone against one it adds. */
function hookClashes(hookPart, written, triad) {
  const { w } = partWeights(hookPart, 'hook', null);
  const has = parseChord(written).pcs, plain = parseChord(triad).pcs;
  const added = has.filter((pc) => !plain.includes(pc));
  if (plain.some((pc) => !has.includes(pc) && w[pc] > 0)) return true;
  return added.some((pc) => [11, 1].some((d) => { const n = (pc + d) % 12; return !has.includes(n) && w[n] > 0; }));
}

/**
 * A counter-line in the hook's rests: chord tones on the off-beat eighths, each the
 * nearest to the one before — a new line, never a reshaped copy of the hook.
 */
function counterLine(hookPart, chords, prev) {
  const out = blank();
  const sounding = new Array(16).fill(false);
  hookPart.notes.forEach((v, i) => {
    if (v == null) return;
    const len = Math.max(1, Math.round(hookPart.lens[i] ?? 1));
    for (let j = i; j < Math.min(16, i + len); j++) sounding[j] = true;
  });
  let last = prev.value;
  const cs = Array.isArray(chords) ? chords : [chords];
  for (const step of [2, 6, 10, 14]) {
    if (sounding[step]) continue;
    const sym = cs[Math.min(cs.length - 1, Math.floor(step / (16 / cs.length)))];
    const { pcs } = parseChord(sym);
    let best = null;
    for (let m = 62; m <= 81; m++) {
      if (!pcs.includes(m % 12)) continue;
      const d = Math.abs(m - last) + (m === last ? 2 : 0);
      if (!best || d < best.d) best = { m, d };
    }
    out.notes[step] = nameOf(best.m);
    out.lens[step] = 2;
    last = best.m;
  }
  prev.value = last;
  return out;
}

/** A breakdown's own Plays choice (form-types.js variants) → the way it plays: its id, else these. */
const BREAKDOWN_VARIANTS = { pedal: 'half' };
/** The ways the trance piano plays the hook as written on, whatever their line — as it always has. */
const PIANO_AS_WRITTEN = new Set(['half', 'written', 'exposed']);

/**
 * BREAKDOWN HOOK (breakdown-ways.js) — each way's line, bar `i` of an `n`-bar breakdown: `tune`, what
 * the hook plays (the chord under the bar is chosen to fit it), and for a way with another part,
 * `extra(c)` → [role, part] over the chord the bar settles on. `k` is the breakdown's material:
 * `cell` (the hook's bars), `aug` (them at half speed), `up` (into a lead's register), `scale`.
 */
export const BREAKDOWN_LINES = {
  half: ({ i, k }) => ({ tune: k.aug[i % k.aug.length] }),
  written: ({ i, k }) => ({ tune: clonePart(k.cell[i % k.cell.length]) }),
  exposed: ({ i, k }) => ({ tune: clonePart(k.cell[i % k.cell.length]) }),
  none: () => ({ tune: blank() }),
  // The hook's opening (its first half bar, to the note on beat three) every other bar, then every
  // bar for the last quarter — echoed (fx.js BREAKDOWN_FX). The drop gets the whole hook back.
  tease: ({ i, n, k }) => ({ tune: i % 2 === 0 || i >= n - Math.max(1, Math.floor(n / 4)) ? head(k.cell[0]) : blank() }),
  // Nothing until the last two bars (one, in a short breakdown): the hook's first two, as written.
  late: ({ i, n, k }) => {
    const from = n - Math.min(n, n >= 8 ? 2 : 1);
    return { tune: i >= from ? clonePart(k.cell[(i - from) % k.cell.length]) : blank() };
  },
  outline: ({ i, k }) => ({ tune: outlineOf(k.cell[i % k.cell.length]) }),
  piano: ({ i, k }) => ({ tune: k.up(clonePart(k.cell[i % k.cell.length])) }),
  // The middle 8's way (cohesion.js bridgeLine): the hook's tail motif sequenced, the head as the
  // pickup out of it.
  tune: ({ i, n, k }) => ({
    tune: i === n - 1 ? head(k.cell[0])
      : diatonic(fragment(i % 2 ? k.cell[i % k.cell.length] : k.cell[k.cell.length - 1], k.scale), [0, 0, 2, 2, -1, -1, 1, 1][Math.floor((i * 8) / n) % 8], k.scale),
  }),
  arp: ({ i, k }) => ({ tune: arpOfHook(k.cell[i % k.cell.length]) }),
  // The hook for a bar, then its opening on the bell an octave up, fitted to the next bar's chord.
  answer: ({ i, k }) => {
    const call = k.cell[Math.floor(i / 2) % k.cell.length];
    return i % 2 === 0 ? { tune: clonePart(call) }
      : { tune: blank(), extra: (c) => ['bell', fitToChords(shift(k.up(head(call)), 12), c)] };
  },
  // As written, under a low-pass that opens across the breakdown (fx.js BREAKDOWN_FX).
  muffled: ({ i, k }) => ({ tune: clonePart(k.cell[i % k.cell.length]) }),
};

/**
 * BUILD TYPE (build-ways.js) — each way's drums for bar `i` of an `n`-bar build, as patterns by role
 * (a pattern of the style's own, or one written here). Snare Roll and Hook Loop are the classic roll,
 * written where the build is. `D` is the style's drums; `rolls` the Rolls switch.
 */
export const BUILD_DRUMS = {
  // The kick doubling up — the style's own for the first half, eighths, sixteenths for the last bar.
  kick: ({ i, n, D, rolls }) => ({
    kick: !rolls || i < n / 2 ? D.kick : i === n - 1 ? 'xxxxxxxxxxxxxxxx' : 'x.x.x.x.x.x.x.x.',
    clap: i < n - 1 ? D.clap : null,
    hats: i < n / 2 ? D.hats8 : D.hats16,
  }),
  // The snare in quarters, then dotted eighths (three against the beat), then sixteenths.
  dotted: ({ i, n, D, rolls }) => ({
    kick: D.kick,
    clap: i < n / 2 ? D.clap : null,
    snare: !rolls ? null : i === n - 1 ? 'xxxxxxxxxxxxxxxx' : i < n / 4 ? 'x...x...x...x...' : 'x..x..x..x..x..x',
    hats: i < n / 2 ? D.hats8 : D.hats16,
  }),
  // The drop's groove, steady — the climb is the low-pass opening over the whole mix (fx.js).
  muffled: ({ i, n, D }) => ({ kick: D.kick, clap: D.clap, hats: i < n / 2 ? D.hats8 : D.hats16 }),
  drumless: () => ({}),
};

/**
 * The opening of a bar of hook — `len` steps from its first note — looped across the bar: Hook Loop's
 * bar, `left` bars from the drop (half a bar, a beat near the end, half a beat in the last bar).
 */
export function hookLoop(part, left, n) {
  const len = left === 1 ? 2 : left <= Math.max(1, Math.floor(n / 4)) + 1 ? 4 : 8;
  const f = part.notes.findIndex((v) => v != null);
  const out = blank();
  if (f < 0) return out;
  for (let s = 0; s < 16; s++) {
    const src = f + (s % len);
    if (src >= 16 || part.notes[src] == null) continue;
    out.notes[s] = part.notes[src];
    out.lens[s] = Math.min(part.lens[src] ?? 1, len - (s % len));
  }
  return out;
}

/** One bar of hook broken into running sixteenths: its notes, low to high, round and round. */
export function arpOfHook(part) {
  const ms = [...new Set(part.notes.flatMap((v) => (v == null ? [] : Array.isArray(v) ? v : [v])).map(midi))].sort((a, b) => a - b).slice(0, 4);
  if (!ms.length) return blank();
  if (ms.length === 1) ms.push(ms[0] + 12);
  const out = blank();
  for (let s = 0; s < 16; s++) { out.notes[s] = nameOf(ms[s % ms.length]); out.lens[s] = 1; }
  return out;
}

/**
 * One bar of hook as its outline: a long note on each half — the note sounding on the beat (struck
 * on it or still ringing over it), else the half's first — and one held note where both are the same.
 */
export function outlineOf(part) {
  const out = blank();
  for (const h of [0, 8]) {
    let pick = null;
    for (let s = h; s >= 0; s--) {
      if (part.notes[s] == null) continue;
      if (s + (part.lens[s] ?? 1) > h) pick = part.notes[s];
      break;
    }
    for (let s = h; pick == null && s < h + 8; s++) if (part.notes[s] != null) pick = part.notes[s];
    if (pick != null) { out.notes[h] = pick; out.lens[h] = 8; }
  }
  if (out.notes[0] != null && JSON.stringify(out.notes[0]) === JSON.stringify(out.notes[8])) {
    out.notes[8] = null; out.lens[8] = null; out.lens[0] = 16;
  }
  return out;
}

/**
 * The song, as bars of roles. Returns `{ bars, events }`.
 *
 * `ctx` carries everything a section needs: the options, the style, the key, the hook
 * cell, the riff's parts, the form, the rng streams.
 */
export function buildSections(ctx) {
  const { options, style, form, key, analysis, riffParts, hookPart, rng } = ctx;
  // A chord is in the key if it is in the mode — or, when the riff keeps its own notes,
  // in the riff's own key, whose chords it borrows.
  const inKey = (sym) => fitsScale(sym, key.scale) || (!!key.own && fitsScale(sym, key.own.scale));
  // The mood, told which notes the key has, so its colours never step outside it. A mode
  // beyond major and minor brings its own chord walks (the recipe's modeHarmony), bright
  // or dark as the mood leans; otherwise the mood's own progression.
  //
  // A SECOND MOOD (Second Mood, Switch At) takes over part of the song: these are set
  // again at the top of every section (useMood), so everything built inside a section —
  // its chords, their colours, its bass figure, the way its key lift arrives — is that
  // section's mood. The SOUNDS are not touched: they were chosen for the first mood
  // (index.js), and stay.
  const moodState = (id) => {
    const m = { ...(style.moods[id] || style.moods.anthemic), fits: inKey };
    const mh = style.modeHarmony?.[key.mode]?.[m.walk || 'bright'] || null;
    const tpl = mh?.progression || (style.progressions[id] || style.progressions.anthemic)[key.minor ? 'minor' : 'major'];
    return { id, mood: m, modeHarmony: mh, template: tpl };
  };
  const firstMood = moodState(options.mood);
  const secondId = options.form.mood2 && options.form.mood2 !== 'none' && options.form.mood2 !== options.mood ? options.form.mood2 : null;
  const secondMood = secondId ? moodState(secondId) : null;
  // Where it takes over: from the first breakdown or middle 8 on; from the last drop or
  // chorus on; or the drops and choruses alone. No break in the form — the final chorus.
  const HOOK_ROLES = new Set([...DROP_ROLES, 'false']);
  // A form with no drops (Groove) has its fullest sections (`hook`) for choruses (7 Oct 2026: a
  // mood pair switched only on the very last section there, or never).
  const dropless = !form.some((s) => DROP_ROLES.has(s.role));
  const switchFrom = (() => {
    if (!secondId) return Infinity;
    const how = options.form.moodSwitch || 'breakdown';
    const lastHook = form.reduce((at, s, i) => (DROP_ROLES.has(s.role) || (dropless && s.hook) ? i : at), form.length - 1);
    if (how === 'breakdown') {
      const brk = form.findIndex((s) => s.role === 'breakdown' || s.role === 'middle8');
      return brk >= 0 ? brk : lastHook;
    }
    return how === 'final' ? lastHook : Infinity;
  })();
  const secondAt = (sec, si) => !!secondId && (options.form.moodSwitch === 'choruses' ? HOOK_ROLES.has(sec.role) || (dropless && !!sec.hook) : si >= switchFrom);
  // The bass a mood suggests follows the mood; a bass picked by hand stays.
  const moodsBass = options.parts.bass === moodBass(style, options.mood);
  let mood = firstMood.mood;
  let modeHarmony = firstMood.modeHarmony;
  let template = firstMood.template;
  let moodId = options.mood;
  let bassId = options.parts.bass;
  const useMood = (sec, si) => {
    const m = secondAt(sec, si) ? secondMood : firstMood;
    ({ mood, modeHarmony, template, id: moodId } = m);
    bassId = moodsBass ? moodBass(style, moodId) : options.parts.bass;
  };
  const D = style.drums;
  const R = style.rhythms;
  const C = style.centres;
  const total = form[form.length - 1].to;
  // Build in Layers, where it applies (Long Songs: only past 64 bars).
  const inLayers = layersOn(options.form, total);
  const bars = Array.from({ length: total }, () => ({}));
  // `${bar0}:${role}` for a chord part playing the riff as written — what voice-leading.js leaves alone.
  const asWritten = new Set();
  const events = {
    builds: [], drops: [], stops: [], throws: [], intro: null, risers: [], finalDrops: [], octaveBars: [],
    echoes: [], filterDowns: [], fadeOuts: [], trims: [], sweeps: [], transitions: [], breakdowns: [],
  };
  // Breakdown Hook: Varied — one way for the whole take, off a stream of its own, so drawing it
  // moves nothing else (breakdown-ways.js).
  const breakdownWay = variedWay(rng.breakdown, { soundSet: !!options.parts.soundSet && options.parts.soundSet !== 'style' });
  // Build Type and Before the Drop: Varied draws one for each build, off streams of their own (one
  // per build, so a second build never moves the first), never the same as the build before.
  const drawn = { build: [], dropIn: [] };
  const wayOf = (kind, asked, table, exclude = []) => {
    const w = asked === 'varied' ? drawWay(table, rng[kind].stream(String(drawn[kind].length)), { not: drawn[kind].at(-1), exclude }) : asked;
    drawn[kind].push(w);
    return w;
  };
  const BUILD_IDS = new Set(BUILD_WAYS.map((w) => w.id));
  // The builds' last bars, each changed once the drop after it is made (applyDropIn).
  const dropIns = [];
  /**
   * BEFORE THE DROP — a build's last bar (`bar0`) played the way `way` says, into the drop `next`.
   * A way that silences the bar's end silences the build's run-up effect with it (fx.js).
   */
  const applyDropIn = ({ bar0, next, build, way }) => {
    const bar = bars[bar0];
    build.dropIn = way;
    const cutAll = (at, keep = []) => {
      for (const role of Object.keys(bar)) if (role !== 'riser' && !keep.includes(role)) bar[role] = cutAny(bar[role], at);
    };
    if (way === 'gap' || way === 'pause') {
      const at = way === 'gap' ? 12 : 8;
      cutAll(at);
      events.stops.push({ bar: bar0 + 1, step: at });
      build.runup = false;
    } else if (way === 'dropout') {
      for (const role of ['kick', 'bass', 'sub', 'clap']) if (bar[role]) bar[role] = cutAny(bar[role], 8);
    } else if (way === 'pickup') {
      // The walk is chosen over the chord still sounding, before the rest stops.
      const first = bars[next.from - 1]?.hook;
      const target = first && pitchesOf(first)[0];
      const hook = target ? withPickup({ ...bar, hook: bar.hook && cut(bar.hook, 12) }, target, ctx.scale || key.scale) : bar.hook && cut(bar.hook, 12);
      cutAll(12, ['hook']);
      if (hook) bar.hook = hook;
      build.runup = false;
    } else if (way === 'solo') {
      for (const role of Object.keys(bar)) if (role !== 'riser' && role !== 'hook') delete bar[role];
      build.runup = false;
    }
  };
  const put = (bar0, role, part) => {
    if (part == null || !hasNotes(part)) return;
    const prev = bars[bar0][role];
    bars[bar0][role] = prev ? overlay(prev, part) : part;
  };

  // ---- the riff's own parts
  const L0 = hookPart.parsed.length;
  const cell = hookCell(hookPart.parsed, options.variation, analysis.tonicChord);
  const CL = cellLength(L0);
  // FILL IN (embellish.js): the hook filled in, played on the passes Fill Every names —
  // bar `at` of a section is on pass floor(at / cell). The chords are still chosen under
  // the plain tune, so a fill decorates the harmony rather than moving it.
  const fillHow = options.parts.fillIn && options.parts.fillIn !== 'off' ? options.parts.fillIn : null;
  const filledRiff = fillHow ? fillIn(hookPart.parsed, fillHow, ctx.scale || key.scale, options.parts.fillNotes) : null;
  const filledCell = fillHow ? hookCell(filledRiff, options.variation, analysis.tonicChord) : null;
  const filledAt = (at, passBars = CL) => !!fillHow && at != null && passFilled(at, passBars, options.parts.fillEvery);
  const flip = rng.harmony.next() < 0.5;
  const riffDrums = riffParts.filter((p) => p.kind === 'drum');
  const source = options.drums.source;
  const useRiffDrums = source !== 'replace' && riffDrums.length > 0;
  // The core roles the riff's own drums play, when they are busy enough to carry one.
  const coreFromRiff = new Map();
  if (useRiffDrums) {
    for (const p of riffDrums) {
      const role = CORE_OF[p.key.replace(/\d+$/, '')];
      if (!role || coreFromRiff.has(role)) continue;
      const hits = p.parsed.reduce((s, b) => s + b.filter(Boolean).length, 0);
      if (source === 'asis' || hits / p.parsed.length >= 2) coreFromRiff.set(role, p);
    }
  }
  const asIs = source === 'asis' && riffDrums.length > 0;
  ctx.coreFromRiff = coreFromRiff;
  // The riff's other drums: in the intro and outro all of them play as written; in the
  // drops only the ones on lanes the recipe has no part for (a rim, a tom, a crash) — a
  // sparse riff kick under four on the floor would only flam against it.
  const coreParts = [...coreFromRiff.values()];
  const riffDrumAll = useRiffDrums ? riffDrums.filter((p) => !coreParts.includes(p)) : [];
  const riffDrumExtras = riffDrumAll.filter((p) => !CORE_OF[p.key.replace(/\d+$/, '')]);
  const riffHasDrum = (base) => useRiffDrums && riffDrums.some((p) => p.key.replace(/\d+$/, '') === base);
  // A hook in the bass register IS the bass: no second bass line under it, and the parts
  // that double it come up to where a lead sits.
  const hookMean = hookPart.meanPitch ?? 60;
  const hookIsBass = hookMean < 52;
  const lift8 = hookMean < 55 ? 12 * Math.ceil((60 - hookMean) / 12) : 0;
  const up = (part) => (lift8 ? shift(part, lift8) : part);
  const riffSupport = riffParts.filter((p) => p.role !== 'hook' && p.kind !== 'drum');
  const riffCounters = riffSupport.filter((p) => p.role === 'counter');
  // Riff Bass = Keep: the riff's own bassline plays wherever the hook plays as written (or
  // cut short) — the bars whose chords are the riff's — in place of the generated bass and
  // sub. Where the hook is varied, moved or set over other chords, the Bass setting plays.
  const riffBasses = options.parts.riffBass === 'keep' ? riffSupport.filter((p) => p.role === 'bass') : [];
  /** The riff's own bass for a phrase bar played as written, or null. */
  const ownBass = (pb, k = null) => {
    if (!riffBasses.length || !(pb.op === 'as' || pb.op === 'cut')) return null;
    return riffBasses.map((rp) => [`riff:${rp.key}`, clonePart(rp.parsed[(k ?? pb.src) % L0])]);
  };

  // A recipe's drum pattern is one bar, or a list of bars played in turn (hat rolls on
  // every other bar, a kick that answers itself).
  const at = (pattern, i) => (Array.isArray(pattern) ? pattern[i % pattern.length] : pattern);
  /** A core drum role's bar: the recipe pattern, or the riff's own groove standing in. */
  const drum = (role, pattern, barInSection) => {
    const sub = coreFromRiff.get(role);
    if (sub) return clonePart(sub.parsed[barInSection % sub.parsed.length]);
    if (asIs) return null;
    const one = at(pattern, barInSection);
    return one ? P(one) : null;
  };

  /** The riff as written, cycled over a stretch — the intro and the outro. */
  const riffAsWritten = (from, count) => {
    for (let i = 0; i < count; i++) {
      const rb = i % L0;
      put(from + i, 'hook', clonePart((filledAt(i, L0) ? filledRiff : hookPart.parsed)[rb]));
      for (const p of riffSupport) put(from + i, `riff:${p.key}`, clonePart(p.parsed[rb]));
      for (const p of riffDrumAll) put(from + i, `riff:${p.key}`, clonePart(p.parsed[rb]));
    }
  };
  const lowerBass = (c, pat, floor) => bassBar(triads(c), pat, floor);
  // `RR` is the bass rhythms in force: the style's own, or a half-time drop's (below).
  // `dropIndex` 1 and on is a later drop: with Bass Lifts on, it moves to the bass's lift
  // (Off-Beat → Octave Eighths …) — unless the style's bass is its signature (`bassFixed`).
  // ACID (9 Oct 2026): one 303 line for the take (theory.js acidLine), from a seed of its own
  // stream, its accents and slides drawn again for every eight-bar phrase — each phrase's from a
  // seed of its own too, so a bar's line never depends on which bars were made before it.
  let acid = null;
  const acidPart = (c, bar0) => {
    if (!acid) {
      const seed = Math.floor((rng.acid ? rng.acid.next() : 0.5) * 2 ** 31);
      const line = new Rng(seed);
      acid = { seed, notes: acidLine(() => line.next()), marks: new Map() };
    }
    const half = bar0 % 2 ? 'b' : 'a';
    const phrase = Math.floor(bar0 / 8);
    const key = `${phrase}${half}`;
    if (!acid.marks.has(key)) {
      const r = new Rng((acid.seed + 7919 * (phrase + 1) + (half === 'b' ? 104729 : 0)) >>> 0);
      acid.marks.set(key, acidMarks(() => r.next(), acid.notes[half]));
    }
    return acidBar(triads(c), acid.notes[half], acid.marks.get(key), C.bassFloor);
  };
  // `bar0` is the bar the line is for — only the acid line, which evolves by phrase, reads it.
  const bassLine = (c, RR = R, dropIndex = 0, bar0 = 0) => {
    if (hookIsBass) return null;
    let id = bassId;
    if (id === 'sub' || id === 'none') return null;
    if (dropIndex >= 1 && options.parts.bassLift && !style.bassFixed) {
      id = (BASS_LIFTS[id] ?? BASS_FIGURES.find((f) => f.id === id)?.lift) || id;
    }
    if (id === 'rolling') return lowerBass(c, RR.rolling, C.bassFloor);
    const fig = BASS_FIGURES.find((f) => f.id === id);
    if (!fig) return lowerBass(c, RR.offbeat, C.bassFloor);
    if (fig.acid) return acidPart(c, bar0);
    return fig.tonic ? bassBar(analysis.tonicChord, fig.pat, C.bassFloor) : lowerBass(c, fig.pat, C.bassFloor);
  };
  const subLine = (c, RR = R) => {
    if (options.parts.bass === 'none') return null;
    // A style whose sub layer is a wobble (future bass) drops it under a riff that is the
    // bass: there is no 808 then, and the wobble would be all the low end there was.
    if (hookIsBass && style.wobbleSub) return null;
    if (options.parts.bass === 'sub') return lowerBass(c, RR.sub, C.subFloor);
    return options.parts.sub ? lowerBass(c, RR.subOff, C.subFloor) : null;
  };
  // A style that plays CHORD MEMORY (`style.chordMemory`, a shape such as 'm7') stabs that one
  // shape on every chord's root — the mood still chooses the roots, the shape is the style's. Its
  // main chord part only; the pad and the choir under it keep their chords (theory.js voicing).
  // `chordMemory` may instead name it MOOD BY MOOD ({ moody: 'm9', … }, 9 Oct 2026: Peter, "let moods
  // pick the memory chord" for Deep House and Afro House): the section's mood decides.
  const memoryNow = () => (typeof style.chordMemory === 'string' ? style.chordMemory : style.chordMemory?.[moodId] || null);
  const chordPart = (c) => {
    const memory = memoryNow();
    const cc = memory ? c : colourAll(c, mood);
    const mem = memory ? { memory } : {};
    switch (options.parts.chords) {
      case 'piano': return chordBar(cc, R.pianoStabs, C.piano, mem);
      // Supersaw Stabs: the piano's stab rhythm on the supersaws, in their register.
      case 'stabs': return chordBar(cc, R.pianoStabs, C.saws, mem);
      case 'pad': return padBar(cc, C.pad, mem);
      case 'none': return null;
      default: return padBar(cc, C.saws, { drop: true, ...mem });
    }
  };
  const chordRole = options.parts.chords === 'none' ? null : options.parts.chords === 'stabs' ? 'saws' : options.parts.chords;
  // The arp's figure, section by section. Varied: the style's own in the first build and
  // the first drop, then a different figure for each build and drop after — never the one
  // just played. A style that fixes its arp (`arpFixed`) always plays its own.
  const ownArp = R.arp;
  const arpPlan = new Map();
  {
    const choice = options.parts.arpPattern || 'vary';
    const pool = ARP_FIGURES.map((f) => f.idx).filter((x) => x !== ownArp);
    let prev = ownArp; let firstBuild = true; let firstDrop = true;
    for (const sec of form) {
      const isBuild = sec.role === 'build' || sec.role === 'build2';
      const isDrop = DROP_ROLES.has(sec.role);
      if (!isBuild && !isDrop) continue;
      let idx = ownArp;
      if (style.arpFixed || choice === 'style') idx = ownArp;
      else if (choice !== 'vary') idx = ARP_FIGURES.find((f) => f.id === choice)?.idx || ownArp;
      else if (!((isBuild && firstBuild) || (isDrop && firstDrop))) {
        const fresh = pool.filter((x) => x !== prev);
        idx = fresh[Math.floor(rng.arps.next() * fresh.length)];
      }
      if (isBuild) firstBuild = false;
      if (isDrop) firstDrop = false;
      prev = idx;
      for (let b = sec.from - 1; b < sec.to; b++) arpPlan.set(b, idx);
    }
  }
  const arp = (c, b) => arpBar(triads(c), arpPlan.get(b) || ownArp, C.arp, 1);
  const choirPart = (c) => padBar(colourAll(c, mood), C.choir);
  // The counter part: a new line in the hook's rests — or, for a style that answers with
  // chord stabs on a rhythm of its own (eurobeat's brass), triads on that rhythm; or single
  // chord tones on a figure of its own (Kraftwerk's calculator bleeps), which play whether
  // the hook leaves rests or not.
  //
  // The line REPEATS with the hook: the same hook bar over the same chords gets the same
  // answer, remembered from the first time it was played. Chained bar to bar it was a new
  // line every time — the same tune answered differently on every pass, which sounds
  // generated rather than written. Only new material is led on from the bar before.
  const counterPart = (tune, c) => {
    if (R.counterStabs) return chordBar(triads(c), R.counterStabs, C.stabs || 'B4');
    if (R.counterFigure) return arpBar(triads(c), R.counterFigure, C.counter || 'A5', 1);
    const key = JSON.stringify([tune.notes, tune.lens, c]);
    let line = counterMemo.get(key);
    if (!line) counterMemo.set(key, line = counterLine(tune, triads(c), counterPrev));
    else {
      const last = line.notes.findLast((v) => v != null);
      if (last != null) counterPrev.value = midi(last);
    }
    return clonePart(line);
  };
  const fillPick = () => D.fills[Math.floor(rng.drums.next() * D.fills.length)];

  // ---- the drop's harmony and hook, per phrase, computed once per drop section
  const tplBar = (i) => template[i % template.length];
  /** One phrase bar: the hook as the plan has it, and the chords under it. */
  const phraseBar = (phrase, i, dropIndex, at = null) => {
    const plan = phrasePlan(CL, options.variation, phrase + dropIndex, flip);
    const step = plan[i];
    const plainPart = realise(cell, step, ctx);
    const part = filledAt(at) ? realise(filledCell, step, ctx) : plainPart;
    const op = step[1];
    const riffChord = op === 'as' ? analysis.riffChords[step[0] % L0] ?? null : null;
    const chords = chordsUnder(plainPart, tplBar(i), ctx, { riffChord, turn: op === 'turn' });
    return { part, chords, src: step[0], op };
  };

  // ---- one bar of a drop
  // When each optional part joins drop one, by phrase — the bell and the counter-line from
  // the second, the percussion from the second, the arp from the fourth — unless the style
  // says otherwise (`enter`). From drop two on, everything is in from the start.
  const ENTER = { bell: 1, counter: 1, perc: 1, arp: 3, ...(style.enter || {}) };
  const joined = (part, p, dropIndex, layered = false) => layered || dropIndex >= 1 || p >= ENTER[part];
  /**
   * A phrase of `len` bars plays the plan's bars in this order: a half phrase its first
   * three and its turnaround; an odd-length one (a drawn form's six bars) its first bars
   * and its turnaround last.
   */
  const planIndex = (len, k) => (len === 8 ? k : len <= 4 ? [0, 1, 2, 7][k] : k === len - 1 ? 7 : k);
  /**
   * The music of one drop bar: the hook and everything doubling it, the chords, the bass,
   * the kit. `s` says where — phrase `p`, bar `k` of it (`i` in the phrase plan), which
   * drop, whether it is the final one, the drum patterns and bass rhythms in force, the
   * bar's half-time, fill and hard-stop state. A LAYERED bar (`s.layered`) is drop one's
   * music with every part already joined; which of them sound is the layers' business.
   */
  const dropBar = (b, s) => {
    const { p, k, i, dropIndex, final, DD, RR, half, fill, fillHere, stopHere, layered = false } = s;
    const pb = phraseBar(p, i, dropIndex, p * 8 + k);
    const tune = pb.part;
    const c = pb.chords;
    const st = (part) => (stopHere ? cut(part, 12) : part);
    put(b, 'hook', st(options.parts.octaveDouble && final ? octaves(tune) : tune));
    if (options.parts.octaveDouble && final) events.octaveBars.push(b + 1);
    if (options.parts.square) put(b, 'square', st(up(tune)));
    if (options.parts.bell && joined('bell', p, dropIndex, layered)) put(b, 'bell', st(shift(up(tune), 12)));
    if (dropIndex >= 1) put(b, 'megaSaw', st(shift(legato([up(tune)], 0, 3)[0], 12)));
    if (options.parts.arp && joined('arp', p, dropIndex, layered)) put(b, 'arp', st(arp(c, b)));
    // the third below is the hook moved, so it is fitted to the chord: a scale third can land on a grind
    if (options.parts.thirdBelow && (dropIndex === 1 || final)) put(b, 'third', st(fitToChords(diatonic(up(tune), -2, ctx.scale), c)));
    if (options.parts.choir && final) put(b, 'choir', st(choirPart(c)));
    if (options.parts.counter && joined('counter', p, dropIndex, layered)) put(b, 'counter', st(counterPart(up(tune), c)));
    // The riff's own counter-lines go where the hook is played as written or
    // sequenced — moved with it, so the two still agree.
    for (const rp of riffCounters) {
      if (pb.op === 'as') put(b, `riff:${rp.key}`, st(clonePart(rp.parsed[pb.src % L0])));
      else if (pb.op === 'k2' || pb.op === 'k4') put(b, `riff:${rp.key}`, st(diatonic(rp.parsed[pb.src % L0], pb.op === 'k2' ? 2 : 4, ctx.scale)));
    }
    if (chordRole) put(b, chordRole, st(chordPart(c)));
    // A style whose pad holds under its stabs through the drops (deep house's `padUnder`).
    if (style.padUnder && chordRole && chordRole !== 'pad') put(b, 'pad', st(padBar(colourAll(c, mood), C.pad)));
    const own = ownBass(pb);
    if (own) for (const [role, part] of own) put(b, role, st(part));
    else {
      put(b, 'bass', st(bassLine(c, RR, dropIndex, b)));
      put(b, 'sub', st(subLine(c, RR)));
    }
    // Drums.
    if (stopHere) {
      put(b, 'kick', drum('kick', 'x...x...x.......', k));
      put(b, 'snare', P('........xxxx....'));
      put(b, 'clap', drum('clap', '....x...........', k));
      put(b, 'hats', drum('hats', 'xxxxxxxxxxxx....', k));
    } else {
      put(b, 'kick', drum('kick', half ? DD.halfKick : DD.kick, k));
      put(b, 'clap', drum('clap', half ? DD.halfClap : DD.clap, k));
      put(b, 'snare', P(fillHere ? fill.snare : at(half ? DD.halfClap : DD.clap, k)));
      if (!half) put(b, 'ohats', drum('ohats', DD.ohats, k));
      // A half-time bar's hats: the style's own (`halfHats` — reggaeton's trap rolls), else eighths.
      put(b, 'hats', drum('hats', half ? DD.halfHats || DD.hats8 : DD.hats16, k));
      if (fillHere) put(b, 'fill', P(fill.tom));
    }
  };

  // ---- Build in Layers
  // The parts arriving one at a time (an intro) or leaving one at a time (an outro), in the
  // style's order (`layers`, else form.js's DEFAULT_LAYERS). A layer names roles, or groups:
  // Chords Early (9 Oct 2026): the chords move up to the second layer, wherever the style had them.
  const LAYERS = options.form.chordsEarly ? chordsEarly(style.layers || DEFAULT_LAYERS) : style.layers || DEFAULT_LAYERS;
  const riffDrumRoles = new Set(riffDrums.map((p) => `riff:${p.key}`));
  const GROUP = {
    riff: (r) => r === 'hook' || (r.startsWith('riff:') && !riffDrumRoles.has(r)),
    riffDrums: (r) => riffDrumRoles.has(r),
    chords: (r) => r === 'saws' || r === 'pad' || r === 'piano',
    perc: (r) => ['shaker', 'tambourine', 'congas', 'cowbell', 'ride'].includes(r),
    doubles: (r) => ['square', 'bell', 'megaSaw', 'third', 'choir', 'counter'].includes(r),
  };
  const named = (tokens, role) => tokens.some((t) => t === role || GROUP[t]?.(role));
  /** The layer a role comes with — the last, for a role no layer names. */
  const layerOf = (role) => {
    const li = LAYERS.findIndex((layer) => named(layer, role));
    return li < 0 ? LAYERS.length - 1 : li;
  };
  /**
   * `n` bars of drop one's music from bar `from`, on the style's own patterns, keeping in
   * bar `j` only the roles `keep(role, j)` allows.
   */
  const stretch = (from, n, keep) => {
    for (let p = 0; p * 8 < n; p++) {
      const len = Math.min(8, n - p * 8);
      const fill = fillPick();
      for (let k = 0; k < len; k++) {
        const j = p * 8 + k;
        const b = from + j;
        dropBar(b, {
          p, k, i: planIndex(len, k), dropIndex: 0, final: false, DD: D, RR: R, half: false,
          fill, fillHere: options.drums.fills && k === len - 1, stopHere: false, layered: true,
        });
        for (const name of ['shaker', 'tambourine', 'congas', 'cowbell']) if (options.drums[name]) put(b, name, P(D.perc[name]));
        for (const rp of riffDrumExtras) put(b, `riff:${rp.key}`, clonePart(rp.parsed[k % L0]));
        for (const role of Object.keys(bars[b])) if (!keep(role, j)) delete bars[b][role];
      }
    }
  };
  /**
   * Build in Layers: the layers arriving one at a time — or, `leaving`, going again, last in
   * first out. They come a power-of-two number of bars apart; whatever is left over, the
   * first layer plays alone (at the start arriving, at the end leaving), so everything is in
   * together only for the last stretch before what comes next.
   */
  const layered = (from, n, leaving) => {
    const count = LAYERS.length;
    const gap = 2 ** Math.floor(Math.log2(Math.max(1, n / count)));
    const arrives = (li) => (li === 0 ? 0 : Math.max(0, n - (count - li) * gap));
    const leaves = (li) => (li === 0 ? n : Math.min(n, (count - li) * gap));
    stretch(from, n, (role, j) => (leaving ? j < leaves(layerOf(role)) : j >= arrives(layerOf(role))));
  };
  /**
   * The Drums & Bass Intro: drop one's beat and bass alone (`grooveParts`), so the drop
   * comes in all at once. A hook in the bass register is the bass, and stays.
   */
  const GROOVE = style.grooveParts || DEFAULT_GROOVE;
  const groove = (from, n) => stretch(from, n, (role) => named(GROOVE, role) || (role === 'hook' && hookIsBass));

  const counterPrev = { value: 69 };
  const counterMemo = new Map();
  // How each kind of lifted section is arrived at (moods.js): the same way every time a
  // section of that kind lifts, so a key change is a habit of the song rather than a
  // surprise each time — the mood's own way for the first kind, the next for the next.
  const approachFor = new Map();
  const approachOf = (role) => {
    if (options.form.keyApproach && options.form.keyApproach !== 'mood') return options.form.keyApproach;
    if (!approachFor.has(role)) {
      const lifts = moodLifts(moodId);
      approachFor.set(role, lifts[approachFor.size % lifts.length]);
    }
    return approachFor.get(role);
  };
  /** Every pitched part of a lifted section, up together — the key lift. */
  const liftSection = (sec) => {
    const lift = sec.lifted ? LIFT_SEMIS[options.form.keyLift] || 0 : 0;
    if (!lift) return;
    for (let b = sec.from - 1; b < sec.to; b++) {
      const bar = bars[b];
      for (const role of Object.keys(bar)) {
        if (PITCHED.has(role) || (role.startsWith('riff:') && !isDrumPart(bar[role]))) bar[role] = shift(bar[role], lift);
      }
    }
    // Arriving from a section in the old key: the bar before is the way in.
    const before = sec.from - 2;
    if (before >= 0 && !form.some((x) => x.lifted && x.from - 1 <= before && before <= x.to - 1)) {
      approachLift(bars[before], approachOf(sec.role), (key.tonic + lift) % 12, key.minor);
    }
  };

  // ---- Style's Own Form: the style's script, bar by bar
  // A scripted section (form.js scriptForm) is a run of blocks, each naming what plays from
  // its bar on: `lead` (the hook and its double), `vocoder` (the hook sung — an octave under
  // the lead when both play), `word` (the vocoder saying one word: the phrase's first note
  // in eighths), `sonar`, `arp`, `counter`, `chords`, `bass` (and its sub), `kick`, `snare`,
  // `hats` (accented: the soft hats between) and `rim`. A part switched off under More
  // Options stays off. A block may also ask for an `echo` (a 1/8 ping-pong delay), a
  // `filterDown` (closing a step a bar), a `fadeOut`, or the `end`: the last bar's second
  // half left to one dry low pulse on the tonic.
  if (scriptOn(options, style)) {
    const ROLES_OF = { lead: ['hook', 'square'], hats: ['hats', 'hatsSoft'], bass: ['bass', 'sub'], snare: ['snare', 'clap'] };
    const rolesOf = (tokens) => tokens.flatMap((t) => ROLES_OF[t] || [t]);
    // The word: the phrase's first note, up where the vocoder sings.
    let wordBar = null;
    for (const cb of cell) {
      const i = cb.notes.findIndex((v) => v != null);
      if (i < 0) continue;
      const one = blank();
      for (let st = 0; st < 16; st += 2) { one.notes[st] = [].concat(cb.notes[i])[0]; one.lens[st] = 1; }
      wordBar = up(one);
      break;
    }
    events.intro = { from: form[0].from, to: form[0].to };
    for (const [si, sec] of form.entries()) {
      useMood(sec, si);
      const from = sec.from - 1;
      sec.plays.forEach((blk, bi) => {
        const a = sec.from + blk.at;
        const z = sec.from + (sec.plays[bi + 1]?.at ?? sec.bars) - 1;
        if (blk.echo) events.echoes.push({ roles: rolesOf(blk.echo), from: a, to: z });
        if (blk.filterDown) events.filterDowns.push({ roles: rolesOf(blk.filterDown), from: a, to: z });
        if (blk.fadeOut) events.fadeOuts.push({ roles: rolesOf(blk.fadeOut), from: a, to: z });
      });
      for (let j = 0; j < sec.bars; j++) {
        const blk = [...sec.plays].reverse().find((x) => x.at <= j);
        const on = blk.parts;
        const b = from + j;
        const p = Math.floor(j / 8);
        const k = j % 8;
        // A short phrase (a scaled script's six bars) plays the plan's first bars and its turnaround.
        const len = Math.min(8, sec.bars - p * 8);
        const pb = phraseBar(p, len === 8 || len <= 4 ? planIndex(len, k) : k === len - 1 ? 7 : k, sec.dropIndex, j);
        const tune = pb.part;
        const c = pb.chords;
        if (on.has('arp') && options.parts.arp) put(b, 'arp', arp(c, b));
        if (on.has('sonar') && b % 2 === 0) put(b, 'sonar', bassBar(triads(c), R.sonar, C.sonar));
        // A hook in the bass register is the bass, and plays wherever the bass does.
        if (on.has('lead') || (hookIsBass && on.has('bass'))) put(b, 'hook', tune);
        if (on.has('lead')) {
          if (options.parts.square) put(b, 'square', up(tune));
          for (const rp of riffCounters) {
            if (pb.op === 'as') put(b, `riff:${rp.key}`, clonePart(rp.parsed[pb.src % L0]));
            else if (pb.op === 'k2' || pb.op === 'k4') put(b, `riff:${rp.key}`, diatonic(rp.parsed[pb.src % L0], pb.op === 'k2' ? 2 : 4, ctx.scale));
          }
        }
        if (on.has('vocoder')) put(b, 'vocoder', on.has('lead') ? shift(up(tune), -12) : up(tune));
        if (on.has('word') && wordBar) put(b, 'word', clonePart(wordBar));
        if (on.has('counter') && options.parts.counter) put(b, 'counter', counterPart(up(tune), c));
        if (on.has('chords') && chordRole) put(b, chordRole, chordPart(c));
        if (on.has('bass')) {
          const own = ownBass(pb);
          if (own) for (const [role, part] of own) put(b, role, part);
          else {
            put(b, 'bass', bassLine(c, R, 0, b));
            put(b, 'sub', subLine(c));
          }
        }
        if (on.has('kick')) put(b, 'kick', drum('kick', D.kick, j));
        if (on.has('snare')) put(b, coreFromRiff.has('clap') ? 'clap' : 'snare', drum('clap', D.clap, j));
        if (on.has('hats')) {
          put(b, 'hats', drum('hats', D.hats8, j));
          if (D.hatsSoft && !coreFromRiff.has('hats') && !asIs) put(b, 'hatsSoft', P(at(D.hatsSoft, j)));
        }
        if (on.has('rim') && D.rim && !asIs) put(b, 'rim', P(at(D.rim, j)));
        if (on.has('kick') || on.has('snare')) for (const rp of riffDrumExtras) put(b, `riff:${rp.key}`, clonePart(rp.parsed[j % L0]));
        if (blk.end && b === total - 1) {
          for (const role of Object.keys(bars[b])) bars[b][role] = cut(bars[b][role], 8);
          bars[b].bass = bassBar(analysis.tonicChord, '. . . . . . . . R:4 . . . . . . .', C.bassFloor);
        }
      }
      arrangeEnergy(ctx, sec, bars, events);
      liftSection(sec);
    }
    return { bars, events, cell, asWritten };
  }

  // ---- what the sections of the other forms play (cohesion.js), worked out once
  const material = form.some((s) => s.role === 'verse' || s.role === 'preChorus' || s.role === 'middle8')
    ? songMaterial({ ctx, cell, hookMean, modeHarmony, mood, seed: Math.floor(rng.verse.next() * 2 ** 31) })
    : null;
  /**
   * The kit for a section that is not a drop, by its energy: half time at the quietest,
   * four on the floor and the backbeat from the middle, open hats and percussion from
   * halfway up, sixteenth hats near the top. A style may give a section type its own
   * patterns (`drums.sections[type]`).
   */
  const sectionDrums = (b, i, e, type = null) => {
    const DS = type && D.sections?.[type] ? { ...D, ...D.sections[type] } : D;
    put(b, 'kick', drum('kick', e >= 0.35 ? DS.kick : DS.halfKick, i));
    put(b, 'clap', drum('clap', e >= 0.42 ? DS.clap : DS.halfClap, i));
    put(b, 'hats', drum('hats', e >= 0.6 ? DS.hats16 : DS.hats8, i));
    if (e >= 0.5) put(b, 'ohats', drum('ohats', DS.ohats, i));
    if (e >= 0.5) for (const name of ['shaker', 'tambourine']) if (options.drums[name] && DS.perc?.[name]) put(b, name, P(DS.perc[name]));
    for (const rp of riffDrumExtras) put(b, `riff:${rp.key}`, clonePart(rp.parsed[i % L0]));
  };
  /** Home, in the hook's register: the tonic nearest the hook's middle. */
  const homeNote = () => {
    let m = Math.round(Math.max(48, Math.min(84, hookMean)));
    while (((m % 12) + 12) % 12 !== key.tonic) m--;
    return nameOf(m);
  };
  const isDrumRole = (role) => ['kick', 'clap', 'snare', 'hats', 'ohats', 'fill', 'hatsSoft', 'rim', 'crash', 'impact']
    .includes(role) || GROUP.perc(role) || GROUP.riffDrums(role);

  // ---- walk the form
  form.forEach((sec, si) => {
    useMood(sec, si);
    const from = sec.from - 1;
    const n = sec.bars;
    const next = form[si + 1] || null;
    const nextIsDrop = next && DROP_ROLES.has(next.role);

    // How an intro opens: the Club form by its switches; any other form by the section's
    // own variant (form.js formFromList has already let the switches have their say).
    const introMode = sec.role === 'intro' ? sec.variant || (inLayers ? 'layers' : options.form.grooveIntro ? 'groove' : 'riff') : null;
    if (introMode === 'layers') {
      events.intro = { from: sec.from, to: sec.to };
      layered(from, n, false);
    } else if (introMode === 'groove') {
      events.intro = { from: sec.from, to: sec.to };
      groove(from, n);
    } else if (introMode === 'quote') {
      // The chorus, quoted: its hook over its chords, heard through a low-pass that opens
      // across the intro — the hats from halfway, the kick in the last bars.
      events.intro = { from: sec.from, to: sec.to };
      events.sweeps.push({ from: sec.from, to: sec.to });
      for (let i = 0; i < n; i++) {
        const pb = phraseBar(0, i % 8, 0, i);
        put(from + i, 'hook', pb.part);
        if (chordRole) put(from + i, 'pad', padBar(colourAll(pb.chords, mood), C.pad));
        if (i >= n / 2) put(from + i, 'hats', drum('hats', D.hats8, i));
        if (n < 4 || i >= n - 2) put(from + i, 'kick', drum('kick', D.kick, i));
      }
      if (options.drums.crashes) put(from, 'crash', P(D.crash));
    } else if (sec.role === 'intro') {
      events.intro = { from: sec.from, to: sec.to };
      riffAsWritten(from, n);
      for (let i = 0; i < n; i++) {
        const c = analysis.riffChords[i % L0];
        const late = n < 8 || i >= n / 2;
        if (!riffHasDrum('kick') && !asIs && late) put(from + i, 'kick', P(at(D.kick, i)));
        if (!riffHasDrum('hats') && !asIs && i >= n / 2) put(from + i, 'hats', P(at(D.hats8, i)));
        if (!analysis.hasHarmony && chordRole) put(from + i, 'pad', padBar(colourAll(c, mood), C.pad));
      }
      if (options.drums.crashes) put(from, 'crash', P(D.crash));
    }

    if (sec.role === 'build' || sec.role === 'build2') {
      // Build Type: the section's own Plays choice, else the switch (Varied: a draw). Rebuild is
      // the arp from the first bar, on the switch's way.
      // Never a pair that undoes itself (build-ways.js): what this build follows, then what it goes into.
      const after = form[si - 1]?.role === 'breakdown' ? events.breakdowns.find((d) => d.to === sec.from - 1)?.mode ?? null : null;
      const way = wayOf('build', BUILD_IDS.has(sec.variant) ? sec.variant : options.form.buildWay || 'roll', BUILD_WAYS, buildsNotAfter(after));
      const build = { from: sec.from, to: sec.to, intoDrop: !!nextIsDrop, way };
      events.builds.push(build);
      const dropIndex = sec.role === 'build' ? 0 : 1;
      const stutter = options.fx.stutter && nextIsDrop;
      const classic = way === 'roll' || way === 'loop';
      for (let i = 0; i < n; i++) {
        const b = from + i;
        const last = i === n - 1;
        const hole = last && !stutter;
        const pb = phraseBar(0, i % 8, dropIndex, i);
        let hookBar = pb.part;
        if (last) {
          hookBar = options.variation === 'faithful'
            ? cut(realise(cell, [pb.src, 'as'], ctx), 12)
            : head(realise(cell, [pb.src, 'as'], ctx));
        }
        if (way === 'loop') hookBar = hole ? cut(hookLoop(cell[0], n - i, n), 12) : hookLoop(cell[0], n - i, n);
        const c = pb.chords;
        const second = i >= n / 2;
        const lastCut = (part) => (hole ? cut(part, 12) : part);
        put(b, 'hook', hookBar);
        if (chordRole) put(b, chordRole, lastCut(chordPart(c)));
        if (chordRole && chordRole !== 'pad') put(b, 'pad', lastCut(padBar(colourAll(c, mood), C.pad)));
        if ((second || sec.variant === 'rebuild') && options.parts.arp) put(b, 'arp', lastCut(arp(c, b)));
        if (second && options.parts.square) put(b, 'square', up(hookBar));
        put(b, 'bass', lastCut(bassLine(c, R, 0, b)));
        put(b, 'sub', lastCut(subLine(c)));
        if (classic) {
          put(b, 'kick', drum('kick', hole ? 'x...x...x.......' : D.kick, i));
          if (!second) put(b, 'clap', drum('clap', D.clap, i));
          if (options.drums.rolls) {
            const left = n - i;
            const roll = last ? D.rolls[4] : left === 2 ? D.rolls[3] : left === 3 ? D.rolls[2] : left === 4 ? D.rolls[1] : D.rolls[0];
            put(b, 'snare', P(last && !hole ? D.rolls[3] : roll));
          }
          put(b, 'hats', drum('hats', !second ? D.hats8 : hole ? 'xxxxxxxxxxxx....' : D.hats16, i));
        } else {
          // A roll written here is played as written; the style's own grooves give way to the riff's.
          const pats = BUILD_DRUMS[way]({ i, n, D, rolls: options.drums.rolls });
          for (const [role, pat] of Object.entries(pats)) {
            if (!pat) continue;
            const own = Object.values(D).includes(pat) ? drum(role, pat, i) : (asIs ? null : P(at(pat, i)));
            put(b, role, hole ? cutAny(own, 12) : own);
          }
        }
        if (options.fx.riser && nextIsDrop && i === n - 2) {
          put(b, 'riser', P(D.crash));
          events.risers.push(b + 1);
        }
      }
      if (way === 'muffled') events.sweeps.push({ from: sec.from, to: sec.to });
      if (nextIsDrop) dropIns.push({ bar0: from + n - 1, next, build, way: wayOf('dropIn', options.form.dropIn || 'straight', DROP_IN_WAYS, dropInsNotAfter(way)) });
    }

    if (DROP_ROLES.has(sec.role)) {
      // A drawn or templated form says which drop and whether it is the last; the Club
      // form works it out from its roles.
      const dropIndex = sec.typed ? sec.dropIndex : DROP_INDEX[sec.role];
      const final = sec.typed ? sec.final : sec.lifted || (sec.role === 'drop2' && !form.some((s) => s.role === 'drop3'))
        || (sec.role === 'drop' && !form.some((s) => s.role === 'drop2'));
      events.drops.push({ from: sec.from, to: sec.to, role: sec.role, final });
      if (final) events.finalDrops.push({ from: sec.from, to: sec.to });
      const phrases = Math.ceil(n / 8);
      // A style played half time can switch to full time from a given drop on (future
      // bass's second drop) — its `fullTime` patterns over its own. One played full time can
      // drop into half time (chipstep's first drop): the drops before `halfTimeUntil` play
      // its `halfTime` drums and bass rhythms over its own.
      //
      // A drawn or templated form says it outright, section by section: a Half-Time Drop is
      // half time — the style's own half-time patterns where it has them, the half kick and
      // backbeat where it does not — and every other drop or chorus is full time.
      let DD; let RR; let halfAll = false;
      if (sec.typed) {
        const halfSec = sec.type === 'halfDrop';
        if (style.fullTimeFrom != null) { DD = halfSec ? D : { ...D, ...(D.fullTime || {}) }; RR = R; } else if (style.halfTimeUntil != null) {
          DD = halfSec ? { ...D, ...(D.halfTime || {}) } : D;
          RR = halfSec ? { ...R, ...(R.halfTime || {}) } : R;
        } else { DD = D; RR = R; halfAll = halfSec; }
      } else {
        const halfDrop = dropIndex < (style.halfTimeUntil ?? 0);
        DD = dropIndex >= (style.fullTimeFrom ?? Infinity) ? { ...D, ...(D.fullTime || {}) }
          : halfDrop ? { ...D, ...(D.halfTime || {}) } : D;
        RR = halfDrop ? { ...R, ...(R.halfTime || {}) } : R;
      }
      // A drop straight after a layered intro keeps every part the layers brought in; after
      // a Drums & Bass Intro, everything comes in at once.
      const prevIntro = form[si - 1]?.role === 'intro' ? form[si - 1] : null;
      const allIn = !!prevIntro && (prevIntro.variant ? ['layers', 'groove'].includes(prevIntro.variant) : (inLayers || options.form.grooveIntro));
      for (let p = 0; p < phrases; p++) {
        const len = Math.min(8, n - p * 8);
        // The Half-Time Switch is the Club form's (a drawn Club form keeps it).
        const half = halfAll || (!sec.joins && options.form.halfTime && sec.role === 'drop2' && p === 0);
        const crashEvery = dropIndex >= 1 ? 4 : 8;
        const fill = fillPick();
        for (let k = 0; k < len; k++) {
          const b = from + p * 8 + k;
          const lastBarOfSection = p * 8 + k === n - 1;
          const stopHere = lastBarOfSection && nextIsDrop && options.form.hardStop;
          const fillHere = options.drums.fills && k === len - 1 && !stopHere;
          dropBar(b, { p, k, i: planIndex(len, k), dropIndex, final, DD, RR, half, fill, fillHere, stopHere, layered: allIn });
          if (stopHere) events.stops.push({ bar: b + 1, step: 12 });
          if (options.drums.crashes && k % crashEvery === 0) put(b, 'crash', P(D.crash));
          if (options.drums.impact && p === 0 && k === 0) put(b, 'impact', P(D.crash));
          for (const rp of riffDrumExtras) put(b, `riff:${rp.key}`, stopHere ? cut(clonePart(rp.parsed[k % L0]), 12) : clonePart(rp.parsed[k % L0]));
          const st = (part) => (stopHere ? cut(part, 12) : part);
          for (const name of ['shaker', 'tambourine', 'congas', 'cowbell']) {
            if (options.drums[name] && joined('perc', p, dropIndex, allIn) && !half) put(b, name, st(P(D.perc[name])));
          }
          if (options.drums.ride && final) put(b, 'ride', st(P(D.perc.ride)));
          // A riser into a drop that follows this one with no build between.
          if (options.fx.riser && nextIsDrop && p * 8 + k === n - 2) {
            put(b, 'riser', P(D.crash));
            events.risers.push(b + 1);
          }
          // An echo thrown off the hook's last note before a breakdown or a stop.
          if (!sec.joins && options.fx.delayThrows && lastBarOfSection && next && (next.role === 'breakdown' || next.role === 'false' || stopHere)) {
            const hookNow = bars[b].hook;
            let at = -1;
            if (hookNow) for (let s = 15; s >= 0; s--) if (hookNow.notes[s] != null) { at = s; break; }
            if (at >= 0) events.throws.push({ bar: b + 1, step: at });
          }
        }
      }
    }

    if (sec.role === 'breakdown') {
      // What the hook does here: the section's own Plays choice, else the Breakdown Hook switch —
      // a way from breakdown-ways.js, or Exposed (an anthem's: as written over the pad alone, the
      // choir and the pedal joining for the second half). Varied is the take's own draw.
      const own = BREAKDOWN_VARIANTS[sec.variant] || (BREAKDOWN_LINES[sec.variant] ? sec.variant : null);
      const asked = own || options.form.breakdownHook || 'half';
      const mode = asked === 'varied' ? breakdownWay : asked;
      const exposed = mode === 'exposed';
      const noHook = mode === 'none';
      const prog = modeHarmony?.breakdown || style.breakdown[key.minor ? 'minor' : 'major'];
      // The trance breakdown plays the hook as written on a piano whatever Half Speed or As
      // Written say; the ways with a line of their own play that line on it. Piano: any style's.
      const onPiano = mode === 'piano' || style.breakdownHook === 'piano';
      const role = onPiano ? 'piano' : 'hook';
      events.breakdowns.push({ from: sec.from, to: sec.to, mode, role });
      const line = BREAKDOWN_LINES[mode] || BREAKDOWN_LINES.written;
      const k = { cell, aug: cell.flatMap((bar) => augment(bar)), up, scale: ctx.scale || key.scale };
      for (let i = 0; i < n; i++) {
        const b = from + i;
        const { tune, extra } = line({ i, n, k });
        const joins = !exposed || i >= n / 2;
        const want = romanChord(prog[i % prog.length], key);
        const w = partWeights(tune);
        let c = want;
        // The walk gives way where the hook does not fit it, or grinds against it (6 Oct 2026).
        if (w.w.some((x) => x > 0) && (chordFit(w, triadOf(want)) < -0.1 || grindShare(w, want) > 0.05)) {
          const best = bestChord(w, ctx.candidates).sym;
          // Coloured the breakdown's way — a ninth, else a seventh — with whichever stays in the key
          // and adds no grind of its own.
          const colours = parseChord(best).quality === 'm' ? ['m9', 'm7', 'madd9'] : ['add9', 'maj7', '6'];
          c = colours.map((q) => withQuality(best, q)).find((x) => inKey(x) && grindShare(w, x) <= grindShare(w, best)) || best;
        }
        if (noHook) { /* the hook rests */ } else if (onPiano) {
          put(b, 'piano', PIANO_AS_WRITTEN.has(mode) ? clonePart(cell[i % cell.length]) : tune);
          asWritten.add(`${b}:piano`);
        } else put(b, 'hook', tune);
        if (extra) put(b, ...extra(c));
        if (chordRole) put(b, 'pad', padBar(c, C.pad, { open: true }));
        if (options.parts.choir && joins) put(b, 'choir', { notes: [openVoicing(c, 'E5'), ...Array(15).fill(null)], lens: [16, ...Array(15).fill(null)] });
        if (options.parts.bell && i % 2 === 0 && mode === 'half') put(b, 'bell', fitToChords(shift(up(head(cell[(i / 2) % cell.length])), 12), c));
        // the pedal holds home unless the hook leans on the note just above it
        if (options.parts.bass !== 'none' && !hookIsBass && joins) put(b, 'bass', clearUnder(bassBar(analysis.tonicChord, R.pedal, C.bassFloor), tune, c));
        if (options.parts.sub && options.parts.bass !== 'none' && !(hookIsBass && style.wobbleSub) && joins) put(b, 'sub', clearUnder(bassBar(analysis.tonicChord, R.pedal, C.subFloor), tune, c));
      }
      if (options.drums.crashes) put(from, 'crash', P(D.crash));
    }

    if (sec.role === 'false') {
      // Stop dead, a bar of nothing, the hook alone, then the roll back in.
      const c0 = colourAll(analysis.tonicChord, mood);
      put(from, 'crash', P(D.crash));
      if (options.drums.impact) put(from, 'impact', P(D.crash));
      if (chordRole) put(from, 'pad', padBar(c0, C.pad));
      events.stops.push({ bar: sec.from, step: 0, false: true });
      if (n >= 3) put(from + 2, 'hook', head(cell[0]));
      if (chordRole && n >= 3) put(from + 2, 'pad', padBar(c0, C.pad));
      const lastBar = from + n - 1;
      put(lastBar, 'hook', cut(clonePart(cell[0]), 12));
      if (options.drums.rolls) put(lastBar, 'snare', P(options.fx.stutter ? D.rolls[3] : D.rolls[4]));
      put(lastBar, 'kick', drum('kick', 'x...x...x...x...', 0));
      if (options.fx.riser && n >= 2) {
        put(from + n - 2, 'riser', P(D.crash));
        events.risers.push(from + n - 1);
      }
      if (nextIsDrop) events.builds.push({ from: sec.to, to: sec.to, intoDrop: true, short: true });
    }

    const outroMode = sec.role === 'outro' ? sec.variant || (inLayers ? 'layers' : 'riff') : null;
    if (outroMode === 'layers') {
      layered(from, n, true);
      if (options.drums.crashes) put(from, 'crash', P(D.crash));
    } else if (outroMode === 'tag') {
      // The chorus's last two bars, tagged, then everything holding the home chord.
      for (let i = 0; i < n; i++) {
        const b = from + i;
        if (i < n - 1) {
          const pb = phraseBar(0, 6 + (i % 2), 0);
          put(b, 'hook', pb.part);
          if (chordRole) put(b, 'pad', padBar(colourAll(pb.chords, mood), C.pad));
          put(b, 'bass', bassLine(pb.chords, R, 0, b));
          sectionDrums(b, i, 0.5);
        } else {
          put(b, 'hook', { notes: [homeNote(), ...Array(15).fill(null)], lens: [16, ...Array(15).fill(null)] });
          if (chordRole) put(b, 'pad', padBar(colourAll(analysis.tonicChord, mood), C.pad));
          if (options.parts.choir) put(b, 'choir', padBar(colourAll(analysis.tonicChord, mood), C.choir));
          if (!hookIsBass && options.parts.bass !== 'none') put(b, 'bass', bassBar(analysis.tonicChord, R.pedal, C.bassFloor));
          put(b, 'crash', P(D.crash));
        }
      }
    } else if (outroMode === 'fade' || outroMode === 'cold') {
      // The chorus played on, fading to nothing — or stopping dead on the last bar's third
      // beat with one low hit of home.
      stretch(from, n, () => true);
      const roles = new Set();
      for (let b = from; b < from + n; b++) for (const r of Object.keys(bars[b])) roles.add(r);
      if (outroMode === 'fade') events.fadeOuts.push({ roles: [...roles], from: sec.from, to: sec.to });
      else {
        const b = from + n - 1;
        for (const role of Object.keys(bars[b])) bars[b][role] = isDrumPart(bars[b][role]) ? bars[b][role].map((v, j) => v && j < 8) : cut(bars[b][role], 8);
        if (!hookIsBass) bars[b].bass = bassBar(analysis.tonicChord, '. . . . . . . . R:4 . . . . . . .', C.bassFloor);
        bars[b].crash = P('........x.......');
      }
    } else if (sec.role === 'outro') {
      riffAsWritten(from, n);
      for (let i = 0; i < n; i++) {
        const c = analysis.riffChords[i % L0];
        if (!riffHasDrum('kick') && !asIs) put(from + i, 'kick', P(at(D.kick, i)));
        if (!riffHasDrum('hats') && !asIs) put(from + i, 'hats', P(at(D.hats8, i)));
        if (!analysis.hasHarmony && chordRole) put(from + i, 'pad', padBar(colourAll(c, mood), C.pad));
      }
      if (options.drums.crashes) put(from, 'crash', P(D.crash));
      if (options.drums.fills && n >= 2) {
        const f = fillPick();
        put(from + n - 1, 'snare', P(f.snare));
        put(from + n - 1, 'fill', P(f.tom));
      }
    }

    // ---- the sections of the other forms (templates.js), grown from the hook (cohesion.js)
    const singer = hookIsBass ? 'counter' : 'hook';
    if (sec.role === 'verse') {
      const chords = material.chordsFor('verse', n);
      const line = material.verseLine(chords, form.slice(0, si).filter((x) => x.role === 'verse').length);
      const e = sec.energy ?? 0.45;
      for (let i = 0; i < n; i++) {
        const b = from + i;
        const c = chords[i];
        // the verse line, the pre-chorus and the middle 8 are made from the hook over chords that never
        // looked at it: each is fitted to its chords, so nothing grinds (Peter, 6 Oct 2026)
        put(b, singer, fitToChords(line[i], c));
        if (chordRole) put(b, 'pad', padBar(colourAll(c, mood), C.pad));
        if (e >= 0.5 && options.parts.arp) put(b, 'arp', arp(c, b));
        put(b, 'bass', e >= 0.42 ? bassLine(c, R, 0, b) : hookIsBass || options.parts.bass === 'none' ? null : bassBar(triads(c), R.sub, C.bassFloor));
        put(b, 'sub', subLine(c));
        sectionDrums(b, i, e, 'verse');
      }
      if (options.drums.crashes) put(from, 'crash', P(D.crash));
      events.trims.push({ role: singer, from: sec.from, to: sec.to, db: -2 });
    }
    if (sec.role === 'preChorus') {
      const chords = material.chordsFor('preChorus', n);
      const line = material.preLine(n);
      // The music opening through a low-pass across it, and the roll swelling: a build.
      events.builds.push({ from: sec.from, to: sec.to, intoDrop: false });
      for (let i = 0; i < n; i++) {
        const b = from + i;
        const c = chords[i];
        const second = i >= n / 2;
        put(b, singer, fitToChords(line[i], c));
        if (chordRole) put(b, 'pad', padBar(colourAll(c, mood), C.pad));
        if (second && chordRole && chordRole !== 'pad') put(b, chordRole, chordPart(c));
        if (second && options.parts.arp) put(b, 'arp', arp(c, b));
        put(b, 'bass', bassLine(c, R, 0, b));
        put(b, 'sub', subLine(c));
        sectionDrums(b, i, sec.energy ?? 0.62, 'preChorus');
        if (options.drums.rolls && n - i <= 2) put(b, 'snare', P(n - i === 1 ? D.rolls[3] : D.rolls[2]));
      }
      events.trims.push({ role: singer, from: sec.from, to: sec.to, db: -1 });
    }
    if (sec.role === 'middle8') {
      // Somewhere else: new chords, the hook's tail developed, half-time drums, a walking
      // bass, the choir for the second half, the hook's head as the pickup home.
      const chords = material.chordsFor('middle8', n);
      const line = material.bridgeLine(n);
      const walk = BASS_FIGURES.find((f) => f.id === 'walking').pat;
      for (let i = 0; i < n; i++) {
        const b = from + i;
        const c = chords[i];
        const sung = fitToChords(line[i], c);
        put(b, singer, sung);
        if (chordRole) put(b, 'pad', padBar(colourAll(c, mood), C.pad, { open: true }));
        if (options.parts.choir && i >= n / 2) put(b, 'choir', padBar(colourAll(c, mood), C.choir));
        // the walking bass's passing notes step aside where the line sits a semitone above them
        if (!hookIsBass && options.parts.bass !== 'none') put(b, 'bass', clearUnder(bassBar(triads(c), walk, C.bassFloor), sung, triads(c)));
        put(b, 'kick', drum('kick', D.halfKick, i));
        put(b, 'clap', drum('clap', D.halfClap, i));
        put(b, 'hats', drum('hats', D.halfHats || D.hats8, i));
      }
      if (options.drums.crashes) put(from, 'crash', P(D.crash));
      events.trims.push({ role: singer, from: sec.from, to: sec.to, db: -1 });
    }
    if (sec.role === 'groove') {
      // As many of the style's layers as the energy asks for — or, a dip, everything but
      // the drums.
      const count = LAYERS.length;
      const k = Math.max(1, Math.min(count, Math.round((sec.energy ?? 0.6) * count)));
      if (sec.variant === 'dip') stretch(from, n, (role) => !isDrumRole(role));
      else stretch(from, n, (role) => layerOf(role) < k);
      if (k === count && sec.variant !== 'dip' && options.drums.crashes) put(from, 'crash', P(D.crash));
    }

    arrangeEnergy(ctx, sec, bars, events);
    // The key lift: every pitched part of a lifted section, up together.
    liftSection(sec);
  });
  // Before the Drop (build-ways.js), now that the drop after each build is made.
  for (const d of dropIns) applyDropIn(d);
  // The joins between sections, for every form but Club's (transitions.js).
  if (form[0]?.joins) planTransitions({ form, bars, events, options, D, rng: rng.transitions, fillPick, scale: ctx.scale });

  return { bars, events, cell, asWritten };
}

/**
 * A layer order with the chords (the `chords` group: supersaws, pad, piano) in its second layer —
 * where the style had them later. A layer the move empties goes.
 */
export function chordsEarly(layers) {
  const at = layers.findIndex((layer) => layer.includes('chords'));
  if (at <= 1 || layers.length < 2) return layers;
  return layers.map((layer, i) => (i === 1 ? [...layer, 'chords'] : layer.filter((t) => t !== 'chords'))).filter((layer) => layer.length);
}

// ---- the way into a lifted key (moods.js LIFT_APPROACHES)
const LEAD_ROLES = new Set(['hook', 'square', 'bell', 'megaSaw', 'third', 'counter', 'vocoder', 'word']);
const BASS_ROLES = new Set(['bass', 'sub']);

/** The chords of an approach, as [step, chord] from the bar's half, in the new key. */
export function approachChords(id, tonic, minor) {
  const V7 = chordSym(tonic + 7, '7');
  if (id === 'pivot' || id === 'walkup') return [[8, V7]];
  if (id === 'twostep') return [[8, minor ? chordSym(tonic + 5, 'm7') : chordSym(tonic + 2, 'm7')], [12, V7]];
  if (id === 'borrowed') return [[8, chordSym(tonic + 8, '')], [12, chordSym(tonic + 10, '')]];
  return [];
}

/** The nearest note to `m` whose pitch class is in `pcs`, below on a tie. */
const nearestIn = (m, pcs) => {
  for (let d = 0; d < 12; d++) {
    if (pcs.includes(((m - d) % 12 + 12) % 12)) return m - d;
    if (pcs.includes(((m + d) % 12 + 12) % 12)) return m + d;
  }
  return m;
};

/**
 * One part's second half moved onto the approach: every note from the half on to the
 * nearest note of the chord sounding there (a bass to the nearest root), and a note held
 * across the half cut there and struck again on the new chord, so a pad that was ringing
 * keeps ringing — on the new harmony.
 */
function reharmonise(part, chords, bassLike) {
  const out = clonePart(part);
  const at = (i) => { let c = null; for (const [s, sym] of chords) if (s <= i) c = sym; return c; };
  const move = (name, sym) => {
    const { root, pcs } = parseChord(sym);
    return nameOf(clampMidi(nearestIn(midi(name), bassLike ? [root] : pcs)));
  };
  const each = (v, sym) => (Array.isArray(v) ? [...new Set(v.map((n) => move(n, sym)))] : move(v, sym));
  // Every approach chord is HEARD: a note still ringing when one arrives is cut there and
  // struck again, so a pad holding through the half-bar plays both chords of a two-chord
  // approach rather than only the first.
  for (const [s] of chords) {
    if (out.notes[s] != null) continue;
    for (let i = s - 1; i >= 0; i--) {
      if (out.notes[i] == null) continue;
      const len = out.lens[i] ?? 1;
      if (i + len > s) {
        out.notes[s] = out.notes[i]; out.lens[s] = i + len - s; out.lens[i] = s - i;
        if (out.vels) out.vels[s] = out.vels[i];
      }
      break;
    }
  }
  for (let i = 8; i < 16; i++) if (out.notes[i] != null) out.notes[i] = each(out.notes[i], at(i));
  return out;
}

/**
 * The bar before a lifted section, turned into the way in: the chord parts and the bass
 * onto the approach chords, the tune resting for the half-bar so nothing clashes, and for
 * a Walk-Up the bass climbing a semitone at a time into the new root. Drums untouched.
 */
function approachLift(bar, id, tonic, minor) {
  let chords = approachChords(id, tonic, minor);
  if (!chords.length || !bar) return;
  // A bar cut dead on beat 4 (the Hard Stop before a final drop) has no beat 4 to put a
  // second chord on: the two share beat 3 instead, so both are still heard.
  const ends = Object.entries(bar).filter(([role, p]) => p && !isDrumPart(p) && !LEAD_ROLES.has(role)
    && (PITCHED.has(role) || role.startsWith('riff:')))
    .map(([, p]) => p.notes.reduce((e, v, i) => (v == null ? e : Math.max(e, i + (p.lens[i] ?? 1))), 0));
  if (chords.length > 1 && ends.length && Math.max(...ends) <= 12) chords = [chords[0], [10, chords[1][1]]];
  for (const role of Object.keys(bar)) {
    const part = bar[role];
    if (!part || isDrumPart(part) || !hasNotes(part)) continue;
    const pitched = PITCHED.has(role) || role.startsWith('riff:');
    if (!pitched) continue;
    if (LEAD_ROLES.has(role)) { bar[role] = cut(part, 8); continue; }
    const bassLike = BASS_ROLES.has(role) || (role.startsWith('riff:') && meanMidi(part) < 52);
    bar[role] = reharmonise(part, chords, bassLike);
    if (id === 'walkup' && bassLike) {
      // V on the half, then three chromatic steps up to the new root.
      const walk = bar[role];
      const first = walk.notes.slice(8).find((v) => v != null);
      const base = first != null ? midi(Array.isArray(first) ? first[0] : first) : null;
      if (base == null) continue;
      const home = nearestIn(base + 5, [tonic]);
      for (let i = 9; i < 16; i++) { walk.notes[i] = null; walk.lens[i] = null; if (walk.vels) walk.vels[i] = null; }
      walk.lens[8] = 2;
      [3, 2, 1].forEach((d, k) => { walk.notes[10 + 2 * k] = nameOf(clampMidi(home - d)); walk.lens[10 + 2 * k] = 2; });
    }
  }
}
const meanMidi = (part) => {
  const ms = part.notes.flatMap((v) => (v == null ? [] : Array.isArray(v) ? v : [v])).map(midi);
  return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 60;
};

/** For the tests: the roles that carry pitch. */
export const PITCHED_ROLES = PITCHED;
export { LIFT_SEMIS };
