// Nondestructive note effects shared by live playback, game playback and offline render.
// Source notes stay untouched; this turns one sequencer event into scheduled tone events.

const tones = (value) => (Array.isArray(value)
  ? value.filter((v) => Number.isFinite(v) && v > 0)
  : Number.isFinite(value) && value > 0 ? [value] : []);

const hash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const NOTE_FX_DIRECTIONS = Object.freeze([
  'up', 'down', 'updown', 'downup', 'updownHold', 'downupHold',
  'up2', 'down2', 'converge', 'diverge', 'pedalLow', 'pedalHigh', 'cascade',
  'random', 'asPlayed',
]);

// A range is stored in MIDI note numbers, in the file's spelling — 60 is C4, the same
// number `src/engine/notes.js` speaks. Frequencies are what the processor hands the
// rack, but a pitch window is something a person reads and types as notes, so notes are
// what is saved. The desk spells them for the eye through `deskNoteName`, one octave
// down, exactly as it does for every other pitch on screen.
const hzOfMidi = (midi) => 440 * 2 ** ((midi - 69) / 12);
// Two tones are "the same note" for folding purposes when they land on the same
// semitone. Nothing here compares raw floats: a bank's E5 halved twice does not equal
// its own E3 to the last decimal, and an arpeggio that plays the same key twice because
// of the seventeenth digit is exactly what folding is supposed to prevent.
const semitoneOfHz = (hz) => Math.round(12 * Math.log2(hz / 440));

/**
 * The MIDI span offered as a range bound — A0 to C8, the same eighty-eight keys the
 * desk's own keyboard spans. A window is a place on that board, so it may not be
 * narrower than the board is.
 */
export const NOTE_FX_RANGE_MIN = 21;
export const NOTE_FX_RANGE_MAX = 108;

/**
 * The longest pattern a note limit may ask for. Four octaves of a seven-note chord is
 * twenty-eight, so thirty-two is past the top of anything the stack can hold — the cap
 * is here to keep a mistyped number out of the scheduler, not to shorten a pattern
 * somebody meant.
 */
export const NOTE_FX_LIMIT_MAX = 32;

/**
 * How many notes of the stack the pattern plays, or 0 for all of it.
 *
 * Octaves says how tall the stack is built; this says where to stop climbing it. The
 * two are halves of one gesture — "up to two octaves, but cut it off at five notes" —
 * which is why the limit trims the built stack rather than pretending to be a fractional
 * octave count: five notes of a seventh is the chord plus its root an octave up, five of
 * a triad is the triad plus two, and neither is a number of octaves you could have
 * asked for.
 *
 * It applies whether or not the pattern repeats. A one-shot stops after the notes it is
 * allowed; a repeating one cycles them, which is a shorter ostinato rather than a
 * truncation — the same setting, read by a mode that comes back round.
 */
export function noteFxLimit(arp = {}) {
  const limit = Math.round(Number(arp?.limit) || 0);
  return limit > 0 ? Math.min(limit, NOTE_FX_LIMIT_MAX) : 0;
}

/**
 * The pitch window an arpeggiator is confined to, or null when it is free.
 *
 * A window narrower than an octave has nowhere to put a chromatic set — some pitch class
 * would have no home in it — so the top is read as at least an octave above the bottom.
 * That widening lives here rather than in the fold so the desk badge prints the window
 * that will actually sound.
 */
export function noteFxRange(arp = {}) {
  if (!arp?.rangeLimit) return null;
  const lo = Number(arp.rangeLo);
  const hi = Number(arp.rangeHi);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return { lo, hi: Math.max(hi, lo + 12) };
}

/**
 * Drop every tone into [lo, hi] by whole octaves, so the arpeggio sits in one register
 * whatever the source chord's voicing — a lead written up at C6 and a pad written down
 * at C2 arpeggiate in the same place.
 *
 * Octaves are the only transposition allowed: the notes stay the notes, which is what
 * separates this from a clamp. Anything already inside the window keeps the octave it
 * was written in, so a two-octave window still hears the difference between a chord
 * voiced low in it and one voiced high.
 *
 * Folding can land two tones on the same semitone — the octave stack does it every time
 * the stack is taller than the window — and the duplicate is dropped rather than
 * stuttered. First one in wins, which keeps `asPlayed` in the order it was played.
 */
export function foldTonesToRange(list, lo, hi) {
  const bottom = hzOfMidi(lo);
  if (!(bottom > 0)) return [...list];
  const top = Math.max(hzOfMidi(hi), bottom * 2);
  const out = [];
  const seen = new Set();
  for (const tone of list) {
    let freq = tone;
    while (freq < bottom - 1e-9) freq *= 2;
    while (freq > top + 1e-9) freq /= 2;
    const key = semitoneOfHz(freq);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(freq);
  }
  return out;
}

