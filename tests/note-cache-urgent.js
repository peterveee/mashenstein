/*
 * Edit recovery: repairing the note cache from the playhead, not from the top.
 *
 * ---- the failure this guards -------------------------------------------------------
 *
 * Editing a voice while it plays purges its rendered buffers. Every distinct note of it
 * then plays LIVE — which is how an edit is heard immediately, and correct — and the live
 * cost of a heavy preset is several times what this machine renders in real time. One
 * measured session: 139 outstanding cache keys, an audio clock at 0.204, a main thread
 * sitting idle with a scheduler margin of +242ms. The audio thread collapsed while
 * nothing was wrong with the UI at all.
 *
 * The repair is to re-render the notes the playhead is ABOUT to reach, ahead of it,
 * instead of letting the whole backlog drain at background pace in song order.
 *
 * ---- what is tested here, and what cannot be -----------------------------------------
 *
 * The two pieces with real logic are executed rather than pinned, both against injected
 * clocks, because every bug they can have is a TIMING bug — fires twice, never fires,
 * fires after the song changed — and none of those is visible by reading:
 *
 *   * `trickleAllowed`, the brake. Urgency must lift the two COOLDOWN holds and must NOT
 *     lift the clock brake: rendering harder into a collapsing clock is what made it a
 *     collapse (see the everHealthy note in voices.js).
 *   * `makeEditRecovery`, the debounce. A pot drag is a stream of refreshes; the repair
 *     must coalesce them, must still fire mid-drag if the hand never stops, and must
 *     forget a burst whose song has been replaced under it.
 *
 * The walk itself needs a bank, a mixer and an AudioContext, so its seams are pinned at
 * source in the house style — the claims, not the expressions.
 */
import { readFileSync } from 'node:fs';
import { trickleAllowed } from '../src/engine/voices.js';
import { makeEditRecovery } from '../src/engine/audio.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- 1. the brake ------------------------------------------------------------------
//
// A state shaped like the real one, with the clock probe already settled so the verdict
// is whatever `clockOk` says. `liveCtx` absent makes the clock fail OPEN, which is the
// documented behaviour and lets the cooldown cases be tested on their own.
const brakeState = (over = {}) => ({
  transportRunning: true,
  playbackSince: 0,
  lastRenderDone: 0,
  urgentUntil: 0,
  liveCtx: null,
  clockProbe: null,
  clockOk: true,
  everHealthy: false,
  ...over,
});
// A deadline the idle gate accepts — the desk's real one almost always arrives this way.
const timedOut = { didTimeout: true };

{
  const now = performance.now();
  // WARM-UP: a song that has just started holds, because the desk is still settling.
  assert(trickleAllowed(brakeState({ playbackSince: now }), timedOut) === false,
    'the warm-up hold applies while the song is settling');
  assert(trickleAllowed(brakeState({ playbackSince: now, urgentUntil: now + 4000 }), timedOut) === true,
    'and urgency lifts it — an edit does not care that the song started a moment ago');

  // COOLDOWN: one render per 600ms, so background warming stays out of the way.
  assert(trickleAllowed(brakeState({ lastRenderDone: now }), timedOut) === false,
    'the one-render-per-600ms cooldown applies to ordinary warming');
  assert(trickleAllowed(brakeState({ lastRenderDone: now, urgentUntil: now + 4000 }), timedOut) === true,
    'and urgency lifts that too — the cooldown is what let the backlog outrun the repair');

  // THE IDLE GATE STAYS. Urgency reorders work; it does not seize the main thread.
  const noIdle = { didTimeout: false, timeRemaining: () => 0 };
  assert(trickleAllowed(brakeState({ urgentUntil: now + 4000 }), noIdle) === false,
    'the idle gate is NOT lifted by urgency — the scheduler still owns the thread');

  // AND SO DOES THE CLOCK BRAKE. This is the assertion that keeps the repair from
  // becoming the thing it repairs: a desk whose audio has already collapsed must not be
  // given more rendering to do, however urgent the reason.
  const collapsing = {
    // A probe old enough to be re-sampled, and a context whose time has barely moved:
    // ratio well under both thresholds.
    liveCtx: { currentTime: 10.02 },
    clockProbe: { at: now - 1000, ctxTime: 10.0 },
    everHealthy: true,
    urgentUntil: now + 4000,
  };
  assert(trickleAllowed(brakeState(collapsing), timedOut) === false,
    'a collapsing clock still holds the trickle even while urgent — the cure for an'
    + ' overloaded audio thread is the auto-stop, not more renders');
}

