// THE DRAIN — a source nothing pulls never ends (21 Oct 2026).
//
// WebKit renders a node only when something downstream asks for it, and a scheduled source
// fires `ended` from inside its own render. So a source whose graph has been taken down
// before it reached its stop time — a note still ringing when the song changes, a Tone
// Signal disposed with the effect around it — is never rendered again, never reaches its
// stop, and stays a live source for the rest of the session. tools/audio-audit.js `song`
// counted 70–285 of them left by every stop of a game song.
//
// `drainSources` stops them now and hangs them on a silent gain to the speakers for the
// quantum it takes them to end, then takes them off. One drain per context, never torn
// down: only sources come and go on it, so its own summing junction is never destroyed
// (memory webkit-summing-junction-crash). Used only for what is left over, never per note.
const drains = new WeakMap();
const LET_GO_MS = 1000;

function drainFor(ctx) {
  let d = drains.get(ctx);
  if (!d) {
    d = ctx.createGain();
    d.gain.value = 0;
    d.connect(ctx.destination);
    drains.set(ctx, d);
  }
  return d;
}

/** Stop `sources` now and keep them pulled until they have ended. Live contexts only. */
export function drainSources(sources) {
  for (const src of sources) {
    const ctx = src?.context;
    if (!ctx || typeof ctx.startRendering === 'function' || ctx.state === 'closed') continue;
    let drain;
    try { drain = drainFor(ctx); src.connect(drain); } catch { continue; }
    let off = false;
    const letGo = () => { if (off) return; off = true; try { src.disconnect(drain); } catch { /* already gone */ } };
    src.addEventListener?.('ended', letGo, { once: true });
    try { src.stop(ctx.currentTime); } catch { /* never started, or already stopped */ }
    setTimeout(letGo, LET_GO_MS);
  }
}
