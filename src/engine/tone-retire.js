// TONE'S SOURCES, LET END BEFORE THEY ARE UNPLUGGED (21 Oct 2026).
//
// Every note a pooled Tone voice plays (CRLS-1, RMND-2) starts a fresh ToneOscillatorNode,
// and Tone retires it like this (tone/build/esm/source/OneShotSource.js, `_stopGain`): at the
// stop time it books the native oscillator's stop for `now()` — the current time PLUS Tone's
// look-ahead — then disposes it on the next idle callback or 10 ms later. Disposing
// disconnects it. A source nothing pulls never reaches its stop time and never fires
// `ended`, so the oscillator disconnected before its own stop runs on, unheard, for the rest
// of the session: tools/audio-audit.js counted 960 of them after 32 s of one RMND-2 preset on
// eight lanes, and 67 lanes of the game's songs did it (the "1,400 Tone oscillators" of
// Rhythm Bankruptcy). Unpulled, they cost the audio thread little; held, they cost memory on
// a phone, and a phone kills the page when that runs out.
//
// THE SAME, WHEN A SONG STOPS (found by `audio-audit.js song`, 21 Oct): every Tone effect and
// pool a song built — Filter, StereoWidener, Tremolo, AutoPanner, each voice slot — holds
// Signals, each a ToneConstantSource started for good, and disposing them disconnects the
// whole chain at once. Waiting for `ended` alone cannot help there: nothing downstream is
// pulled any more either. 70–285 sources were left running by every stop of a game song.
//
// So the dispose waits for the native source's own `ended`. The node is silent by then — Tone
// has already taken its gain to zero — and stays connected only until the stop it was given,
// which a pooled note reaches within Tone's look-ahead. One still running a second later is
// one nothing pulls any more, and goes to the drain (engine/drain.js): stopped now and kept
// pulled until it has ended. Its own dispose runs on `ended`, or after a while regardless.
// Tone does not export ToneConstantSource, so its class is imported from its file — the same
// module the bundle uses (the package has no exports map).
import * as Tone from 'tone';
import { ToneConstantSource } from 'tone/build/esm/signal/ToneConstantSource.js';
import { drainSources } from './drain.js';

const DRAIN_AFTER_MS = 1000;
const LATE_DISPOSE_MS = 10000;

/** Patch Tone's one-shot sources once (live contexts only; an offline render is unchanged). */
export function installToneSourceRetire() {
  for (const [C, nativeKey] of [[Tone.ToneOscillatorNode, '_oscillator'], [Tone.ToneBufferSource, '_source'], [ToneConstantSource, '_source']]) {
    const P = C?.prototype;
    if (!P || P.__retireAfterEnded) continue;
    P.__retireAfterEnded = true;
    const start = P.start;
    P.start = function (...a) {
      const r = start.apply(this, a);
      const native = this[nativeKey];
      try { native?.addEventListener?.('ended', () => { this.__nativeEnded = true; }, { once: true }); } catch { /* a stand-in */ }
      return r;
    };
    const dispose = P.dispose;
    P.dispose = function (...a) {
      const native = this[nativeKey];
      // Tone disposes some sources twice (a Signal's output, then the Signal its source): the
      // second call must not run the real dispose, whose disconnect() would take the source
      // off the drain before it has ended.
      if (this.__retireWaiting) return this;
      if (this.__nativeEnded || !native?.addEventListener || this.context?.isOffline
        || this._startTime === -1) {
        if (this.__retireDone) return this;
        this.__retireDone = true;
        return dispose.apply(this, a);
      }
      this.__retireWaiting = true;
      const done = () => {
        if (this.__retireDone) return;
        this.__retireDone = true;
        dispose.apply(this, a);
      };
      native.addEventListener('ended', done, { once: true });
      setTimeout(() => { if (!this.__retireDone) drainSources([native]); }, DRAIN_AFTER_MS);
      setTimeout(done, LATE_DISPOSE_MS);
      return this;
    };
  }
}
