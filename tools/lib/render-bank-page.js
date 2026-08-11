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
  const N = Math.ceil((steps * spb + tail) * sampleRate);
  const ctx = new OfflineAudioContext(2, N, sampleRate);

  Audio.setCaptureEnabled(false);   // the rewind recorder is realtime-only
  Audio.setNoiseSeed(seed);
  Audio.ensure(ctx);

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

  // After setBank: setBank re-reads the mix, and the warp has to be the last word
  // on the clock before the first step is scheduled.
  if (warp) Audio.setWarp(warp.tempo, warp.pitch);

  // setBank opens the song half a second in, with a short fade, because live
  // playback has to mute whatever was left in the lookahead window. An offline
  // render starts from silence anyway, so take the song from sample zero at full
  // trim — otherwise every WAV would carry a 0.5s gap and a fade-in.
  Audio.nextTime = 0;
  Audio.songTrim.gain.cancelScheduledValues(0);
  Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);

  // The song's own way in and repeat, when the caller asked for them. Armed here rather
  // than left to setBank's own lookup: the bank crossed as a copy, so its identity — and
  // with it the arrangement the markers live on — did not survive the trip. Steps, not
  // bars, and already clamped: the same resolver the engine and the desk use ran in the
  // caller against the same bar count this buffer was sized from.
  if (loop) {
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
  const buildUntil = async (limit) => {
    while (stepAt < steps && Audio.nextTime < limit) {
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
  const canSuspend = typeof ctx.suspend === 'function';
  // A walk that throws inside a suspension must fail the RENDER, not vanish into a
  // swallowed rejection — without this, a bad bank would come back as a "successful"
  // render that goes silent at the bar the walk died on.
  let walkError = null;
  if (!canSuspend) {
    await buildUntil(Infinity);
  } else {
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
            onProgress?.(frame / N);
          } catch (e) {
            walkError = walkError || e;
          } finally { ctx.resume(); }
        })
        .catch(() => {});
    }
  }

  const buf = await ctx.startRendering();
  if (walkError) throw walkError;
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

  return { outL: L, outR: R, frames: L.length, seconds: L.length / sampleRate, peak, percussion };
}

/** Interleave a stereo pair into one Float32Array — L,R,L,R. */
export function interleave(outL, outR) {
  const inter = new Float32Array(outL.length * 2);
  for (let i = 0; i < outL.length; i++) { inter[i * 2] = outL[i]; inter[i * 2 + 1] = outR[i]; }
  return inter;
}
