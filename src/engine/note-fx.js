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
  'up', 'down', 'updown', 'downup', 'random', 'asPlayed',
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
      const rate = Math.max(0.5, Number(arp.rate) || 1);
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
        const stack = range ? foldTonesToRange(expanded, range.lo, range.hi) : expanded;
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
