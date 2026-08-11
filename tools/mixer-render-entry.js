// The desk's render frame: the game's engine, an OfflineAudioContext, and a
// postMessage letterbox. Bundled into tools/mixer-render-shell.html and loaded by
// the mixer in a hidden iframe when you press Render WAV.
//
// It exists at all because `Audio` is a module singleton and `ensure()` binds one
// context for its lifetime — the desk has already bound it to the live realtime
// context so you can hear the song, and an offline render needs a context of its
// own. Node's renderer solves this by opening a fresh Chromium page per render
// (see render-bank-browser.js); a fresh iframe is the same trick without the
// Chromium. Fresh document, fresh module registry, fresh Audio, one render.
//
// ONE render per frame, for that same reason, and the desk throws the frame away
// afterwards. A second job here would find a context already bound and quietly
// render the song into the first one's graph.
import { renderBankPage } from './lib/render-bank-page.js';
import { Audio } from '../src/engine/audio.js';

// Lanes the mix has silenced cost nothing here, exactly as they cost nothing on the
// desk that opened this frame (see setSilentLaneSkip in src/engine/audio.js, and the
// matching opt-in in mixer-entry.js). A muted strip's fader is zero and every send taps
// downstream of it, so the notes this skips reach no output either way — the samples are
// identical and the walk is shorter, which on a twenty-lane import with half the rack
// muted is minutes of bounce.
//
// The flag's one honest cost cannot happen in a render: it is that un-muting reveals a
// lane only from the next scheduled step, and nothing un-mutes anything here. The mix
// arrived as a structuredClone snapshot taken at the click, there is no fader to move
// and no cabinet treatment to ramp one back up, and the frame renders exactly once.
//
// Set on the module rather than inside the shared walk on purpose. render-bank-page.js
// is also the command-line renderer's walk (see render-bank-browser.js), which renders
// game variants and transitions — the paths the flag is off for. This frame is the
// desk's alone.
Audio.setSilentLaneSkip(true);

let used = false;

// The samples come back as transfers rather than copies: a four-minute stereo
// render is ~85MB of float, and structured-cloning that is a stall the desk would
// feel. The frame is discarded straight after, so it has no use for them.
const reply = (msg, transfer) => parent.postMessage({ mashRender: true, ...msg }, '*', transfer);

addEventListener('message', async (e) => {
  const job = e.data;
  if (!job || job.mashRender !== true || job.type !== 'render') return;
  if (used) {
    reply({ type: 'done', id: job.id, ok: false, error: 'this render frame has already been used' });
    return;
  }
  used = true;
  try {
    // Progress rides the same letterbox as the result. Cheap messages — one number,
    // a couple of times a second — so they cost nothing next to the render.
    const r = await renderBankPage(job.args, {
      onProgress: (fraction) => reply({ type: 'progress', id: job.id, fraction }),
    });
    // Copied out of the AudioBuffer before transferring: those views belong to the
    // rendered buffer, and detaching them out from under it is not ours to do.
    const outL = new Float32Array(r.outL);
    const outR = new Float32Array(r.outR);
    reply(
      { type: 'done', id: job.id, ok: true, outL, outR, frames: r.frames, seconds: r.seconds, peak: r.peak, percussion: r.percussion },
      [outL.buffer, outR.buffer],
    );
  } catch (err) {
    reply({ type: 'done', id: job.id, ok: false, error: String(err?.stack || err?.message || err) });
  }
});

// A throw before or outside the handler above would otherwise leave the desk waiting
// on a frame that is never going to answer.
addEventListener('error', (e) => reply({ type: 'crashed', error: String(e.message || e) }));
addEventListener('unhandledrejection', (e) => reply({ type: 'crashed', error: String(e.reason?.message || e.reason) }));

reply({ type: 'ready' });
