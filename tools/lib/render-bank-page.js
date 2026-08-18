// The page half of the offline renderer: the code that runs THE GAME'S OWN ENGINE
// under an OfflineAudioContext and hands back the samples.
//
// This used to be a template string inside render-bank-browser.js, which was fine
// while headless Chromium was the only thing that ever ran it. The desk renders its
// own WAV now — in a hidden iframe, in the deployed build as well as in development,
// with no Node and no Chromium behind either — and a second copy of this walk would
// be a second thing to keep in step with the engine. So it is a module, imported by
// both: bundled into a Chromium page by render-bank-browser.js for the command-line
// tools, and into tools/mixer-render-entry.js for the desk. What the desk bounces and
// what `node tools/render-track.js` bounces are the same code, by construction.
//
// Browser-only, and deliberately so — it touches OfflineAudioContext and nothing
// else. Everything that needs a track IDENTITY resolved (the mix, the tempo, the
// swing, the loop markers) is worked out by the caller and passed in, because the
// bank reaches this function as a structured clone over postMessage or as JSON over
// CDP, and identity survives neither crossing. See the notes in its two callers.
import { Audio } from '../../src/engine/audio.js';
import { MIX } from '../../src/data/mix.js';
import { voiceOf, VOICE_LANES } from '../../src/data/voices.js';

/**
 * The noise seed every render starts from.
 *
 * Here, with the walk, because it has to be the SAME number in all of them: it is
 * what makes a lane rendered on its own get byte-identical noise to that lane inside
 * the full mix (which is what lets stems sum back to the mix), and what makes a song
 * bounced on the desk sound like the same song bounced from the command line. Two
 * copies of it would diverge silently — same music, different noise, and nothing to
 * point at.
 */
export const DEFAULT_SEED = 0x5eed1;

/**
 * Hand the main thread back for one turn.
 *
 * A MessageChannel rather than `setTimeout(0)`: a timer scheduled from inside a timer
 * callback is nesting, and past five levels deep the browser clamps it to 4ms — which
 * this loop would reach within the first fraction of a second and then pay on every
 * slice for the rest of the render. A message post is a macrotask with no such floor,
 * so the yield costs what it should and the render is not slowed to buy it.
 *
 * A macrotask and not a microtask on purpose. `await Promise.resolve()` yields to the
 * microtask queue, which drains before the event loop ever reaches the timer queue —
 * the sequencer's interval would not get its turn, and the yield would buy nothing at
 * all. Yielding TO THE THING THAT IS STARVING is the entire point.
 */
function yieldToEventLoop() {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => { ch.port1.close(); resolve(); };
    ch.port2.postMessage(0);
  });
}

/**
 * Render one bank offline.
 *
 * `outL`/`outR` come back as the rendered AudioBuffer's own channel views, not
 * copies: the two callers want different things from them (one interleaves for a
 * download, one copies for a transfer) and neither should pay for the other's.
 *
 * `onProgress` is a SECOND argument rather than a field of the first, because the
 * first crosses a postMessage or a CDP call and a function does not survive either.
 * Each caller supplies its own on this side of the wire.
 *
 * @param {object} args
 * @param {{onProgress?: (fraction: number) => void}} [hooks]
 * @returns {Promise<{outL: Float32Array, outR: Float32Array, frames: number,
 *   seconds: number, peak: number, percussion: number[]}>}
 */
