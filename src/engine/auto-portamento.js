// AUTO PORTAMENTO — selective slides between nearby melody notes.
//
// A portamento on the preset is a blanket: every note that starts while the one before it
// is still gated glides in, which on a busy lead is every note, and the melody turns to
// soup. This is the other way round. The song says WHICH connections slide, from the notes
// actually heard — their rhythm, their distance, where the phrase breathes — and every
// other note keeps its attack.
//
// This file is the whole decision, as a pure function of an ordered event view, so the
// desk, the Lab's generator and the scheduler all ask the same question of the same code
// and the same notes give the same answer. It never touches the notes: a plan is
// playback instructions BESIDE them — which connections, how long each slide, how far a
// source note's gate must reach to hand over — and the written pitches, starts and
// lengths stay exactly as authored. Browser-safe; no engine imports beyond the family map.
//
// ---- the vocabulary ------------------------------------------------------------------
//
//   event     one sounding note: { id, start, gate, hz, length } — start and gate in BEATS,
//             `length` saying whether the gate was drawn ('explicit') or inherited from the
//             lane's default ('inherited'). Anything else is read by the stricter rule.
//   barrier   { barrier: 'chord' | 'voice' | 'fx' | … } — something no slide may cross.
//   phrase    notes that belong together: a barrier or a missing rhythmic slot ends one. A
//             bar line alone does not.
//   source / destination
//             A → B. B is where the slide arrives; A's gate must reach B for the hand-over.
//
// Every number lives in AUTO_PORTAMENTO_POLICY, in one place, because they are starting
// points for the ear and not claims about music in general.

import { synthFamily, CRLS1, MRDR3 } from './synth-families.js';

/** The saved settings' schema. A reader that does not know a version fails closed. */
export const AUTO_PORTAMENTO_VERSION = 1;

/** Bump whenever the policy table or the ranking moves: derived plans are keyed on it. */
export const AUTO_PORTAMENTO_PLANNER_VERSION = 1;

export const AUTO_PORTAMENTO_DEFAULTS = Object.freeze({ amount: 35, glide: 40 });

export const AUTO_PORTAMENTO_POLICY = Object.freeze({
  // The local pulse: the shortest onset spacing that enough of its neighbours agree on,
  // so a single long rest cannot stretch it and a lone pair of fast notes cannot shrink it.
  pulse: Object.freeze({ window: 4, tolerance: 0.12, support: 0.34 }),
  // A spacing past this many pulses is a missing slot, and the phrase ends before it.
  breakPulses: 1.75,
  // A drawn gate followed by this many pulses of silence is a rest rather than a gap.
  restPulses: 1.0,
  gap: Object.freeze({
    // Touching, overlapping, or a positive gap up to this share of the pulse.
    normal: 0.2,
    // A regular run of notes that never had a length of their own may be a little looser —
    // but only while the spacing stays within `regularSpacing` of the pulse and the silence
    // that is bridged stays under `inheritedSeconds`.
    inherited: 0.35, regularSpacing: 0.15, inheritedSeconds: 0.08,
  }),
  // Two notes that overlap by more than this share of their onset spacing are independent
  // voices, not a legato join: nothing slides through them.
  overlap: 0.5,
  interval: Object.freeze({
    max: 12, step: 2, near: 5,
    weight: Object.freeze({ step: 1, near: 0.6, far: 0.25 }),
  }),
  // A destination this many pulses long is a landing worth sliding into.
  landingPulses: 1.5,
  bonus: Object.freeze({ pickup: 0.35, landing: 0.3, beat: 0.08, bar: 0.12 }),
  // Interior notes of a fast run are articulation, not melody: leave them be.
  rapid: Object.freeze({ spacingBeats: 0.3, run: 3, factor: 0.35 }),
  // How good a connection has to be to be worth a slide at all. Interior notes of a fast run
  // and wide leaps score under the ordinary floor, so at an ordinary Amount they keep their
  // attacks even in a phrase with nothing better — the budget is a ceiling, never a quota —
  // and only a high Amount lowers the floor to let them through.
  floor: Object.freeze({ normal: 0.5, high: 0.3 }),
  // The share of a phrase's transitions Amount may spend: `atDefault` at Amount 35, `atMax`
  // at 100. Above `highAmount` two selected transitions may follow one another. A phrase
  // of `shortPhrase` transitions or fewer may take one candidate scoring `strong` even
  // where its share rounds to none.
  budget: Object.freeze({
    atDefault: 0.15, atMax: 0.4, defaultAmount: 35, highAmount: 70, strong: 0.7, shortPhrase: 4,
  }),
  glide: Object.freeze({
    // Tempo-relative: a share of a beat, so a slide keeps its proportion when the song
    // speeds up. Glide moves it from `baseBeats` to `baseBeats + spanBeats`.
    baseBeats: 0.05, spanBeats: 0.2,
    // Wider intervals take a little longer; a semitone takes `intervalFloor` of the full.
    intervalFloor: 0.75, intervalSpan: 7,
    // And never more than this share of the note it lands on, nor this many seconds.
    capFraction: 0.3, capSeconds: 0.14,
    // Under this there is no slide to hear, so there is none.
    minSeconds: 0.008,
  }),
  // How far past the destination's onset the source's gate must reach where a strict
  // overlap is needed. The destination keeps its own authored start and end.
  handoffSeconds: 0.002,
});