/**
 * The shortest run of the pattern that says everything it has to say.
 *
 * The index recipes below are written the obvious way — walk the stack once, emit what
 * each step is worth — and some of them come out saying the same thing twice. A triad
 * climbed in thirds is C G E C G E: the second half is not a variation, it is the first
 * half again. Nothing sounds different for the repetition when the pattern loops, but a
 * one-shot would play six notes where three were meant, and the desk's Repeat switch is
 * the difference between those two readings. So the recipe is folded down to its period
 * here, once, and every mode downstream reads a pattern that ends where it stops being
 * new.
 */
const shortestCycle = (seq) => {
  for (let period = 1; period < seq.length; period++) {
    if (seq.length % period) continue;
    let matches = true;
    for (let i = period; i < seq.length && matches; i++) matches = seq[i] === seq[i % period];
    if (matches) return seq.slice(0, period);
  }
  return seq;
};

/**
 * The index recipes, written against a stack already sorted low to high.
 *
 * Each returns positions into that stack rather than tones, so a pattern is a shape and
 * not a chord — the same recipe reads a triad, a seventh and a four-octave stack, and
 * the shape survives whatever Octaves, the range fold and the note limit left behind.
 *
 * Every one of them is total: it visits what it visits whatever the stack's length, and
 * where a shape has no meaning below three notes — a skip of two on two notes is one
 * note played twice — it says so by falling back to the plain climb rather than
 * stuttering.
 */
const INDEX_PATTERNS = {
  // Climb in thirds: every other note of the stack, wrapping round to pick up the ones
  // it stepped over. On a triad this is the C G E C G E figure — the chord's own notes,
  // in the order a hand rolls them rather than the order they stack.
  up2: (k) => (k < 3 ? null
    : shortestCycle(Array.from({ length: k * 2 }, (_, i) => (i % 2
      ? (((i - 1) / 2) + 2) % k : i / 2)))),
  // The mirror, including its fallback: a shape with no meaning on two notes still has
  // a direction, and a mode called Down should never climb.
  down2: (k) => (INDEX_PATTERNS.up2(k) ?? Array.from({ length: k }, (_, i) => i))
    .map((i) => k - 1 - i),
  // Outside in and inside out. Converge is the two hands walking towards each other —
  // lowest, highest, second lowest, second highest — and diverge starts at the middle
  // and opens outwards. Both keep the whole stack; only the route through it changes.
  converge: (k) => {
    const out = [];
    for (let lo = 0, hi = k - 1; lo <= hi; lo++, hi--) {
      out.push(lo);
      if (hi !== lo) out.push(hi);
    }
    return out;
  },
  diverge: (k) => {
    const out = [];
    for (let lo = Math.floor((k - 1) / 2), hi = lo + 1; out.length < k; lo--, hi++) {
      if (lo >= 0) out.push(lo);
      if (hi < k && out.length < k) out.push(hi);
    }
    return out;
  },
  // Up / Down with the turns held rather than clipped. The plain updown skips the
  // endpoints on the way back so the top note is not struck twice in a row; this one
  // strikes it twice on purpose, which is the older and squarer feel of the two and
  // lands the bottom note on the beat when the stack is odd.
  updownHold: (k) => (k < 2 ? [0]
    : [...Array.from({ length: k }, (_, i) => i),
      ...Array.from({ length: k }, (_, i) => k - 1 - i)]),
  downupHold: (k) => INDEX_PATTERNS.updownHold(k).map((i) => k - 1 - i),
  // A pedal alternates one note of the stack against all the others — the thumb holding
  // the root while the fingers climb, or the little finger ringing the top while the
  // chord walks up under it. Two notes have nothing to alternate, so they simply climb.
  pedalLow: (k) => (k < 3 ? null
    : Array.from({ length: (k - 1) * 2 }, (_, i) => (i % 2 ? (i + 1) / 2 : 0))),
  pedalHigh: (k) => (k < 3 ? null
    : Array.from({ length: (k - 1) * 2 }, (_, i) => (i % 2 ? k - 1 : i / 2))),
  // Three up, then back two and go again — the staircase that keeps climbing while
  // sounding like it keeps falling. It runs the stack's whole rotation, so a triad
  // takes nine notes to come home and a seventh takes twelve.
  cascade: (k) => (k < 3 ? null
    : shortestCycle(Array.from({ length: k * 3 }, (_, i) => (Math.floor(i / 3) + (i % 3)) % k))),
};

export function orderedTones(value, direction = 'up', seed = '') {
  const source = tones(value);
  const up = [...source].sort((a, b) => a - b);
  if (direction === 'asPlayed') return source;
  if (direction === 'down') return up.reverse();
  if (direction === 'updown') return up.length < 2 ? up : [...up, ...up.slice(1, -1).reverse()];
  if (direction === 'downup') {
    const down = [...up].reverse();
    return down.length < 2 ? down : [...down, ...down.slice(1, -1).reverse()];
  }
  if (direction === 'random') {
    return up.map((tone, i) => ({ tone, rank: hash(`${seed}:${i}:${tone}`) }))
      .sort((a, b) => a.rank - b.rank).map((item) => item.tone);
  }
  const pattern = up.length ? INDEX_PATTERNS[direction]?.(up.length) : null;
  if (pattern) return pattern.map((i) => up[i]);
  return up;
}

