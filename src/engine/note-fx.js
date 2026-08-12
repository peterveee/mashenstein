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
        const duration = Array.isArray(len)
          ? Math.max(rate, ...len.filter(Number.isFinite)) : Math.max(rate, Number(len) || rate);
        const passLength = orderedTones(expanded, arp.direction || 'up').length;
        // A one-shot is triggered by each new chord even when the repeating mode was
        // formerly Continuous. Give it enough lifetime to finish its one complete
        // traversal; otherwise a short source chord could cut it off after one note.
        const oneShot = arp.repeat === false;
        const restart = oneShot || !state || arp.retrigger !== 'continuous'
          || (arp.retrigger === 'bar' && state.barIndex !== barIndex);
        state = {
          tones: expanded, started: restart ? step : state.started,
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