const clampNumber = (value, lo, hi, fallback) => {
  const n = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

const OFF = Object.freeze({
  enabled: false, amount: AUTO_PORTAMENTO_DEFAULTS.amount, glide: AUTO_PORTAMENTO_DEFAULTS.glide,
  version: AUTO_PORTAMENTO_VERSION,
});

/**
 * The saved settings, read the one way: `{ config, diagnostic }`.
 *
 * Missing means off. Malformed means off, with a word for why. A version this build does
 * not know means off too — a newer file's settings are not ours to guess at, and reading
 * them as version 1 would switch a treatment on in a way its author never wrote.
 * `enabled` is the literal `true`: a stray 1, "true" or "on" is not a switch.
 */
export function readAutoPortamento(raw) {
  if (raw == null) return { config: OFF, diagnostic: null };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { config: OFF, diagnostic: 'malformed' };
  }
  const version = raw.version === undefined ? AUTO_PORTAMENTO_VERSION : raw.version;
  if (version !== AUTO_PORTAMENTO_VERSION) {
    return { config: OFF, diagnostic: `unsupported-version:${String(version)}` };
  }
  return {
    config: {
      enabled: raw.enabled === true,
      amount: Math.round(clampNumber(raw.amount, 0, 100, AUTO_PORTAMENTO_DEFAULTS.amount)),
      glide: Math.round(clampNumber(raw.glide, 0, 100, AUTO_PORTAMENTO_DEFAULTS.glide)),
      version: AUTO_PORTAMENTO_VERSION,
    },
    diagnostic: null,
  };
}

/** The settings alone, for the callers that have no use for the diagnostic. */
export const normaliseAutoPortamento = (raw) => readAutoPortamento(raw).config;

/**
 * Settings the desk or the generator can write into a lane's Note FX: normalised, and
 * switched on unless it is told otherwise.
 */
export const autoPortamentoSettings = ({ enabled = true, amount, glide } = {}) =>
  readAutoPortamento({ enabled, amount, glide, version: AUTO_PORTAMENTO_VERSION }).config;

/**
 * Is Auto Portamento on for these Note FX? The lane's own setting, read from the lane
 * and not from a bar's override: portamento has no bar controls in version one, so a bar
 * that turns the arpeggiator off has not said anything about it. Amount zero is off — it
 * selects nothing, so there is nothing for the scheduler to look ahead for.
 */
