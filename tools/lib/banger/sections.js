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
  chordBar, arpBar, ARP_FIGURES, BASS_FIGURES, BASS_LIFTS, openVoicing, parseChord, withQuality, nameOf, hasNotes, isDrumPart, overlay,
} from './theory.js';
import { romanChord, partWeights, chordFit, bestChord, triadOf, chordsOfBar, fitsScale } from './analyse.js';
import { hookCell, phrasePlan, realise, head, cellLength } from './variation.js';
import { DROP_ROLES, DEFAULT_LAYERS, DEFAULT_GROOVE, layersOn, scriptOn } from './form.js';

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
  return chordsOfBar((half) => partWeights(hookPart, 'hook', half), pool, bonus);
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
  // The mood, told which notes the key has, so its colours never step outside it.
  const mood = { ...(style.moods[options.mood] || style.moods.anthemic), fits: inKey };
  // A mode beyond major and minor brings its own chord walks (the recipe's modeHarmony),
  // bright or dark as the mood leans.
  const modeHarmony = style.modeHarmony?.[key.mode]?.[mood.walk || 'bright'] || null;
  const D = style.drums;
  const R = style.rhythms;
  const C = style.centres;
  const total = form[form.length - 1].to;
  // Build in Layers, where it applies (Long Songs: only past 64 bars).
  const inLayers = layersOn(options.form, total);
  const bars = Array.from({ length: total }, () => ({}));
  const events = {
    builds: [], drops: [], stops: [], throws: [], intro: null, risers: [], finalDrops: [], octaveBars: [],
    echoes: [], filterDowns: [], fadeOuts: [],
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
      put(from + i, 'hook', clonePart(hookPart.parsed[rb]));
      for (const p of riffSupport) put(from + i, `riff:${p.key}`, clonePart(p.parsed[rb]));
      for (const p of riffDrumAll) put(from + i, `riff:${p.key}`, clonePart(p.parsed[rb]));
    }
  };
  const lowerBass = (c, pat, floor) => bassBar(triads(c), pat, floor);
  // `RR` is the bass rhythms in force: the style's own, or a half-time drop's (below).
  // `dropIndex` 1 and on is a later drop: with Bass Lifts on, it moves to the bass's lift
  // (Off-Beat → Octave Eighths …) — unless the style's bass is its signature (`bassFixed`).
  const bassLine = (c, RR = R, dropIndex = 0) => {
    if (hookIsBass) return null;
    let id = options.parts.bass;
    if (id === 'sub' || id === 'none') return null;
    if (dropIndex >= 1 && options.parts.bassLift && !style.bassFixed) {
      id = (BASS_LIFTS[id] ?? BASS_FIGURES.find((f) => f.id === id)?.lift) || id;
    }
    if (id === 'rolling') return lowerBass(c, RR.rolling, C.bassFloor);
    const fig = BASS_FIGURES.find((f) => f.id === id);
    if (!fig) return lowerBass(c, RR.offbeat, C.bassFloor);
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
  const chordPart = (c) => {
    const cc = colourAll(c, mood);
    switch (options.parts.chords) {
      case 'piano': return chordBar(cc, R.pianoStabs, C.piano);
      case 'pad': return padBar(cc, C.pad);
      case 'none': return null;
      default: return padBar(cc, C.saws, { drop: true });
    }
  };
  const chordRole = options.parts.chords === 'none' ? null : options.parts.chords;
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
  const counterPart = (tune, c) => (R.counterStabs
    ? chordBar(triads(c), R.counterStabs, C.stabs || 'B4')
    : R.counterFigure ? arpBar(triads(c), R.counterFigure, C.counter || 'A5', 1)
      : counterLine(tune, triads(c), counterPrev));
  const fillPick = () => D.fills[Math.floor(rng.drums.next() * D.fills.length)];

  // ---- the drop's harmony and hook, per phrase, computed once per drop section
  const template = modeHarmony?.progression
    || (style.progressions[options.mood] || style.progressions.anthemic)[key.minor ? 'minor' : 'major'];
  const tplBar = (i) => template[i % template.length];
  /** One phrase bar: the hook as the plan has it, and the chords under it. */
  const phraseBar = (phrase, i, dropIndex) => {
    const plan = phrasePlan(CL, options.variation, phrase + dropIndex, flip);
    const step = plan[i];
    const part = realise(cell, step, ctx);
    const op = step[1];
    const riffChord = op === 'as' ? analysis.riffChords[step[0] % L0] ?? null : null;
    const chords = chordsUnder(part, tplBar(i), ctx, { riffChord, turn: op === 'turn' });
    return { part, chords, src: step[0], op };
  };

  // ---- one bar of a drop
  // When each optional part joins drop one, by phrase — the bell and the counter-line from
  // the second, the percussion from the second, the arp from the fourth — unless the style
  // says otherwise (`enter`). From drop two on, everything is in from the start.
  const ENTER = { bell: 1, counter: 1, perc: 1, arp: 3, ...(style.enter || {}) };
  const joined = (part, p, dropIndex, layered = false) => layered || dropIndex >= 1 || p >= ENTER[part];
  /** A phrase of `len` bars plays the plan's bars in this order: a half phrase its first three and its turnaround. */
  const planIndex = (len, k) => (len === 8 ? k : [0, 1, 2, 7][k]);
  /**
   * The music of one drop bar: the hook and everything doubling it, the chords, the bass,
   * the kit. `s` says where — phrase `p`, bar `k` of it (`i` in the phrase plan), which
   * drop, whether it is the final one, the drum patterns and bass rhythms in force, the
   * bar's half-time, fill and hard-stop state. A LAYERED bar (`s.layered`) is drop one's
   * music with every part already joined; which of them sound is the layers' business.
   */
  const dropBar = (b, s) => {
    const { p, k, i, dropIndex, final, DD, RR, half, fill, fillHere, stopHere, layered = false } = s;
    const pb = phraseBar(p, i, dropIndex);
    const tune = pb.part;
    const c = pb.chords;
    const st = (part) => (stopHere ? cut(part, 12) : part);
    put(b, 'hook', st(options.parts.octaveDouble && final ? octaves(tune) : tune));
    if (options.parts.octaveDouble && final) events.octaveBars.push(b + 1);
    if (options.parts.square) put(b, 'square', st(up(tune)));
    if (options.parts.bell && joined('bell', p, dropIndex, layered)) put(b, 'bell', st(shift(up(tune), 12)));
    if (dropIndex >= 1) put(b, 'megaSaw', st(shift(legato([up(tune)], 0, 3)[0], 12)));
    if (options.parts.arp && joined('arp', p, dropIndex, layered)) put(b, 'arp', st(arp(c, b)));
    if (options.parts.thirdBelow && (dropIndex === 1 || final)) put(b, 'third', st(diatonic(up(tune), -2, ctx.scale)));
    if (options.parts.choir && final) put(b, 'choir', st(choirPart(c)));
    if (options.parts.counter && joined('counter', p, dropIndex, layered)) put(b, 'counter', st(counterPart(up(tune), c)));
    // The riff's own counter-lines go where the hook is played as written or
    // sequenced — moved with it, so the two still agree.
    for (const rp of riffCounters) {
      if (pb.op === 'as') put(b, `riff:${rp.key}`, st(clonePart(rp.parsed[pb.src % L0])));
      else if (pb.op === 'k2' || pb.op === 'k4') put(b, `riff:${rp.key}`, st(diatonic(rp.parsed[pb.src % L0], pb.op === 'k2' ? 2 : 4, ctx.scale)));
    }
    if (chordRole) put(b, chordRole, st(chordPart(c)));
    put(b, 'bass', st(bassLine(c, RR, dropIndex)));
    put(b, 'sub', st(subLine(c, RR)));
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
      put(b, 'hats', drum('hats', half ? DD.hats8 : DD.hats16, k));
      if (fillHere) put(b, 'fill', P(fill.tom));
    }
  };

  // ---- Build in Layers
  // The parts arriving one at a time (an intro) or leaving one at a time (an outro), in the
  // style's order (`layers`, else form.js's DEFAULT_LAYERS). A layer names roles, or groups:
  const LAYERS = style.layers || DEFAULT_LAYERS;
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
    for (const sec of form) {
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
        const pb = phraseBar(p, len === 8 || len <= 4 ? planIndex(len, k) : k === len - 1 ? 7 : k, sec.dropIndex);
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
          put(b, 'bass', bassLine(c));
          put(b, 'sub', subLine(c));
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
      liftSection(sec);
    }
    return { bars, events, cell };
  }

  // ---- walk the form
  form.forEach((sec, si) => {
    const from = sec.from - 1;
    const n = sec.bars;
    const next = form[si + 1] || null;
    const nextIsDrop = next && DROP_ROLES.has(next.role);

    if (sec.role === 'intro' && inLayers) {
      events.intro = { from: sec.from, to: sec.to };
      layered(from, n, false);
    } else if (sec.role === 'intro' && options.form.grooveIntro) {
      events.intro = { from: sec.from, to: sec.to };
      groove(from, n);
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
      events.builds.push({ from: sec.from, to: sec.to, intoDrop: !!nextIsDrop });
      const dropIndex = sec.role === 'build' ? 0 : 1;
      const stutter = options.fx.stutter && nextIsDrop;
      for (let i = 0; i < n; i++) {
        const b = from + i;
        const last = i === n - 1;
        const hole = last && !stutter;
        const pb = phraseBar(0, i % 8, dropIndex);
        let hookBar = pb.part;
        if (last) {
          hookBar = options.variation === 'faithful'
            ? cut(realise(cell, [pb.src, 'as'], ctx), 12)
            : head(realise(cell, [pb.src, 'as'], ctx));
        }
        const c = pb.chords;
        const second = i >= n / 2;
        const lastCut = (part) => (hole ? cut(part, 12) : part);
        put(b, 'hook', hookBar);
        if (chordRole) put(b, chordRole, lastCut(chordPart(c)));
        if (chordRole && chordRole !== 'pad') put(b, 'pad', lastCut(padBar(colourAll(c, mood), C.pad)));
        if (second && options.parts.arp) put(b, 'arp', lastCut(arp(c, b)));
        if (second && options.parts.square) put(b, 'square', up(hookBar));
        put(b, 'bass', lastCut(bassLine(c)));
        put(b, 'sub', lastCut(subLine(c)));
        put(b, 'kick', drum('kick', hole ? 'x...x...x.......' : D.kick, i));
        if (!second) put(b, 'clap', drum('clap', D.clap, i));
        if (options.drums.rolls) {
          const left = n - i;
          const roll = last ? D.rolls[4] : left === 2 ? D.rolls[3] : left === 3 ? D.rolls[2] : left === 4 ? D.rolls[1] : D.rolls[0];
          put(b, 'snare', P(last && !hole ? D.rolls[3] : roll));
        }
        put(b, 'hats', drum('hats', !second ? D.hats8 : hole ? 'xxxxxxxxxxxx....' : D.hats16, i));
        if (options.fx.riser && nextIsDrop && i === n - 2) {
          put(b, 'riser', P(D.crash));
          events.risers.push(b + 1);
        }
      }
    }

    if (DROP_ROLES.has(sec.role)) {
      const dropIndex = { drop: 0, drop2: 1, drop3: 2, reprise: 3 }[sec.role];
      const final = sec.lifted || (sec.role === 'drop2' && !form.some((s) => s.role === 'drop3'))
        || (sec.role === 'drop' && !form.some((s) => s.role === 'drop2'));
      events.drops.push({ from: sec.from, to: sec.to, role: sec.role, final });
      if (final) events.finalDrops.push({ from: sec.from, to: sec.to });
      const phrases = Math.ceil(n / 8);
      // A style played half time can switch to full time from a given drop on (future
      // bass's second drop) — its `fullTime` patterns over its own. One played full time can
      // drop into half time (chipstep's first drop): the drops before `halfTimeUntil` play
      // its `halfTime` drums and bass rhythms over its own.
      const halfDrop = dropIndex < (style.halfTimeUntil ?? 0);
      const DD = dropIndex >= (style.fullTimeFrom ?? Infinity) ? { ...D, ...(D.fullTime || {}) }
        : halfDrop ? { ...D, ...(D.halfTime || {}) } : D;
      const RR = halfDrop ? { ...R, ...(R.halfTime || {}) } : R;
      // A drop straight after a layered intro keeps every part the layers brought in; after
      // a Drums & Bass Intro, everything comes in at once.
      const allIn = (inLayers || options.form.grooveIntro) && form[si - 1]?.role === 'intro';
      for (let p = 0; p < phrases; p++) {
        const len = Math.min(8, n - p * 8);
        const half = options.form.halfTime && sec.role === 'drop2' && p === 0;
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
          if (options.fx.delayThrows && lastBarOfSection && next && (next.role === 'breakdown' || next.role === 'false' || stopHere)) {
            const hookNow = bars[b].hook;
            let at = -1;
            if (hookNow) for (let s = 15; s >= 0; s--) if (hookNow.notes[s] != null) { at = s; break; }
            if (at >= 0) events.throws.push({ bar: b + 1, step: at });
          }
        }
      }
    }

    if (sec.role === 'breakdown') {
      const aug = cell.flatMap((bar) => augment(bar));
      const prog = modeHarmony?.breakdown || style.breakdown[key.minor ? 'minor' : 'major'];
      for (let i = 0; i < n; i++) {
        const b = from + i;
        const tune = aug[i % aug.length];
        const want = romanChord(prog[i % prog.length], key);
        const w = partWeights(tune);
        let c = want;
        if (w.w.some((x) => x > 0) && chordFit(w, triadOf(want)) < -0.1) {
          const best = bestChord(w, ctx.candidates).sym;
          // Coloured the breakdown's way — a ninth, else a seventh — with whichever stays in the key.
          const colours = parseChord(best).quality === 'm' ? ['m9', 'm7', 'madd9'] : ['add9', 'maj7', '6'];
          c = colours.map((q) => withQuality(best, q)).find(inKey) || best;
        }
        // The trance breakdown: the hook as written, on a piano, rather than at half speed
        // on its own sound.
        if (style.breakdownHook === 'piano') put(b, 'piano', clonePart(cell[i % cell.length]));
        else put(b, 'hook', tune);
        if (chordRole) put(b, 'pad', padBar(c, C.pad, { open: true }));
        if (options.parts.choir) put(b, 'choir', { notes: [openVoicing(c, 'E5'), ...Array(15).fill(null)], lens: [16, ...Array(15).fill(null)] });
        if (options.parts.bell && i % 2 === 0) put(b, 'bell', shift(up(head(cell[(i / 2) % cell.length])), 12));
        if (options.parts.bass !== 'none' && !hookIsBass) put(b, 'bass', bassBar(analysis.tonicChord, R.pedal, C.bassFloor));
        if (options.parts.sub && options.parts.bass !== 'none' && !(hookIsBass && style.wobbleSub)) put(b, 'sub', bassBar(analysis.tonicChord, R.pedal, C.subFloor));
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

    if (sec.role === 'outro' && inLayers) {
      layered(from, n, true);
      if (options.drums.crashes) put(from, 'crash', P(D.crash));
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

    // The key lift: every pitched part of a lifted section, up together.
    liftSection(sec);
  });

  return { bars, events, cell };
}

/** For the tests: the roles that carry pitch. */
export const PITCHED_ROLES = PITCHED;
export { LIFT_SEMIS };
