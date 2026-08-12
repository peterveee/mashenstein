// THE RELIEF MACHINE IS A THRESHOLD MACHINE, SO TEST IT WITH TIMESTAMPS, NOT TIMERS.
//
// `tools/lib/performance-relief.js` decides whether the desk should reduce its own
// drawing while the audio recovers. It is pure on purpose: every input arrives in a
// sample and every output is in the returned state, so hysteresis that would take
// twenty real seconds to provoke through requestAnimationFrame is a list of numbers
// here. Testing a throttle through the thing it throttles is how a flapping mode ships.
//
// The distinction these tests exist to pin down is the one the plan draws between the
// two ways playback goes wrong. A stalled MAIN thread starves the scheduler, and
// drawing less genuinely helps — same thread. An audio graph that costs more than a
// core misses realtime on a different thread entirely, and drawing less does not give
// it back any time. Entering relief on the second case would be theatre: a busy status
// bar over numbers that do not move. So a low clock alone must NOT enter relief.
import {
  newReliefState, reliefTransition, mainThreadImplicated,
  newAuxDuty, accumulateAuxDuty, auxDutySummary,
  RELIEF_CLEAR_MS, AUX_TAIL_MS,
} from '../tools/lib/performance-relief.js';

let failed = false;
const assert = (ok, message) => {
  if (ok) console.log(`ok: ${message}`);
  else { console.error(`FAIL: ${message}`); failed = true; }
};

const sample = (over = {}) => ({
  wall: 0, playing: true, ratio: 1, dropouts: 0, marginMin: 0.2, longTaskMs: 0,
  struggling: false, behind: false, ...over,
});

/** Feed a list of samples and return every event, with the final state. */
const run = (samples, from = newReliefState()) => {
  let state = from;
  const events = [];
  const verdicts = [];
  for (const s of samples) {
    const out = reliefTransition(state, s);
    state = out.state;
    verdicts.push(out.verdict);
    if (out.event) events.push(out.event);
  }
  return { state, events, verdicts };
};

// ---- what counts as the main thread being in trouble -------------------------

assert(mainThreadImplicated(sample({ dropouts: 1 })),
  'a scheduler dropout implicates the main thread on its own');
assert(mainThreadImplicated(sample({ marginMin: 0.05 })),
  'a scheduler queue down to 50ms implicates the main thread');
assert(mainThreadImplicated(sample({ longTaskMs: 120 })),
  'a 120ms task implicates the main thread');
assert(!mainThreadImplicated(sample({ marginMin: null })),
  'no scheduler pass in the window is not evidence of a stall');
assert(!mainThreadImplicated(sample()),
  'a healthy margin and no long task does not implicate the main thread');

// ---- entry ------------------------------------------------------------------

{
  // The case this feature is FOR: the queue emptied.
  const { state, events } = run([sample({ wall: 0, dropouts: 2, struggling: false })]);
  assert(state.active && events.length === 1 && events[0].type === 'on',
    'a confirmed scheduler dropout enters relief');
  assert(events[0].reason === 'scheduler-dropout',
    'the dropout entry names itself as a dropout rather than as a clock shortfall');
}

{
  // The case this feature is NOT for, and the one the plan says must be refused:
  // the audio thread is behind, the main thread is clean. Throttling drawing here
  // would not return any time to the renderer.
  const { state, events, verdicts } = run([
    sample({ wall: 0, ratio: 0.42, behind: true, struggling: true, marginMin: 0.2 }),
    sample({ wall: 250, ratio: 0.41, behind: true, struggling: true, marginMin: 0.2 }),
  ]);
  assert(!state.active && events.length === 0,
    'a low clock with a healthy scheduler margin does NOT enter relief');
  assert(verdicts.every((v) => v === 'render-overload'),
    'that case is still reported, as render overload rather than silence');
}

{
  const { state, events } = run([
    sample({ wall: 0, ratio: 0.6, struggling: true, marginMin: 0.03 }),
  ]);
  assert(state.active && events[0].reason === 'struggling+main-thread',
    'a low clock ALONGSIDE a thin scheduler margin does enter relief');
}

{
  // One bad sample is a late timer, not a verdict. The watchdog upstream only sets
  // `struggling` after half a second; without it there is nothing to enter on.
  const { state, events } = run([
    sample({ wall: 0, ratio: 0.9, marginMin: 0.03 }),
    sample({ wall: 250, ratio: 1 }),
  ]);
  assert(!state.active && events.length === 0,
    'a single noisy sample without the watchdog verdict does not enter relief');
}

// ---- exit and anti-flap ------------------------------------------------------

const enter = () => run([sample({ wall: 0, dropouts: 1 })]).state;