export const autoPortamentoOn = (noteFx) => {
  const { config } = readAutoPortamento(noteFx?.portamento);
  return config.enabled && config.amount > 0;
};

// A sustain level the note still has when the next one arrives. An unstated sustain is
// full — the engines' own default — and anything under a fifth is a pluck by another name.
const holds = (sustain) => (sustain === undefined || sustain === null ? true : sustain >= 0.2);

/**
 * Can this preset take an Auto Portamento slide, and if not, why not?
 *
 * One answer for the desk (which explains it), the Lab (which never picks a lane that
 * cannot), and the scheduler (which leaves such a lane exactly as it was). A slide is the
 * legato hand-over — the sounding note carries on and its pitch moves — so the preset has
 * to HOLD: one that decays to nothing has nothing left to slide. And it has to be a
 * renderer that has the hand-over: the pooled Tone leads and MRDR-3, native and worklet.
 * Anything else answers no and keeps playing as it always did — the preset is never
 * swapped to make it work.
 */
export function autoPortamentoSupport(voice) {
  if (!voice) return { supported: false, reason: 'no-voice' };
  if (voice.kind === 'drum' || voice.kind === 'noise') return { supported: false, reason: 'unpitched' };
  // The engine's own hand-written voices are pitched but are not played by the voice rack at
  // all — they are bank keys the lane body reads — so there is no hand-over to ask for.
  if (voice.kind === 'engine') return { supported: false, reason: 'engine' };
  const family = synthFamily(voice.synth);
  if (family === CRLS1) {
    return holds(voice.options?.envelope?.sustain)
      ? { supported: true, reason: null } : { supported: false, reason: 'decays' };
  }
  if (family === MRDR3) {
    // A preset still spelled DuoSynth has no layers: the rack plays it as a Tone class it no
    // longer has a hand-over for, so it is refused as an engine, not as a sound that dies.
    if (!voice.layer) return { supported: false, reason: 'engine' };
    const layers = ['osc1', 'osc2', 'osc3'].map((k) => voice.layer?.[k])
      .filter((layer) => layer && (layer.gain ?? 1) > 0);
    if (!layers.length) return { supported: false, reason: 'decays' };
    const vca = voice.global?.vca;
    // A global amplifier owns the note's level when there is one; otherwise the layers do.
    const sustains = vca ? holds(vca.sustain) : layers.some((layer) => holds(layer.sustain));
    return sustains ? { supported: true, reason: null } : { supported: false, reason: 'decays' };
  }
  return { supported: false, reason: 'engine' };
}

/** What the desk says when a lane cannot take it. */
export function autoPortamentoUnsupportedNote(support) {
  switch (support?.reason) {
    case 'no-voice': return 'This track has no instrument to slide.';
    case 'unpitched': return 'Drums and noise do not slide.';
    case 'decays': return 'This sound dies away before the next note, so there is nothing to slide.';
    case 'engine': return 'This instrument does not take slides yet. Pick a sustained lead to use it.';
    default: return '';
  }
}

const semitonesBetween = (fromHz, toHz) => 12 * Math.log2(toHz / fromHz);

/**
 * How long the slide into a note takes, in seconds, or 0 when there is no room for one.
 *
 * A tempo-relative base, widened a little by the interval and by Glide, and THEN capped:
 * the cap is the last word, so a short note is never handed a slide longer than it can
 * afford. There is deliberately no minimum that could overrun it — a slide under 8 ms is
 * not a slide, it is a click, and is dropped.
 */
export function autoPortamentoGlideSeconds({
  semitones, glide, secondsPerBeat, destinationSeconds, policy = AUTO_PORTAMENTO_POLICY,
}) {
  const g = policy.glide;
  const share = clampNumber(glide, 0, 100, AUTO_PORTAMENTO_DEFAULTS.glide) / 100;
  const interval = g.intervalFloor + (1 - g.intervalFloor)
    * Math.min(1, Math.abs(semitones) / g.intervalSpan);
  const wanted = secondsPerBeat * (g.baseBeats + g.spanBeats * share) * interval;
  const cap = Math.min(g.capFraction * destinationSeconds, g.capSeconds);
  const seconds = Math.min(wanted, cap);
  return Number.isFinite(seconds) && seconds >= g.minSeconds ? seconds : 0;
}

