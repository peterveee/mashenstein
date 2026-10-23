// ONE TONE CONTEXT PER AUDIOCONTEXT (23 Oct 2026).
//
// `Tone.setContext(rawContext)` wraps the raw context in a new Tone.Context every time it is
// called — and a Tone.Context is not free: it has a Transport (a clock on a ConstantSource), a
// Destination (two gains on the speakers) and a Ticker, which is a Web Worker. The rack set
// it on every song, so every song in the jukebox left a worker thread and a handful of nodes
// behind for good (work/local/_probe-ensure-memory.mjs: a worker a song, ~25 MB a song in
// WebKit). The wrapper is kept per raw context here and handed back, so Tone sees one
// context for as long as the AudioContext lives. Offline renders keep swapping to their own
// wrappers and back to the live one, as they did (voices.js prevToneCtx).
import * as Tone from 'tone';

const WRAPPERS = new WeakMap();

/** Make `ctx` Tone's current context, through the one wrapper this raw context has. */
export function useToneContext(ctx) {
  if (!ctx) return null;
  // Already a Tone context (it has a raw one inside): use it as it is.
  if (ctx.rawContext) { if (Tone.getContext() !== ctx) Tone.setContext(ctx); return ctx; }
  let wrapper = WRAPPERS.get(ctx);
  if (!wrapper) {
    Tone.setContext(ctx);
    wrapper = Tone.getContext();
    WRAPPERS.set(ctx, wrapper);
    return wrapper;
  }
  if (Tone.getContext() !== wrapper) Tone.setContext(wrapper);
  return wrapper;
}
