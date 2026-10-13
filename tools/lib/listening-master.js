// A BOUNCE FOR LISTENING — the desk's Bounce, brought up to the level of a record.
//
// The songs are mixed for the game: levelled at -21 LUFS (menus -24) by tools/song-levels.js,
// with the headroom the sound effects play into. A bounce at that level is the mix as the game
// hears it, and as a track on its own it is 5–8 dB softer than anything it sits next to in a
// playlist (Peter, 13 Oct 2026: "when I am bouncing to wave it is to listen back to them as
// stand alone music tracks").
//
// So the finished WAV goes through the desk's own L7 limiter — the one on the songs' masters —
// played the way an L2 is: the ceiling at LISTENING_CEILING_DB and the threshold pulled down by
// however far the song is under LISTENING_TARGET. One gain for the whole file, so the balance
// inside the song is the mix's own; the limiter only acts on the peaks that gain pushes over.
// Run over the rendered samples in an OfflineAudioContext of its own, a few seconds, rather
// than rendering the song a second time with the gain in front of its master. Limiting takes a
// little loudness off the peaks it holds, so the result is measured and topped up, at most twice.
//
// Not for stems (AAF), freezes or anything measured: those have to stay at unity, against each
// other and against the game.
import { loudness } from './loudness.js';
import { createEffect, EFFECT_LATENCY_MS } from '../../src/engine/effects.js';

/** Where a streaming service plays music; a game song bounced for listening lands here. */
export const LISTENING_TARGET = -14;
/** L7's ceiling: a dB under full scale, so the inter-sample overs a player makes stay clear. */
export const LISTENING_CEILING_DB = -1;

/** The channels through L7 with `gainDb` of drive, its look-ahead taken back off the front. */
async function throughL7(chans, gainDb, ceilingDb, sampleRate) {
  const n = chans[0].length;
  const lag = Math.round(((EFFECT_LATENCY_MS.l7 ?? 3) / 1000) * sampleRate);
  const ctx = new OfflineAudioContext(2, n + lag, sampleRate);
  const buf = ctx.createBuffer(2, n, sampleRate);
  buf.copyToChannel(chans[0], 0);
  buf.copyToChannel(chans[1] || chans[0], 1);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  // The gain IS the gap between L7's threshold and its ceiling. Its threshold stops at -30
  // and at 0; a song that needs more than that, or needs turning down, gets the rest here.
  const threshold = Math.max(-30, Math.min(0, ceilingDb - gainDb));
  const pre = ctx.createGain();
  pre.gain.value = 10 ** ((gainDb - (ceilingDb - threshold)) / 20);
  const l7 = createEffect('l7', { threshold, ceiling: ceilingDb, release: 0.06, lookahead: 3, arc: 1 }, ctx);
  if (!l7) throw new Error('the L7 limiter could not be built');
  src.connect(pre);
  pre.connect(l7.node.input);
  l7.node.output.connect(ctx.destination);
  src.start(0);
  const out = await ctx.startRendering();
  return [out.getChannelData(0).slice(lag, lag + n), out.getChannelData(1).slice(lag, lag + n)];
}

/**
 * `channels` ([L, R]) at LISTENING_TARGET, held under LISTENING_CEILING_DB by L7. Returns the
 * new channels and what was done: the drive, and the result measured. Silence comes back as
 * it went in.
 */
export async function masterForListening(channels, {
  sampleRate = 44100, target = LISTENING_TARGET, ceilingDb = LISTENING_CEILING_DB,
} = {}) {
  const chans = channels.filter(Boolean);
  const before = loudness(chans, sampleRate);
  if (!Number.isFinite(before.lufs)) {
    return { channels: chans, gainDb: 0, lufs: before.lufs, peakDb: before.peakDb, before };
  }
  let gainDb = target - before.lufs;
  let out = null;
  let after = null;
  for (let round = 0; round < 3; round++) {
    out = await throughL7(chans, gainDb, ceilingDb, sampleRate);
    after = loudness(out, sampleRate);
    const short = target - after.lufs;
    if (Math.abs(short) < 0.15) break;
    gainDb += short;
  }
  return { channels: out, gainDb, lufs: after.lufs, peakDb: after.peakDb, before };
}