export function resolveNoteFx(track = null, bar = null, laneKey = '') {
  const base = track || {};
  const override = bar?.noteFx?.[laneKey];
  if (!override || override.mode === 'inherit') return base;
  if (override.mode === 'off') return {};
  return {
    ...base,
    ...override,
    strum: { ...(base.strum || {}), ...(override.strum || {}) },
    arp: { ...(base.arp || {}), ...(override.arp || {}) },
  };
}

export function createNoteFxProcessor() {
  const arpState = new Map();
  const reset = () => arpState.clear();

  function process({ laneKey, value, len = null, step, spb, config = {}, barIndex = 0 }) {
    const source = tones(value);
    const arp = config.arp || {};
    let events = [];
    if (arp.enabled) {
      // A 1/32T is a third, which is below the old floor of a half. The floor exists to
      // stop a zero or a negative rate spinning the phase test, not to pick a grid — the
      // transport decides that, and it can hold a third now.
      const rate = Math.max(1 / 3, Number(arp.rate) || 1);
      let state = arpState.get(laneKey);
      if (source.length) {
        const octaves = Math.max(1, Math.min(4, Math.round(arp.octaves) || 1));
        const expanded = [];
        for (let octave = 0; octave < octaves; octave++) {
          for (const tone of source) expanded.push(tone * 2 ** octave);
        }
        // The stack is built first and folded second, so the window has the last word:
        // whatever Octaves asks for, nothing sounds outside the range. A stack taller
        // than the window folds its upper octaves back onto notes already in it, and
        // those duplicates go — set a four-octave stack inside a one-octave window and
        // you get the one octave, not the same four notes four times.
        const range = noteFxRange(arp);
        const folded = range ? foldTonesToRange(expanded, range.lo, range.hi) : expanded;
        // The count is counted last, so the number on the panel is the number you hear.
        // Folding drops duplicates, and a limit taken before it would spend part of its
        // five notes on tones the fold was about to remove. A limit longer than the
        // stack is not padded out — it is simply never reached.
        const limit = noteFxLimit(arp);
        const stack = limit ? folded.slice(0, limit) : folded;
        const duration = Array.isArray(len)
          ? Math.max(rate, ...len.filter(Number.isFinite)) : Math.max(rate, Number(len) || rate);
        const passLength = orderedTones(stack, arp.direction || 'up').length;
        // A one-shot is triggered by each new chord even when the repeating mode was
        // formerly Continuous. Give it enough lifetime to finish its one complete
        // traversal; otherwise a short source chord could cut it off after one note.
        const oneShot = arp.repeat === false;
        const restart = oneShot || !state || arp.retrigger !== 'continuous'
          || (arp.retrigger === 'bar' && state.barIndex !== barIndex);
        state = {
          tones: stack, started: restart ? step : state.started,
          index: restart ? 0 : state.index,
          expires: arp.latch ? Infinity
            : step + Math.max(duration, oneShot ? Math.max(0, passLength - 1) * rate : rate),
          barIndex,
        };
        arpState.set(laneKey, state);
      }
      state = arpState.get(laneKey);
      if (state && step <= state.expires + 1e-9) {
        const phase = (step - state.started) / rate;
        if (phase >= -1e-9 && Math.abs(phase - Math.round(phase)) < 1e-7) {
          const ordered = orderedTones(state.tones, arp.direction || 'up',
            `${laneKey}:${state.started}:${Math.round(phase)}`);
          if (ordered.length) {
            const index = arp.retrigger === 'continuous' ? state.index++ : Math.round(phase);
            if (arp.repeat !== false || index < ordered.length) {
              events = [{ freq: ordered[index % ordered.length], delay: 0,
                len: rate * Math.max(1, Math.min(150, Number(arp.gate) || 80)) / 100 }];
            }
          }
        }
      } else if (state && !arp.latch) arpState.delete(laneKey);
    } else {
      events = source.map((freq, i) => ({
        freq, delay: 0,
        len: Array.isArray(len) ? (len[i] ?? null) : len,
      }));
    }

    const strum = config.strum || {};
    if (strum.enabled && events.length > 1) {
      const direction = strum.direction === 'down' ? 'down'
        : strum.direction === 'random' ? 'random' : 'up';
      const order = orderedTones(events.map((e) => e.freq), direction,
        `${laneKey}:${step}:${barIndex}`);
      const byFreq = new Map(events.map((event) => [event.freq, event]));
      const gap = Math.max(0, Math.min(250, Number(strum.gapMs) || 0)) / 1000;
      events = order.map((freq, i) => ({ ...byFreq.get(freq), delay: i * gap }));
    }
    // Durations remain full from each delayed start. `delay` never shortens `len`.
    return events;
  }

  return { process, reset };
}
