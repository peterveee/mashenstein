// The desk's own bounce: this song, as a WAV, rendered in this browser.
//
// It used to be a POST to the mixer server, which launched headless Chromium and
// rendered there. That worked, and it meant the one thing the desk is for — hearing
// the mix, then keeping it — was the one thing the deployed desk could not do. Web
// Audio is Web Audio: the render was already running in a browser, just not in
// THIS one. So it runs here, and `npm run mixer` and the static build at /SongMixer/
// now bounce through exactly the same path.
//
// What this module is, precisely: the Node half of render-bank-browser.js — the
// half that resolves everything needing a track IDENTITY before the bank crosses
// into the render context, because a structured clone arrives without one. The
// other half, the render itself, is lib/render-bank-page.js, shared with the
// command-line tools. Nothing here reimplements audio; nothing here reimplements
// the walk either.
import { barPlan } from '../src/engine/lanes.js';
import {
  applyArrangement, bpmOf, swingOf, loopOf, loopSteps, SWING_STRAIGHT,
} from '../src/data/arrangements.js';
import { wavBuffer, SR } from './lib/wav.js';
import { loudness, gainToTarget, LOUDNESS_TARGET } from './lib/loudness.js';
// The seed itself, not a copy of the number: a song bounced here and the same song
// bounced by `node tools/render-track.js` get the same noise, not merely noise of the
// same character.
import { DEFAULT_SEED } from './lib/render-bank-page.js';

// How long a frame gets to load and say hello. Not a render timeout — a render is
// minutes by design and must never be cut off — just the guard against a frame that
// 404s or throws on the way up, which would otherwise hang the button forever.
const READY_TIMEOUT_MS = 30000;

let frameSeq = 0;

/**
 * Render one bank through a fresh hidden iframe and take the samples back.
 *
 * One frame per render, thrown away afterwards: see the note at the top of
 * tools/mixer-render-entry.js for why a second render cannot share the first's.
 */
function renderInFrame(frameUrl, args, { onStage } = {}) {
  return new Promise((resolve, reject) => {
    const id = ++frameSeq;
    const frame = document.createElement('iframe');
    // Out of the layout and out of the tab order, rather than `hidden` — a hidden
    // iframe is still a document, and this one has work to do.
    frame.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;border:0;visibility:hidden';
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('title', 'render');
    // A fresh URL every time. The dev server rebuilds this document per request, but
    // the browser has no way to know that, and a cached frame is a frame whose engine
    // is however old the last render was.
    frame.src = `${frameUrl}${frameUrl.includes('?') ? '&' : '?'}n=${id}`;

    let settled = false;
    let readyTimer = 0;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(readyTimer);
      removeEventListener('message', onMessage);
      frame.remove();
      fn(value);
    };

    function onMessage(e) {
      // Only this frame's letterbox. The desk has other iframes in it and other
      // things post to windows.
      if (e.source !== frame.contentWindow || e.data?.mashRender !== true) return;
      const msg = e.data;
      if (msg.type === 'ready') {
        clearTimeout(readyTimer);
        onStage?.('rendering', 0);
        frame.contentWindow.postMessage({ mashRender: true, type: 'render', id, args }, '*');
        return;
      }
      if (msg.type === 'progress') {
        if (msg.id === id) onStage?.('rendering', msg.fraction);
        return;
      }
      if (msg.type === 'crashed') { done(reject, new Error(msg.error || 'the render frame crashed')); return; }
      if (msg.type !== 'done' || msg.id !== id) return;
      if (!msg.ok) { done(reject, new Error(msg.error || 'the render failed')); return; }
      done(resolve, msg);
    }

    addEventListener('message', onMessage);
    frame.addEventListener('error', () => done(reject, new Error('the render frame did not load')));
    readyTimer = setTimeout(
      () => done(reject, new Error('the render frame did not load — try again, and check the mixer server is still up')),
      READY_TIMEOUT_MS,
    );
    onStage?.('loading');
    document.body.appendChild(frame);
  });
}

/**
 * This song, bounced, measured, and encoded.
 *
 * `arrangement` is required rather than optional, and `null` is a real answer: the
 * desk always has an opinion about the shape of the song in front of it, and a
 * bounce that ignored a just-undone arrangement would render something nobody is
 * listening to. It goes to `setArrangement` in the frame, which is the same door
 * every note and bar edit on the desk goes through.
 *
 * `onStage(stage, fraction)` reports 'loading', then 'rendering' with a 0…1 fraction
 * that moves as the offline context passes each checkpoint, then 'measuring'. The
 * fraction stays at 0 on a browser whose OfflineAudioContext cannot be suspended —
 * the render is unaffected, it just has nothing to say about its own position.
 *
 * @returns {Promise<{wav: Uint8Array, seconds: number, peak: number, peakDb: number,
 *   lufs: number, toTarget: number, clipping: boolean, loop: object|null, steps: number}>}
 */