export async function renderBankPage({
  bank, blocks, steps: stepsIn, loop, tail, seed, sampleRate, mix, trackId, arrangement, warp,
  upfront = false, rawLane = false, startStep = null, prerollSeconds = 0,
  fineLaneSkip = true, rearrangement,
}, { onProgress } = {}) {
  // The bank arrives carrying the tempo it is PLAYED at — resolved by the caller,
  // where a track id still means something, so a song the desk has retuned renders at
  // the tempo it was retuned to.
  //
  // A warp is NOT a tempo: setWarp scales the step clock while the mix's delay and
  // pre-delay times stay baked against the bank's own bpm, which is exactly what the
  // game does to a song under a speed burst or a star. Rendering a warp as a bpm
  // change would re-time those echoes and hide the drift the render exists to audition.
  const spb = (60 / bank.bpm) / 4 / (warp ? warp.tempo : 1);   // seconds per 16th step
  // `steps` when the caller asked for the song's own start-and-loop: the way in, once,
  // plus however many passes of the loop were asked for. Resolved by the caller with
  // the rest of what needs a track id. Otherwise the whole form, times repeat, exactly
  // as every render did before this existed.
  const steps = stepsIn || blocks * 32;
  // Swing needs nothing here. It delays the odd sixteenth by at most half of one — 188ms
  // at the slowest tempo a song can be played at, and a few tens of ms at any real one —
  // and `tail` is two seconds of room for the last note's release. The step COUNT does
  // not change: swing moves notes within the form, never past the end of it.
  const schedulePreroll = Math.max(0, Number(prerollSeconds) || 0);
  const N = Math.ceil((schedulePreroll + steps * spb + tail) * sampleRate);
  const ctx = new OfflineAudioContext(2, N, sampleRate);

  // Off only for the A/B that proves the half-step skips change nothing; every
  // ordinary render leaves this at its default.
  Audio.setFineLaneSkip?.(fineLaneSkip);
  Audio.setCaptureEnabled(false);   // the rewind recorder is realtime-only
  Audio.setNoiseSeed(seed);
  Audio.ensure(ctx);
  if (rawLane) Audio.setVolumes({ master: 1, music: 1, sfx: 1 });

  // The reverb builds its impulse response by rendering noise through its own
  // offline context. That has to finish before this render starts, or the aux is
  // silent for the whole track.
  if (Audio.mixer) await Audio.mixer.ready;

  // The mix is always resolved HERE and passed to setBank explicitly, never left to
  // the engine's own bank-identity lookup. The bank crossed into this page as a copy,
  // so it is a different object than the one in the module registry and identity
  // matching would silently find nothing — which is exactly the bug this replaced.
  // An undefined mix means "use what is saved for this track"; null means "none".
  const entry = mix !== undefined ? mix : (trackId ? (MIX[trackId] || null) : null);
  Audio.setBank(bank, entry);

  // Through the desk's own door, when a caller asks for one. `setBank` takes an
  // arrangement as an argument and builds the bank in one go; `setArrangement` patches
  // a bank that is already playing, which is the path every note and bar edit on the
  // desk takes and therefore the path worth being able to render. Omitted, nothing is
  // called and the render is exactly what it always was.
  if (arrangement !== undefined) Audio.setArrangement(arrangement);

  // An M8TRX recipe, when a caller wants to bounce a performance rather than the song.
  // After `setArrangement`, because the recipe maps OUTPUT positions onto source ones
  // and the source it maps onto is whatever the arrangement just resolved. The caller
  // sizes the buffer from `rearrangementOutputSteps`, so `steps` already describes the
  // performance and nothing here has to know the recipe's length. Omitted, nothing is
  // called and the render is exactly what it always was.
  if (rearrangement) Audio.setRearrangement(rearrangement);

  // After setBank: setBank re-reads the mix, and the warp has to be the last word
  // on the clock before the first step is scheduled.
  if (warp) Audio.setWarp(warp.tempo, warp.pitch);

  // setBank opens the song half a second in, with a short fade, because live
  // playback has to mute whatever was left in the lookahead window. An offline
  // render starts from silence anyway, so take the song from sample zero at full
  // trim — otherwise every WAV would carry a 0.5s gap and a fade-in.
  // Cropped diagnostic renders may begin on a deliberately anticipated track event.
  // Give those negative lane offsets real silent time to land in; ordinary bounces
  // pass zero and retain their byte-for-byte timing.
  Audio.nextTime = schedulePreroll;
  Audio.songTrim.gain.cancelScheduledValues(0);
  Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);

  // The song's own way in and repeat, when the caller asked for them. Armed here rather
  // than left to setBank's own lookup: the bank crossed as a copy, so its identity — and
  // with it the arrangement the markers live on — did not survive the trip. Steps, not
  // bars, and already clamped: the same resolver the engine and the desk use ran in the
  // caller against the same bar count this buffer was sized from.
  if (Number.isFinite(startStep)) {
    // A ranged Freeze keeps the original song coordinate while sample zero becomes
    // the beginning of its short buffer. No loop is armed here: the requested step
    // count is one linear visit to the active span, followed only by its release tail.
    Audio.step = Math.max(0, startStep);
  } else if (loop) {
    Audio.step = loop.start;
    if (loop.loop) Audio.setLoop(loop.loop.start, loop.loop.end, { jump: false });
  }

  // Laid down in slices, with the event loop given a turn between them.
  //
  // The render runs in a hidden iframe, and an iframe is a document boundary and not a
  // thread one: same origin, same renderer, same main thread as the desk that opened it.
  // So this loop — which builds the node graph for EVERY step of the song, thousands of
  // oscillators and envelopes on a busy arrangement — used to run as one uninterrupted
  // block on the thread the live sequencer is scheduled from. That sequencer feeds Web
  // Audio from a 25ms `setInterval` with 250ms of lookahead in front of it (see
  // SEQUENCER_LOOKAHEAD in src/engine/audio.js); a block of seconds drains that window
  // long before it ends, and the song you are listening to drops out while the song you
  // are bouncing is being built. Bouncing during playback is the ordinary way to use the
  // desk — you listen to the thing you are keeping — so it has to survive it.
  //
  // Sliced by TIME rather than by a step count, because what one step costs depends
  // entirely on how many lanes are sounding on it, which is exactly the variable that
  // made this bite. 8ms keeps every yield inside a frame's budget whatever the song is.
  //
  // The render is unaffected, byte for byte: `startRendering` has not been called yet,
  // nothing else in this frame touches its own `Audio`, and the steps are queued in the
  // same order with the same arguments — only the wall-clock spacing of the calls
  // changes, and an offline context has no wall clock. tests/null-test.js still holds.
  const SLICE_MS = 8;
  let sliceAt = performance.now();
  let stepAt = 0;
  // Zero the scheduler-work counters so the profile handed back below covers the WALK
  // and not the setBank/setArrangement that preceded it. Counting only; see
  // AudioSys.takeSchedulerWork and work/local/bench-scheduler-work.js, which reads it
  // to compare two engine revisions without a wall clock in the comparison.
  Audio.takeSchedulerWork?.();
  // THE TRANSPORT'S tick, not the bank's — `steps` is a count of sixteenths, and this
  // turns it into a count of scheduleStep CALLS, which is a question only the transport
  // can answer. The bank is one of three things that promote it: a natively 32-step
  // bank, a track-level 1/32 arp, or a bar-level one (see refreshTransportResolution).
  // Reading the bank meant a 16-step song with a 1/32 arpeggiator anywhere got half the
  // calls its transport needed, and the render simply stopped at the halfway bar with
  // the buffer's back half left silent. Same bug, same cause, as the frozen-lane tick in
  // AudioSys._scheduleFrozenSegment.
  // `steps` is in sixteenths; the transport takes `resolution / 16` calls to cross one
  // of them — 1 at 16, 2 at 32, 3 at 48, 6 at 96. Anything narrower than this stops the
  // walk early and leaves the back of the buffer silent, which is the failure the note
  // above describes and tests/render-length.js guards.
  const scheduleCalls = steps * (Audio.transportResolution / 16);
  const buildUntil = async (limit) => {
    while (stepAt < scheduleCalls && Audio.nextTime < limit) {
      Audio.scheduleStep();
      stepAt++;
      if (performance.now() - sliceAt < SLICE_MS) continue;
      await yieldToEventLoop();
      sliceAt = performance.now();
    }
  };

  // The walk is JUST-IN-TIME against the render head, not all up front — and that is
  // a cost fix, not a nicety. An offline graph built whole holds every node of the
  // song from sample zero: an oscillator that plays in bar 40 still gets processed —
  // outputting silence — through bars 1 to 39, so the render's cost grows with
  // (all nodes) × (whole length) instead of with the notes actually sounding. On a
  // twenty-lane import that is the difference between a bounce in seconds and a
  // bounce in minutes (measured: the same dense window at 0.87× realtime as a
  // window, minutes as a whole-song walk), and every one of those minutes runs
  // beside the live desk. So the graph stands HORIZON seconds ahead of the render
  // head and no further: the context is suspended at checkpoints, each one builds
  // the next stretch and waves the render on. The samples cannot change — the same
  // nodes are scheduled with the same arguments at the same audio times, and an
  // offline render is a pure function of that schedule; a suspension is a pause in
  // WHEN the buffer is computed, never in what. tests/mixer-export.js pins that
  // claim against the reference walk.
  //
  // The suspension that builds is also the suspension that reports: a resolved
  // suspend is proof the render reached that second, so the checkpoints double as
  // the progress readout the bounce dialog shows.
  //
  // `suspend` on an offline context is the corner of Web Audio the browsers disagree
  // about — Firefox has never shipped it — so it is feature-detected, and without it
  // the whole walk runs up front exactly as it always did (slower, never wrong).
  // `resume` goes in a `finally`: an un-resumed render hangs forever, and neither a
  // percentage nor a horizon is worth that.
  const QUANTUM = 128;
  // `upfront` is the caller saying "do not try": it is how a retry after a failed
  // JIT render asks for the walk that cannot half-happen. Feature detection covers
  // the browsers that never had `suspend` (Firefox); this covers the ones that have
  // it and cannot be relied on to honour it.
  // TNGR-2 IS FED AS THE WALK GOES, NOT BUILT FROM A SCHEDULE THAT IS NOT FINISHED.
  //
  // Its worklet takes a schedule at construction, and the walk here is just-in-time — the
  // graph stands a horizon ahead of the render head and no further, because an offline
  // graph built whole processes every node for the whole song. So the schedule is NOT
  // complete when the render starts. A lane built once from the first horizon plays the
  // first horizon and then nothing, with no error to say so: a French Horn that sounds for
  // three notes and is missing for the remaining seven minutes.
  //
  // Forcing the whole walk up front fixed that and cost what the lazy walk exists to save
  // — measured on a 7.5-minute song, a bounce that crawled and sat near zero. So the lane
  // is fed instead: built at the first checkpoint that has notes for it, and posted to at
  // every checkpoint after. One node per lane either way, which is what keeps a chord
  // stealing voices the same way in a stem as in the mix.
  //
  // What makes posting safe here and not before `startRendering` is the CUSHION. A
  // checkpoint hands over notes that are at least a horizon in the future — the same
  // lookahead the live path runs on — where the pre-render post had none, which is
  // finding (b) in docs/TNGR-2-completion-spec.md §3.
  const canSuspend = !upfront && typeof ctx.suspend === 'function';
  // A walk that throws inside a suspension must fail the RENDER, not vanish into a
  // swallowed rejection — without this, a bad bank would come back as a "successful"
  // render that goes silent at the bar the walk died on.
  let walkError = null;
  // A REJECTED suspension is the same failure wearing a different coat: the
  // checkpoint never fires, so the steps it would have built are never built, and
  // the render sails on producing silence from that second onward. Recorded rather
  // than swallowed — but not thrown from here, because a rejection can arrive
  // before `startRendering` has even been called and the only place that can judge
  // the damage is after the render, against `stepAt`.
  let suspendRejected = null;
  // Lanes built across EVERY flush, not just the one before the render: a lane that first
  // has notes at bar forty is built at the checkpoint before it, and a count taken only at
  // the start would report zero for a song whose TNGR-2 part is present throughout.
  let tngr2Lanes = 0;
  // The leading slice of the bar the pre-walk owns, so the number only ever goes up. A
  // quarter is generous — the walk is node CREATION and the render that follows is every
  // one of those nodes processed for the length of the song — but a bar that reaches 25%
  // quickly and then crawls is honest about which part is which, where one that reaches
  // 2% and stops is not.
  const reportRender = (frac) => onProgress?.(frac);
  if (!canSuspend) {
    await buildUntil(Infinity);
  } else {
    // A TNGR-2 lane needs its whole schedule before the render starts, so the walk runs to
    // the end HERE — but the checkpoints below still go up, and they are what draws the
    // progress bar. Turning them off with the walk cost the bounce dialog its percentage
    // entirely: a long render with no sign of life, which is worse than a slow one.
    // `buildUntil` returns at once when there is nothing left to walk, so each checkpoint
    // costs a suspend and a resume and reports.
    // Far enough ahead that a checkpoint arriving late (the desk's main thread is
    // shared) still has audio standing in front of the head; close enough that the
    // alive graph stays a window, not a song.
    const HORIZON_S = 4;
    const EVERY_S = 1.5;
    await buildUntil(HORIZON_S);
    for (let t = EVERY_S; t * sampleRate < N - QUANTUM; t += EVERY_S) {
      const frame = Math.floor((t * sampleRate) / QUANTUM) * QUANTUM;
      if (frame <= 0) continue;
      ctx.suspend(frame / sampleRate)
        .then(async () => {
          try {
            await buildUntil(frame / sampleRate + HORIZON_S);
            // The stretch just walked, handed to TNGR-2 before the render reaches it.
            // Its lanes are built once and fed after that — see `flushTngr2Offline`.
            tngr2Lanes += (await Audio.voices?.flushTngr2Offline?.()) || 0;
            reportRender(frame / N);
          } catch (e) {
            walkError = walkError || e;
          } finally {
            // A resume that fails leaves the render suspended for ever — the await
            // below never settles and the bounce button spins until the tab is
            // closed. Recorded so the incompleteness check has something to name,
            // though in that case the throw it wants can never be reached.
            try {
              const r = ctx.resume();
              if (r && typeof r.catch === 'function') {
                r.catch((e) => { suspendRejected = suspendRejected || { at: frame / sampleRate, resume: true, error: String(e) }; });
              }
            } catch (e) {
              suspendRejected = suspendRejected || { at: frame / sampleRate, resume: true, error: String(e) };
            }
          }
        })
        .catch((e) => {
          suspendRejected = suspendRejected || { at: frame / sampleRate, error: String(e) };
        });
    }
  }

  // TNGR-2's offline lanes, built from the schedule that has just been walked.
  //
  // Nothing has rendered yet — an OfflineAudioContext does not start until it is asked —
  // so a node created here is in place for the first sample. It has to happen HERE, after
  // the whole walk, because a worklet takes its schedule at construction: the port cannot
  // be relied on to deliver before `startRendering()` returns. See
  // docs/TNGR-2-completion-spec.md §3, finding (b).
  tngr2Lanes += (await Audio.voices?.flushTngr2Offline?.()) || 0;

  const buf = await ctx.startRendering();
  if (walkError) throw walkError;
  // THE CHECK THAT MAKES JIT SAFE TO SHIP.
  //
  // Every way the just-in-time walk can go wrong ends in the same place: steps that
  // were never scheduled. A rejected suspension, a checkpoint that never fired, a
  // browser that exposes `suspend` and ignores it — each one leaves the render
  // producing silence from that second onward, and an offline render reports no
  // error for playing nothing. Silence is a legitimate thing to render, so nothing
  // downstream can tell a quiet bounce from a broken one; only this can.
  //
  // So the walk states its own completeness, and a short render is refused rather
  // than returned. `bounceWav` and the Chromium renderer catch this and retry once
  // with `upfront: true` — slower, and it cannot half-happen.
  if (stepAt < scheduleCalls) {
    throw new Error(`render walk incomplete: ${stepAt}/${scheduleCalls} schedule calls scheduled`
      + ' — just-in-time suspensions did not run to the end here'
      + (suspendRejected ? ` (${JSON.stringify(suspendRejected)})` : ''));
  }
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;

  let peak = 0;
  for (let i = 0; i < L.length; i++) {
    const a = Math.abs(L[i]), b = Math.abs(R[i]);
    if (a > peak) peak = a;
    if (b > peak) peak = b;
  }

  // The kit timeline the sequencer just laid down, in seconds from zero. This is
  // the engine's own tally — the same one the live jukebox reads — so a rendered
  // video reacts to the drums dropping out on exactly the bar they do, without
  // anything downstream having to reimplement the arrangement. Small enough
  // (a few thousand numbers for a long song) to ride back with the metadata.
  const percussion = Array.from(Audio._percPending || []);

  return {
    outL: L, outR: R, frames: L.length, seconds: L.length / sampleRate, peak, percussion,
    // What the walk did for TNGR-2, so a bounce missing a part can be diagnosed from the
    // render's own report rather than from a console nobody was watching.
    tngr2Lanes,
    tngr2Walk: canSuspend ? 'jit' : 'upfront',
    scheduledCalls: stepAt,
    expectedScheduleCalls: scheduleCalls,
    // What the scheduler DID to produce this, as operation counts. Deterministic from
    // the song, so two engine revisions rendering the same bank can be compared exactly
    // — which a wall clock on this laptop cannot do at the sizes involved.
    schedulerWork: Audio.schedulerWork?.() || null,
    // The precomputed half-tick plan this walk ran under, so a bench can say WHY the
    // fast path did or did not engage rather than only that the counters did not move.
    fineBars: Audio._fineBars ? [...Audio._fineBars] : null,
    fineTickLanes: Audio._fineTickLanes || [],
    fineBarsReason: Audio._fineBarsReason || '',
    fineLanes: Audio._fineLanes ? [...Audio._fineLanes] : null,
    transportResolution: Audio.transportResolution,
  };
}

/** Interleave a stereo pair into one Float32Array — L,R,L,R. */
export function interleave(outL, outR) {
  const inter = new Float32Array(outL.length * 2);
  for (let i = 0; i < outL.length; i++) { inter[i * 2] = outL[i]; inter[i * 2 + 1] = outR[i]; }
  return inter;
}