{
  let state = enter();
  const events = [];
  // Healthy, but not for long enough yet.
  for (let wall = 250; wall <= RELIEF_CLEAR_MS; wall += 250) {
    const out = reliefTransition(state, sample({ wall, ratio: 0.99 }));
    state = out.state;
    if (out.event) events.push(out.event);
  }
  assert(state.active && events.length === 0,
    `relief holds through ${RELIEF_CLEAR_MS}ms of health rather than releasing on the first good sample`);
  const out = reliefTransition(state, sample({ wall: RELIEF_CLEAR_MS + 500, ratio: 0.99 }));
  assert(!out.state.active && out.event?.type === 'off',
    'relief releases once the healthy interval is genuinely continuous');
  assert(out.event.durationMs >= RELIEF_CLEAR_MS,
    'the OFF event reports how long relief was held');
}

{
  // The flap this is built to prevent: readings wobbling either side of the line.
  // A ratio of 0.96 is above the watchdog's 0.95 alarm and below its 0.98 clear, so
  // it is neither trouble nor health — and it must not release relief.
  let state = enter();
  const events = [];
  for (let i = 1; i <= 40; i++) {
    const wall = i * 250;
    const out = reliefTransition(state, sample({ wall, ratio: i % 2 ? 0.99 : 0.96 }));
    state = out.state;
    if (out.event) events.push(out.event);
  }
  assert(state.active && events.length === 0,
    'alternating healthy and marginal samples never accumulate a clear interval — no flapping');
}

{
  let state = enter();
  const out = reliefTransition(state, sample({ wall: 500, playing: false }));
  assert(!out.state.active && out.event?.type === 'off',
    'stopping the song stands relief down rather than leaving it latched');
  const stopped = reliefTransition(out.state, sample({ wall: 750, playing: false }));
  assert(!stopped.event, 'a stopped desk emits one OFF, not one per tick');
}

{
  // Events are edge-triggered by construction. Four samples a second for a minute of
  // sustained trouble is 240 ticks; the log must not carry 240 rows.
  const samples = [];
  for (let i = 0; i < 240; i++) {
    samples.push(sample({ wall: i * 250, dropouts: i === 0 ? 1 : 0, struggling: true, marginMin: 0.02 }));
  }
  const { events } = run(samples);
  assert(events.length === 1,
    'sustained trouble writes one ON event, not one per watchdog tick');
}

// ---- aux duty cycle ----------------------------------------------------------
//
// The go/no-go number for aux sleeping. It has to be honest in one specific way: a
// return that is quiet for less than a tail could not have been slept without cutting
// the tail off, so that time is not a saving and must not be counted as one.

{
  const duty = newAuxDuty();
  for (let i = 0; i < 40; i++) {
    accumulateAuxDuty(duty, 'reverb', { dtMs: 250, connected: true, level: 0.3 });
  }
  const row = duty.get('reverb');
  assert(row.feedingMs === 10000 && row.sleepableMs === 0,
    'a return with something arriving the whole time is never sleepable');
}

{
  const duty = newAuxDuty();
  // 1s fed, then 10s of silence.
  for (let i = 0; i < 4; i++) accumulateAuxDuty(duty, 'delay', { dtMs: 250, connected: true, level: 0.4 });
  for (let i = 0; i < 40; i++) accumulateAuxDuty(duty, 'delay', { dtMs: 250, connected: true, level: 0 });
  const row = duty.get('delay');
  assert(row.longestQuietMs === 10000, 'the longest quiet run is measured');
  assert(Math.abs(row.sleepableMs - (10000 - AUX_TAIL_MS)) <= 250,
    'only the quiet PAST a generous tail counts as sleepable');
}

{
  const duty = newAuxDuty();
  // Quiet, but never for longer than a tail: a sparse part with a repeating send.
  for (let round = 0; round < 10; round++) {
    accumulateAuxDuty(duty, 'reverb', { dtMs: 250, connected: true, level: 0.5 });
    for (let i = 0; i < 4; i++) {
      accumulateAuxDuty(duty, 'reverb', { dtMs: 250, connected: true, level: 0 });
    }
  }
  assert(duty.get('reverb').sleepableMs === 0,
    'a return whose gaps are all shorter than its tail is not sleepable either');
}

{
  const duty = newAuxDuty();
  for (let i = 0; i < 20; i++) {
    accumulateAuxDuty(duty, 'reverb', { dtMs: 250, connected: false, level: 0 });
  }
  const row = duty.get('reverb');
  assert(row.connectedMs === 0 && row.sleepableMs === 0,
    'an aux pruneAuxes already unhooked is not counted as a missed saving');
  assert(auxDutySummary(duty) === 'reverb:0/0',
    'the CSV summary reports fed and sleepable percentages per aux');
}

process.exit(failed ? 1 : 0);