export async function bounceWav(bank, {
  trackId, mix, arrangement = null, repeat = 1, frameUrl,
  seed = DEFAULT_SEED, tail = 2.0, onStage,
}) {
  // Everything below this line is resolved HERE, in the desk, for one reason: the
  // bank reaches the frame as a structured clone, so `trackIdOf` on it would find
  // nothing and every lookup keyed on identity would silently come back empty. The
  // table is the desk's live arrangement rather than the file's, because the whole
  // point of a bounce is "what I am hearing, written down".
  const table = { [trackId]: arrangement };

  // The tempo and the feel the song is PLAYED at, written onto the bank before it
  // crosses. Sizing the buffer from the composed tempo while the engine plays the
  // arranged one would cut a slowed-down song off before its end; applying the
  // tempo but not the swing would be the right speed at the wrong groove, which is
  // worse than either alone because it sounds nearly right.
  const played = bpmOf(bank, trackId, table);
  const swung = swingOf(bank, trackId, table);
  const forFrame = played === bank.bpm && swung === (bank.swing ?? SWING_STRAIGHT)
    ? bank
    : { ...bank, bpm: played, swing: swung };

  // How many bars there ARE, counted off the arrangement rather than off the song.
  //
  // `bank` here is the composition — the desk snapshots `resolveTrack(id).bank` — and
  // the arrangement is where the desk's bar edits live, so counting the bank's own
  // order sizes the render from a form the desk may have lengthened or shortened.
  // Muting bars does not move this number, which is why the mute mask was never the
  // thing that showed it: a silenced bar keeps its place in time. Duplicate, Insert
  // silence and Delete bars all do move it, and the sequencer walks
  // `plan[bar % plan.length]` — so a render sized from the composed length runs a
  // shortened song PAST its end and starts the top of it again inside the WAV, and
  // cuts a lengthened one off before its last bar.
  const bars = barPlan(applyArrangement(bank, trackId, table)).length;
  // The song's own way in and loop, against that same bar count, so the two cannot
  // disagree by a bar.
  const loop = loopSteps(loopOf(bank, trackId, table), bars);
  // The way in once, then `repeat` passes of the loop — rather than `repeat` passes of
  // the whole form. A song with markers but no region falls back to the form from its
  // start bar, which is what it sounds like.
  const steps = loop
    ? (loop.loop
      ? loop.loop.start - loop.start + repeat * (loop.loop.end - loop.loop.start)
      : bars * 16 - loop.start)
    : bars * repeat * 16;

  const args = {
    // `steps` is always given, so `blocks` is only the frame's fallback for a caller
    // that has none. Sent in step with it rather than left to disagree: an odd bar
    // count rounds up to a whole block, which is a bar of silence the walk never takes.
    bank: forFrame, blocks: Math.ceil((bars * repeat) / 2), steps,
    tail, seed, sampleRate: SR, mix, trackId, arrangement,
    ...(loop ? { loop } : {}),
  };
  let out;
  try {
    out = await renderInFrame(frameUrl, args, { onStage });
  } catch (err) {
    // The just-in-time walk states its own completeness (see renderBankPage), and a
    // browser whose `OfflineAudioContext.suspend` exists but does not run the
    // checkpoints fails that check rather than handing back a file that goes silent
    // halfway through. One retry, with the whole walk built up front — slower, and
    // it has no checkpoints to miss.
    //
    // In a FRESH frame, never the one that just failed: its context is carrying a
    // partial schedule, and half a render cannot be finished, only replaced. Each
    // call to `renderInFrame` builds its own frame, so this is that by construction.
    if (!/render walk incomplete/.test(err?.message || '')) throw err;
    console.warn('[bounce] just-in-time render walk did not complete —'
      + ' retrying with the whole walk up front.', err.message);
    out = await renderInFrame(frameUrl, { ...args, upfront: true }, { onStage });
  }

  onStage?.('measuring', 1);
  const m = loudness([out.outL, out.outR]);
  // At unity, NOT peak-normalised: the whole point is to hear the mix as balanced,
  // and normalising would silently undo the master trim being set.
  const wav = wavBuffer([out.outL, out.outR], 1);
  return {
    wav,
    seconds: out.seconds,
    peak: out.peak,
    peakDb: m.peakDb,
    lufs: m.lufs,
    toTarget: gainToTarget(m.lufs, LOUDNESS_TARGET),
    clipping: out.peak > 1,
    loop,
    steps,
  };
}