/** The lowest score that earns a slide at this Amount. */
export const autoPortamentoFloor = (amount, policy = AUTO_PORTAMENTO_POLICY) =>
  amount > policy.budget.highAmount ? policy.floor.high : policy.floor.normal;

/** The share of a phrase's transitions this Amount may spend. 0 at 0; monotonic. */
export function autoPortamentoShare(amount, policy = AUTO_PORTAMENTO_POLICY) {
  const a = clampNumber(amount, 0, 100, 0);
  if (a <= 0) return 0;
  const b = policy.budget;
  return a <= b.defaultAmount
    ? b.atDefault * (a / b.defaultAmount)
    : b.atDefault + (b.atMax - b.atDefault) * ((a - b.defaultAmount) / (100 - b.defaultAmount));
}

const BEAT_EPS = 1e-6;

/**
 * The local pulse at each onset gap of a run: the shortest spacing enough neighbouring
 * gaps agree on. Spacings within a tolerance count as the same spacing, and "enough" is a
 * share of the window — never fewer than two. With no agreement at all the shortest gap
 * stands, which makes a lone pair its own pulse instead of inventing a grid for it.
 */
function localPulses(iois, policy) {
  const { window: reach, tolerance, support } = policy.pulse;
  return iois.map((_, i) => {
    const near = iois.slice(Math.max(0, i - reach), Math.min(iois.length, i + reach + 1))
      .filter((x) => x > BEAT_EPS).sort((a, b) => a - b);
    if (!near.length) return Infinity;
    const need = Math.max(2, Math.ceil(near.length * support));
    for (const value of near) {
      let agree = 0;
      for (const other of near) if (Math.abs(other - value) <= value * tolerance) agree++;
      if (agree >= need) return value;
    }
    return near[0];
  });
}

// Where an onset falls: on the bar line, on a beat, or between them. Part of what a motif
// IS, so it is in the key — a figure placed on the beat and the same figure placed off it
// are not the same figure, and are not asked to be treated alike.
const accentOf = (start) => {
  if (Math.abs(start - Math.round(start)) >= 1e-3) return 'off';
  return Math.round(start) % 4 === 0 ? 'bar' : 'beat';
};

const quarters = (value) => Math.round(value * 4) / 4;

/**
 * Judge every neighbouring pair of notes: which may slide, and how good a slide each
 * would be. Independent of Amount, so the desk can ask "is there anything here at all"
 * before it is told how much of it to use.
 *
 * `events` is the ordered event view described at the top of the file. The result is
 * `{ phrases, candidates }`: each candidate carries its verdict and a reason, eligible or
 * not, because an unexplained "no" is how this kind of policy becomes impossible to tune.
 */
