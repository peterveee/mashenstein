// Should the desk reduce its own drawing so the audio can recover — and, first,
// WOULD it have, given what the watchdog saw?
//
// Pure: no timers, no DOM, no AudioContext. Every input arrives in the sample and
// every output is in the returned state, so the whole hysteresis can be tested by
// feeding it a list of samples with hand-written timestamps. That is the point of
// extracting it — a threshold machine tested through requestAnimationFrame is tested
// through the thing it exists to throttle.
//
// It ships in SHADOW first: `tools/mixer-entry.js` runs this every watchdog tick and
// persists the ON/OFF events while changing no drawing behaviour at all. What that
// buys is the calibration corpus — how often relief would fire on real sessions, and
// whether it flaps near the line — before any user-visible behaviour exists to defend.

/**
 * The main thread must be implicated before visual relief is worth doing.
 *
 * This is the distinction the rest of the desk already draws and the one that decides
 * whether this feature can possibly help:
 *
 *   · the SCHEDULER starved — the main thread stalled, the queue emptied, notes were
 *     scheduled into the past. Drawing less is a real remedy: it is the same thread.
 *   · the audio thread missed REALTIME — the graph costs more than a core. Drawing
 *     less does not give the render thread more time. It may reduce process-level
 *     contention, which is worth measuring, but it is not the fix, and entering
 *     relief on that alone would make the status bar busy while the numbers stand
 *     still.
 *
 * So a low clock alone does not enter relief. A low clock alongside evidence that the
 * main thread is also in trouble — a thin scheduler margin, or a long task — does.
 */
export const RELIEF_MARGIN_S = 0.08;      // scheduler queue this thin counts as implicated
export const RELIEF_LONG_TASK_MS = 50;    // one task this long counts as implicated
export const RELIEF_CLEAR_RATIO = 0.98;   // the watchdog's own clear threshold
export const RELIEF_CLEAR_MS = 4000;      // continuous health required before standing down

export function newReliefState() {
  return {
    active: false,
    reason: '',
    since: 0,        // wall ms at which relief turned on
    healthySince: 0, // wall ms of the first consecutive healthy sample since then
  };
}

/**
 * True when the sample carries evidence that the MAIN thread is struggling.
 *
 * `dropouts` is a delta — passes that ran after the queue had already emptied — and is
 * on its own conclusive: the music had a hole in it and this thread put it there.
 */
export function mainThreadImplicated(sample) {
  if (sample.dropouts > 0) return true;
  if (Number.isFinite(sample.marginMin) && sample.marginMin < RELIEF_MARGIN_S) return true;
  return sample.longTaskMs >= RELIEF_LONG_TASK_MS;
}

/**
 * One watchdog observation in, the next state and at most one event out.
 *
 * Events are EDGE-triggered by construction: the machine only emits when `active`
 * changes, so a caller that persists every event it is handed cannot end up writing
 * four rows a second. `verdict` is emitted on every sample for the shadow log, and is
 * the third answer the entry rule needs — the case where the clock is low, the main
 * thread is clean, and the honest report is "this feature would not have helped".
 *
 * @param {object} state    from newReliefState(), treated as immutable
 * @param {object} sample   { wall, struggling, behind, dropouts, marginMin, longTaskMs, ratio, playing }
 * @returns {{state: object, event: null|object, verdict: string}}
 */