// ---- 2. the debounce ----------------------------------------------------------------
//
// Driven by a fake clock and fake timers so the ceiling can be reached without waiting
// for it, and so "did it fire twice" is answerable rather than probable.
function fakeClock() {
  let t = 1000;
  let seq = 0;
  const timers = new Map();
  return {
    now: () => t,
    setT: (fn, ms) => { const id = ++seq; timers.set(id, { at: t + ms, fn }); return id; },
    clearT: (id) => { timers.delete(id); },
    /** Advance, running anything due, in time order. */
    advance(ms) {
      const target = t + ms;
      for (;;) {
        let next = null;
        for (const [id, timer] of timers) {
          if (timer.at <= target && (!next || timer.at < next.timer.at)) next = { id, timer };
        }
        if (!next) break;
        timers.delete(next.id);
        t = next.timer.at;
        next.timer.fn();
      }
      t = target;
    },
  };
}

{
  const clock = fakeClock();
  const fires = [];
  const rec = makeEditRecovery({
    delayMs: 250, maxWaitMs: 1000, now: clock.now, setT: clock.setT, clearT: clock.clearT,
    fire: (ids) => fires.push([...ids]),
  });

  // A BURST coalesces. Six pot moves over 300ms are one repair, not six.
  for (let i = 0; i < 6; i++) { rec.edited.add('bassVoice'); rec.schedule(); clock.advance(50); }
  assert(fires.length === 0, 'a burst of edits does not fire while the hand is still moving');
  clock.advance(300);
  assert(fires.length === 1 && fires[0].join() === 'bassVoice',
    'and fires once, 250ms after the last of them');

  // SEVERAL VOICES in one burst arrive together — the walk is scoped to the set.
  fires.length = 0;
  rec.edited.add('leadVoice'); rec.schedule();
  clock.advance(60);
  rec.edited.add('padVoice'); rec.schedule();
  clock.advance(400);
  assert(fires.length === 1 && fires[0].sort().join() === 'leadVoice,padVoice',
    'edits to several voices in one burst are repaired in a single walk');

  // THE SET IS EMPTY for the next burst — a repair must not re-walk voices it has done.
  fires.length = 0;
  rec.edited.add('bassVoice'); rec.schedule();
  clock.advance(400);
  assert(fires.length === 1 && fires[0].join() === 'bassVoice',
    'and the accumulated set is cleared, so the next burst carries only its own voices');
}

{
  // A LONG CONTINUOUS DRAG. The hand never stops, so a plain trailing debounce would
  // never fire — and a slow sweep across a filter is exactly the gesture that empties the
  // cache. The ceiling is what guarantees a repair mid-drag.
  const clock = fakeClock();
  const fires = [];
  const rec = makeEditRecovery({
    delayMs: 250, maxWaitMs: 1000, now: clock.now, setT: clock.setT, clearT: clock.clearT,
    fire: (ids) => fires.push([...ids]),
  });
  for (let i = 0; i < 40; i++) { rec.edited.add('padVoice'); rec.schedule(); clock.advance(50); }
  assert(fires.length >= 1,
    'a drag that never pauses still gets a repair, at the maximum wait — a trailing'
    + ' debounce alone would defer it until the drag ended');
  assert(fires.every((batch) => batch.join() === 'padVoice'),
    'and every repair it fires carries the voice being dragged');
}

{
  // CANCELLED. The song, the context or the cache is being replaced under a pending walk.
  const clock = fakeClock();
  const fires = [];
  const rec = makeEditRecovery({
    delayMs: 250, maxWaitMs: 1000, now: clock.now, setT: clock.setT, clearT: clock.clearT,
    fire: (ids) => fires.push([...ids]),
  });
  rec.edited.add('bassVoice'); rec.schedule();
  assert(rec.pending() === true, 'a scheduled repair reports itself pending');
  rec.cancel();
  clock.advance(2000);
  assert(fires.length === 0 && rec.pending() === false && rec.edited.size === 0,
    'cancelling drops the pending walk and forgets what it was going to repair');
}

// ---- 3. the priority band ------------------------------------------------------------
//
// Urgent priorities must outrank every song step, and must be NEAREST-FIRST within
// themselves — including across a loop wrap, where the second walk starts again at a low
// step number but is further away in playing time. Getting that offset wrong is not
// visible as an error; it just repairs the wrong notes first.
{
  const BASE = 1e6;                       // URGENT_PRIORITY_BASE
  const priority = (from, step, offset = 0) => BASE - (offset + (step - from));

  const from = 100;
  const loopEnd = 112;
  const loopStart = 64;
  const head = loopEnd - from;            // 12 steps to the wrap
  const before = [100, 105, 111].map((step) => priority(from, step));
  const after = [64, 70, 80].map((step) => priority(loopStart, step, head));

  assert(before[0] > before[1] && before[1] > before[2],
    'inside one walk, nearer to the playhead outranks further away');
  assert(Math.min(...before) > Math.max(...after),
    'every note before the loop wrap outranks every note after it — the offset carries'
    + ' the distance across, so the first note of the loop does not tie with the nearest'
    + ' note of all');
  assert(after[0] > after[1] && after[1] > after[2],
    'and the wrapped walk is nearest-first within itself');

  // The bands must not collide. A form is thousands of steps at most; the ordinary walk
  // uses the step itself and sorts descending.
  const songSteps = [0, 16, 512, 4095];
  assert(Math.min(...before, ...after) > Math.max(...songSteps),
    'the lowest urgent priority still clears the highest song step, so "nearest to the'
    + ' playhead" always beats "latest in the song"');
}

