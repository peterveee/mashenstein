/*
 * A TNGR-2 lane that does not enter until after the render's just-in-time horizon.
 *
 * The bounce walks the schedule lazily — the graph stands four seconds ahead of the render
 * head and no further, because an offline graph built whole processes every node for the
 * whole song and a twenty-lane import then bounces in minutes instead of seconds. The
 * steps past that horizon are scheduled from inside `ctx.suspend` callbacks, which run
 * DURING `startRendering()`.
 *
 * TNGR-2 cannot live with that. Its worklet takes its schedule at CONSTRUCTION — see
 * docs/TNGR-2-completion-spec.md §3 finding (b) — so the lane has to be built before the
 * render starts, from a schedule that is already complete. Under the lazy walk it was
 * built from the first four seconds alone, and a part that enters later simply was not in
 * the bounce: no error, no warning, because a lane with nothing collected builds nothing
 * and has nothing to complain about.
 *
 * This is that song in miniature: one TNGR-2 lane, silent for the first eight seconds, and
 * the only thing in the mix. If the walk goes lazy again, this renders silence.
 */
import assert from 'node:assert/strict';
import { openRenderer, SR } from '../tools/lib/render-bank-browser.js';

// 60 bpm, so a sixteenth is a quarter-second and one 32-step block is eight of them. The
// note lands at six seconds: past the four-second horizon the lazy walk builds to, and
// past the first checkpoint after it. Measured with the guard removed, a note here builds
// ZERO lanes and renders silence, while the same note at step 0 renders normally.
const LATE_STEP = 24;
const bank = {
  bpm: 60,
  chordsVoice: 'tngrBrassSection',
  chords: [
    ...Array(LATE_STEP).fill(null),
    [220, 277.18, 329.63],
    ...Array(31 - LATE_STEP).fill(null),
  ],
};

// A SECOND bank, for the other half of handing a schedule over in stretches: notes on
// both sides of the checkpoints, each one short, with silence written between them.
//
// A note-off names its note-on by event id, and the bookings are emptied at every
// handover — so a counter that restarted with each stretch had the second stretch's notes
// wearing the first stretch's names. The note-offs then ended notes that had already
// finished, and the notes they were meant for played on to the end of the song. One
// sustained French Horn, under everything.
const GAPPED = {
  bpm: 60,
  chordsVoice: 'tngrBrassSection',
  // A LONG note first, still sounding while later stretches are handed over, then short
  // ones after it. The long one is the note that gets stranded: the later stretches reuse
  // its event id, their note-offs end their own notes, and nothing is ever named that can
  // end the first. It then plays to the end of the render under everything else.
  chordsLen: Array.from({ length: 32 }, (_, i) => (i === 0 ? 5 : 0.5)),
  chords: Array.from({ length: 32 }, (_, i) => {
    if (i === 0) return [110];
    return i % 8 === 0 ? [220, 277.18, 329.63] : null;
  }),
};

const rms = (render, from, to) => {
  let sum = 0;
  let n = 0;
  for (let i = Math.floor(from * SR); i < Math.min(render.outL.length, Math.floor(to * SR)); i++) {
    sum += render.outL[i] ** 2 + render.outR[i] ** 2;
    n += 2;
  }
  return Math.sqrt(sum / Math.max(1, n));
};

const renderer = await openRenderer();
try {
  const render = await renderer.render(bank, { repeat: 1, tail: 3, mix: null, trackId: null });
  // The walk stays LAZY — forcing it up front is what made a bounce crawl — and the lane
  // is still built exactly once, at the checkpoint that first has notes for it.
  assert.equal(render.tngr2Walk, 'jit',
    'a TNGR-2 bank keeps the just-in-time walk rather than building the song up front');
  assert.equal(render.tngr2Lanes, 1, 'and its lane is built once, not once per checkpoint');
  const before = rms(render, 1, 5.5);
  const after = rms(render, 6.2, 7.5);
  assert(after > 1e-5,
    `a TNGR-2 lane entering at ${LATE_STEP / 4}s is in the bounce (${after}) — a lazy walk`
    + ' builds its worklet from an empty schedule and drops the part in silence');
  assert(after > before * 20,
    `and it is the note that sounds, not room tone (${after} against ${before} before it)`);
  // ---- and the notes end when they are told to --------------------------------
  const gapped = await renderer.render(GAPPED, { repeat: 1, tail: 3, mix: null, trackId: null });
  // Each note is half a second long and they are two seconds apart, so the second half of
  // every gap is release tail at most — and by the last gap, well past every note's.
  const played = rms(gapped, 0.1, 0.5);
  // After the last note and its release: the long one ended at six seconds, the last short
  // one at 7.5, so by nine there should be nothing left sounding at all.
  // The bank is eight seconds and the render carries three of tail. The long note ends at
  // five, the last short one at six and a half, so the last second and a half of the
  // buffer is past every release this bank asks for: nothing should be sounding there.
  const tail = rms(gapped, 9.4, 10.8);
  const worst = tail;
  assert(played > 1e-4, `the gapped bank sounds at all (${played})`);
  assert(worst < played * 0.05,
    `every note ends where it was told to (tail ${worst.toExponential(2)} against`
    + ` ${played.toExponential(2)} played) — an event id reused across handovers strands`
    + ' the note that held it, and it sounds under the rest of the song');
  console.log(`TNGR-2 JIT BOUNCE: PASSED (late entry ${after.toFixed(6)}, before ${before.toFixed(6)},`
    + ` tail ${worst.toExponential(2)})`);
} finally {
  await renderer.close();
}