export function analyseAutoPortamento(events, {
  secondsPerBeat, glide = AUTO_PORTAMENTO_DEFAULTS.glide, policy = AUTO_PORTAMENTO_POLICY,
} = {}) {
  const candidates = [];
  const phrases = [];
  if (!Array.isArray(events) || !(secondsPerBeat > 0)) return { phrases, candidates };

  const refuse = (a, b, reason) => candidates.push({
    sourceId: a?.id ?? null, destinationId: b?.id ?? null, eligible: false, reason,
  });

  // ---- 1. runs: notes with no barrier between them ----------------------------------
  // A barrier is reported against the notes on either side of it, so the diagnostics say
  // which transition it forbade rather than only that one was forbidden.
  const runs = [];
  let run = [];
  let barrier = null;
  for (const item of events) {
    if (item?.barrier) {
      if (run.length) runs.push(run);
      if (!barrier) barrier = { kind: item.barrier, before: run[run.length - 1] || null };
      run = [];
      continue;
    }
    if (!item || !(item.hz > 0) || !Number.isFinite(item.start)) continue;
    if (barrier) {
      if (barrier.before) refuse(barrier.before, item, barrier.kind);
      barrier = null;
    }
    run.push({
      id: item.id, start: item.start,
      gate: Number.isFinite(item.gate) && item.gate > 0 ? item.gate : 0,
      hz: item.hz,
      length: item.length === 'explicit' || item.length === 'inherited' ? item.length : null,
    });
  }
  if (run.length) runs.push(run);

  // ---- 2. phrases: a run, cut at missing slots, rests and independent overlaps -------
  for (const notes of runs) {
    if (notes.length < 2) { phrases.push({ notes, run: notes, from: 0 }); continue; }
    const iois = [];
    for (let i = 0; i + 1 < notes.length; i++) iois.push(notes[i + 1].start - notes[i].start);
    notes.pulses = localPulses(iois, policy);
    let from = 0;
    const cut = (i, reason) => {
      refuse(notes[i], notes[i + 1], reason);
      phrases.push({ notes: notes.slice(from, i + 1), run: notes, from });
      from = i + 1;
    };
    for (let i = 0; i + 1 < notes.length; i++) {
      const a = notes[i];
      const b = notes[i + 1];
      const spacing = iois[i];
      // Two onsets on one instant are a chord the view failed to merge. Nothing here can
      // say which of them is the melody.
      if (!(spacing > BEAT_EPS)) { cut(i, 'chord'); continue; }
      const pulse = notes.pulses[i];
      const gap = b.start - (a.start + a.gate);
      if (-gap > policy.overlap * spacing) {
        // Independent voices. Neither note takes part in anything: a slide through one
        // would pick a chord tone, and choosing is exactly what this must not do.
        a.ambiguous = true;
        b.ambiguous = true;
        cut(i, 'overlap');
      } else if (spacing > policy.breakPulses * pulse + BEAT_EPS) {
        cut(i, 'rest');
      } else if (a.length === 'explicit' && gap >= policy.restPulses * pulse - BEAT_EPS) {
        cut(i, 'rest');
      }
    }
    phrases.push({ notes: notes.slice(from), run: notes, from });
  }

  // ---- 3. every neighbouring pair inside a phrase ------------------------------------
  const handoffBeats = policy.handoffSeconds / secondsPerBeat;
  phrases.forEach((phrase, number) => {
    const { notes: group, run: whole, from } = phrase;
    phrase.number = number;
    if (group.length < 2) return;
    // Fast runs: stretches of consecutive spacings at or under `rapid.spacingBeats`.
    const fast = group.slice(1).map((b, j) => b.start - group[j].start
      <= policy.rapid.spacingBeats + BEAT_EPS);
    const runEnd = new Array(fast.length).fill(-1);
    const runSize = new Array(fast.length).fill(0);
    for (let j = 0; j < fast.length;) {
      if (!fast[j]) { j++; continue; }
      let k = j;
      while (k + 1 < fast.length && fast[k + 1]) k++;
      for (let m = j; m <= k; m++) { runEnd[m] = k; runSize[m] = k - j + 1; }
      j = k + 1;
    }
    for (let j = 0; j + 1 < group.length; j++) {
      const a = group[j];
      const b = group[j + 1];
      const spacing = b.start - a.start;
      const pulse = whole.pulses[from + j];
      const gap = b.start - (a.start + a.gate);
      const semitones = semitonesBetween(a.hz, b.hz);
      const size = Math.round(Math.abs(semitones));
      const base = {
        sourceId: a.id, destinationId: b.id, phrase: number, position: j,
        phraseTransitions: group.length - 1,
        semitones, gapBeats: gap, spacingBeats: spacing, pulseBeats: pulse,
      };
      const reject = (reason) => candidates.push({ ...base, eligible: false, reason });
      if (a.ambiguous || b.ambiguous) { reject('overlap'); continue; }
      if (size < 1) { reject('repeat'); continue; }
      if (size > policy.interval.max) { reject('wide-leap'); continue; }
      let joined = gap <= policy.gap.normal * pulse + BEAT_EPS;
      if (!joined && a.length === 'inherited') {
        joined = gap <= policy.gap.inherited * pulse + BEAT_EPS
          && Math.abs(spacing - pulse) <= policy.gap.regularSpacing * pulse + BEAT_EPS
          && gap * secondsPerBeat <= policy.gap.inheritedSeconds + 1e-9;
      }
      if (!joined) { reject(a.length === 'explicit' ? 'explicit-staccato' : 'rest'); continue; }
      const glideSeconds = autoPortamentoGlideSeconds({
        semitones, glide, secondsPerBeat, destinationSeconds: b.gate * secondsPerBeat, policy,
      });
      if (!(glideSeconds > 0)) { reject('short-destination'); continue; }

      const landing = j + 1 === group.length - 1;
      const longLanding = b.gate >= policy.landingPulses * pulse - BEAT_EPS;
      const pickup = spacing <= 1.1 * pulse + BEAT_EPS && longLanding;
      const rapid = fast[j] && runSize[j] >= policy.rapid.run && j < runEnd[j];
      const accent = accentOf(b.start);
      const weight = size <= policy.interval.step ? policy.interval.weight.step
        : size <= policy.interval.near ? policy.interval.weight.near
          : policy.interval.weight.far;
      let score = weight * (rapid ? policy.rapid.factor : 1);
      if (pickup) score += policy.bonus.pickup;
      if (landing) score += policy.bonus.landing;
      if (accent === 'bar') score += policy.bonus.bar;
      else if (accent === 'beat') score += policy.bonus.beat;
      candidates.push({
        ...base, eligible: true, score, glideSeconds,
        reason: pickup ? 'pickup-landing' : landing ? 'run-landing'
          : size <= policy.interval.step ? 'near-step'
            : size <= policy.interval.near ? 'near-skip' : 'leap',
        // Authored end, and where the gate must reach for the hand-over: never shorter
        // than it was drawn, and past the destination's onset only where it has to be.
        sourceGateEndBeat: Math.max(a.start + a.gate, b.start + handoffBeats),
        // A motif is its relative pitches and rhythmic ratios and nothing about where it
        // sits, so a transposed or repeated figure reads the same way every time.
        key: [Math.round(semitones), quarters(spacing / pulse), quarters(a.gate / pulse),
          quarters(b.gate / pulse), pickup ? 'p' : '', landing ? 'l' : '', rapid ? 'r' : '',
          accent].join('|'),
      });
    }
  });
  return { phrases, candidates };
}