export function reliefTransition(state, sample) {
  const next = { ...state };
  const troubled = sample.struggling || sample.behind || sample.dropouts > 0;
  const implicated = mainThreadImplicated(sample);

  // Not playing is not health — it is the absence of a measurement. Stand relief down
  // rather than holding it across a stop, but do not let a stopped desk accumulate a
  // healthy interval it never earned.
  if (!sample.playing) {
    if (!state.active) return { state: newReliefState(), event: null, verdict: '' };
    return {
      state: newReliefState(),
      event: { type: 'off', reason: state.reason, since: state.since,
        durationMs: Math.max(0, sample.wall - state.since), ratio: sample.ratio },
      verdict: '',
    };
  }

  const verdict = !troubled ? ''
    : implicated
      ? (sample.dropouts > 0 ? 'scheduler-dropout'
        : sample.behind ? 'overloaded+main-thread' : 'struggling+main-thread')
      : 'render-overload';

  if (!state.active) {
    if (troubled && implicated) {
      next.active = true;
      next.reason = verdict;
      next.since = sample.wall;
      next.healthySince = 0;
      return {
        state: next,
        event: { type: 'on', reason: verdict, ratio: sample.ratio,
          marginMin: sample.marginMin, longTaskMs: sample.longTaskMs,
          dropouts: sample.dropouts },
        verdict,
      };
    }
    return { state: next, event: null, verdict };
  }

  // Already on. Healthy means BOTH clocks agree: the audio clock back above the
  // watchdog's clear threshold, and no fresh dropout. One sample either side of the
  // line restarts the interval rather than toggling the mode — that is the whole of
  // the anti-flap rule, and it is why 0.95/0.98 hysteresis alone is not enough here.
  const healthy = !troubled && sample.dropouts === 0
    && Number.isFinite(sample.ratio) && sample.ratio > RELIEF_CLEAR_RATIO;
  if (!healthy) {
    next.healthySince = 0;
    return { state: next, event: null, verdict };
  }
  if (!state.healthySince) {
    next.healthySince = sample.wall;
    return { state: next, event: null, verdict };
  }
  if (sample.wall - state.healthySince < RELIEF_CLEAR_MS) {
    return { state: next, event: null, verdict };
  }
  return {
    state: newReliefState(),
    event: { type: 'off', reason: state.reason, since: state.since,
      durationMs: Math.max(0, sample.wall - state.since), ratio: sample.ratio },
    verdict,
  };
}

/**
 * How much of the time an aux return was connected but had nothing arriving.
 *
 * The go/no-go number for aux sleeping, and it has to be measured before that work is
 * worth starting: the saving is proportional to idle time, and a dense 28-track mix
 * may never leave a return idle at all. Costs nothing to collect — the send meter it
 * reads is already on every aux input, already pulled, and already sampled by the
 * desk's own meters.
 *
 * `sleepableMs` is the honest ceiling on what sleeping could recover: time in which
 * the return was connected AND had received nothing for longer than a generous tail.
 * Anything shorter than that tail could not have been slept without cutting it.
 */
export const AUX_INPUT_FLOOR = 1e-4;   // ~-80dBFS on a normalRange meter
export const AUX_TAIL_MS = 2500;       // generous: longer than any authored decay here

export function newAuxDuty() { return new Map(); }

/**
 * Fold one observation of one aux into the accumulator.
 *
 * @param {Map} duty        from newAuxDuty()
 * @param {string} id       aux id
 * @param {object} sample   { dtMs, connected, level }
 */
export function accumulateAuxDuty(duty, id, sample) {
  let row = duty.get(id);
  if (!row) {
    row = { totalMs: 0, connectedMs: 0, feedingMs: 0, sleepableMs: 0, quietMs: 0, longestQuietMs: 0 };
    duty.set(id, row);
  }
  const dt = Math.max(0, sample.dtMs || 0);
  row.totalMs += dt;
  if (!sample.connected) { row.quietMs = 0; return row; }
  row.connectedMs += dt;
  if (sample.level > AUX_INPUT_FLOOR) {
    row.quietMs = 0;
    row.feedingMs += dt;
    return row;
  }
  row.quietMs += dt;
  row.longestQuietMs = Math.max(row.longestQuietMs, row.quietMs);
  // Only the part of the quiet run PAST the tail estimate is sleepable; the tail
  // itself is time the return had to stay awake for, and counting it would overstate
  // the prize this measurement exists to price.
  if (row.quietMs > AUX_TAIL_MS) row.sleepableMs += Math.min(dt, row.quietMs - AUX_TAIL_MS);
  return row;
}

/** One compact string per aux for the diagnostics CSV: `id:fed%/sleepable%`. */
export function auxDutySummary(duty) {
  const parts = [];
  for (const [id, row] of duty) {
    if (!row.totalMs) continue;
    const pct = (ms) => Math.round(100 * ms / row.totalMs);
    parts.push(`${id}:${pct(row.feedingMs)}/${pct(row.sleepableMs)}`);
  }
  return parts.join(' ');
}