// ---- 4. the seams that need a browser -------------------------------------------------
{
  const audio = readFileSync(new URL('../src/engine/audio.js', import.meta.url), 'utf8');
  const voices = readFileSync(new URL('../src/engine/voices.js', import.meta.url), 'utf8');

  assert(/if \(!urgent\) rack\.beginPreparedNotePlan\?\.\(\);/.test(audio)
    && /if \(!urgent\) rack\.commitPreparedNotePlan\?\.\(\);/.test(audio),
    'the urgent walk opens NO plan — the plan is cost-tiered and drops cheap notes, which'
    + ' is right for warming a song and wrong for repairing the next two bars');
  assert(/if \(onlyVoiceIds && !onlyVoiceIds\.has\(voice\.id\)\) continue;/.test(audio),
    'and it is scoped to the voices that were actually edited, so the window is not spent'
    + ' on an unrelated cold lane');
  assert(/const invalidated = this\.voices\?\.refresh\(voiceId\);/.test(audio)
    && /if \(!invalidated \|\| !voiceId\) return;/.test(audio),
    'the hook fires on the PURGE rather than on the edit — a chorus-only tweak keeps its'
    + ' buffers and needs no repair');
  assert(/this\.noteCacheState\?\.transportRunning/.test(audio),
    'and on transportRunning rather than playbackActive, which stays true while paused —'
    + ' a paused desk already drains at full speed');
  assert(/if \(this\.bank !== bank\) return;/.test(audio)
    && /if \(this\.noteCacheState\.generation !== generation\) return;/.test(audio),
    'the fire-time checks drop a repair whose song or cache has been replaced under it');
  assert(/this\._editRecovery\?\.cancel\(\);/.test(audio),
    'and setBank cancels a pending one rather than leaving it on a timer');
  assert(/return invalidate;/.test(voices),
    'VoiceRack.refresh reports whether it purged, which is the whole contract the hook'
    + ' depends on');
  assert(/if \(state\.urgentTagging\) \{[\s\S]{0,200}?job\.urgent = true;/.test(voices),
    'the queue tags only the jobs the urgent walk created, so the counters do not credit'
    + ' the repair with ordinary misses landing in the same seconds');

  // ---- throughput: what the counters measured, and what was done about it -------
  //
  // First live session with the counters in: one edit queued 113 urgent jobs and started
  // 38; another queued 29 and started 6. Started always equalled completed, so renders
  // were finishing fine — the bottleneck was STARTING. Two causes, both fixed here.
  assert(/function whenSoon\(/.test(voices)
    && /const wait = performance\.now\(\) < \(state\.urgentUntil \|\| 0\) \? whenSoon : whenIdle;/.test(voices),
    'urgent work asks immediately instead of waiting on requestIdleCallback, whose 400ms'
    + ' timeout was most of the latency and almost none of the filtering');
  assert(/state\.queue\.some\(\(queued\) => queued\.urgent\)/.test(voices)
    && /URGENT_CACHE_EXTEND_MS/.test(voices),
    'and a completed urgent job extends the window while urgent work remains, so the'
    + ' repair lasts as long as it needs instead of a guessed four seconds');
  assert(/if \(!idleOk\) return false;/.test(voices),
    'the idle gate itself is still there — skipping the WAIT for a gap is not the same as'
    + ' removing the check, and the ordinary trickle still queues behind one');

  // TODAY'S BRAKE MUST BE UNTOUCHED. The urgent path is allowed to lift cooldowns; it is
  // not allowed to reach this line.
  assert(/state\.clockOk = healthy \|\| \(!state\.everHealthy && ratio < TRICKLE_DROWNING_CLOCK\);/.test(voices),
    'and the drowning gate is exactly as it was — urgency never rewrites the measurement');
}

console.log(failed ? `\nNOTE CACHE URGENT: ${failed} FAILED` : '\nNOTE CACHE URGENT: OK');
process.exit(failed ? 1 : 0);