/**
 * Choose which eligible connections to use, a phrase at a time.
 *
 * Amount sets the share of a phrase's transitions that may slide; the best-ranked go
 * first, with stable tie-breaking, and a figure that repeats inside a phrase is taken
 * whole or not at all so its repeats cannot be treated differently from one another.
 * Short phrases may still take one strong candidate, and a phrase with nothing that
 * qualifies takes nothing — the budget is a ceiling, never a quota.
 *
 * Returns `{ transitions, diagnostics }`; `diagnostics` is every candidate with its
 * final word, which is what tuning and the "No suitable connections" line read.
 */
export function selectAutoPortamento(analysis, config, { policy = AUTO_PORTAMENTO_POLICY } = {}) {
  const { enabled, amount } = readAutoPortamento(config).config;
  const share = enabled ? autoPortamentoShare(amount, policy) : 0;
  const chosen = new Set();
  const verdict = new Map();
  const limit = amount > policy.budget.highAmount ? 2 : 1;
  const floor = autoPortamentoFloor(amount, policy);

  // What could be chosen at all at this Amount: eligible, and good enough to earn a slide.
  // The desk reads its count, so "No suitable connections" means exactly that.
  let qualifying = 0;
  const byPhrase = new Map();
  for (const c of analysis.candidates) {
    if (!c.eligible) continue;
    if (c.score < floor) { verdict.set(c, 'weak'); continue; }
    qualifying++;
    if (!byPhrase.has(c.phrase)) byPhrase.set(c.phrase, []);
    byPhrase.get(c.phrase).push(c);
  }
  for (const list of byPhrase.values()) {
    if (!(share > 0)) { for (const c of list) verdict.set(c, 'amount-zero'); continue; }
    // The share is of EVERY transition in the phrase, including the ones that could never
    // slide — a phrase of eight notes is seven chances whatever it has candidates for.
    const total = list[0].phraseTransitions;
    let budget = Math.min(Math.round(share * total), Math.floor(policy.budget.atMax * total + 1e-9));
    const top = Math.max(...list.map((c) => c.score));
    if (budget < 1 && total <= policy.budget.shortPhrase && top >= policy.budget.strong) budget = 1;

    const figures = new Map();
    for (const c of list) {
      if (!figures.has(c.key)) figures.set(c.key, []);
      figures.get(c.key).push(c);
    }
    const ordered = [...figures.values()].sort((x, y) => (y[0].score - x[0].score)
      || (x[0].position - y[0].position));
    const picked = new Set();
    // Adjacent transitions share a note. Normally none may; at a high Amount two in a row
    // are allowed and never three.
    const runIfAdded = (c) => {
      let n = 1;
      for (let p = c.position - 1; picked.has(p); p--) n++;
      for (let p = c.position + 1; picked.has(p); p++) n++;
      return n;
    };
    for (const members of ordered) {
      const take = [];
      for (const c of members) {
        if (runIfAdded(c) > limit) continue;
        take.push(c);
        picked.add(c.position);
      }
      if (!take.length) { for (const c of members) verdict.set(c, 'adjacent'); continue; }
      // The whole figure or none of it: its repeats must not be treated differently.
      if (picked.size > budget) {
        for (const c of take) picked.delete(c.position);
        for (const c of members) verdict.set(c, 'phrase-budget');
        continue;
      }
      for (const c of members) {
        if (take.includes(c)) { chosen.add(c); verdict.set(c, c.reason); } else verdict.set(c, 'adjacent');
      }
    }
  }

  const transitions = [];
  const diagnostics = analysis.candidates.map((c) => {
    const selected = chosen.has(c);
    if (selected) {
      transitions.push({
        sourceId: c.sourceId, destinationId: c.destinationId,
        glideSeconds: c.glideSeconds, articulation: 'legato',
        sourceGateEndBeat: c.sourceGateEndBeat, reason: c.reason,
        semitones: c.semitones, direction: c.semitones >= 0 ? 'up' : 'down',
      });
    }
    return {
      sourceId: c.sourceId, destinationId: c.destinationId, selected,
      reason: c.eligible ? (verdict.get(c) || 'phrase-budget') : c.reason,
      score: c.score ?? null, semitones: c.semitones ?? null,
      gapBeats: c.gapBeats ?? null, spacingBeats: c.spacingBeats ?? null,
    };
  });
  return { transitions, diagnostics, qualifying };
}

/**
 * The whole decision in one call: analyse, then select.
 *
 * `{ transitions, diagnostics, candidates, phrases, qualifying }` — transitions are
 * playback instructions and nothing else; the notes they refer to are not changed.
 */
export function planAutoPortamento(events, config, options = {}) {
  const { config: settings } = readAutoPortamento(config);
  const analysis = analyseAutoPortamento(events, { ...options, glide: settings.glide });
  const { transitions, diagnostics, qualifying } = selectAutoPortamento(analysis, settings, options);
  return {
    transitions, diagnostics, qualifying,
    candidates: analysis.candidates, phrases: analysis.phrases,
  };
}
