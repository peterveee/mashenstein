// tools/lib/beat-detect.js — the estimates that stand in for the sequencer.
//
// In the game every beat and every kit hit is known exactly, because the
// sequencer scheduled them. For an imported file all of it is inferred, so what
// this suite pins is the properties the inference has to have: the right octave,
// a downbeat-aligned non-negative clock, a grid that follows a drummer, and no
// randomness anywhere.
//
// The fixtures are deliberately drums-shaped rather than clicks. An earlier
// version used a 55Hz sine kick against a noise snare, which produced six times
// more spectral flux on the kick than on the backbeat — and a signal like that
// genuinely IS more self-similar at half tempo, so it failed the detector for
// being right. Real drums do not do that.
import assert from 'node:assert/strict';
import {
  onsetEnvelope, estimateTempo, trackBeats, pickOnsets, detectRhythm, buildGrid,
} from '../tools/lib/beat-detect.js';

const ok = (message) => console.log(`ok: ${message}`);
const SR = 44100;

/**
 * A drum pattern at a known tempo.
 * @param accent  level of beats 2,3,4 relative to beat 1
 * @param sub     level of an offbeat eighth, or 0 for none
 * @param ramp    fractional tempo increase across the whole clip
 */
function drums({ bpm, seconds, phase = 0, accent = 1, sub = 0, ramp = 0, seed = 7 }) {
  let s = seed >>> 0;
  const rnd = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  const n = Math.round(SR * seconds);
  const pcm = new Float32Array(n);
  const hits = [];
  const put = (t, amp) => {
    const at = Math.round(t * SR);
    for (let i = 0; i < 1800 && at + i < n; i++) {
      const e = Math.exp(-i / 300);
      pcm[at + i] += amp * e * (0.55 * Math.sin(2 * Math.PI * 60 * (i / SR)) + 0.45 * (rnd() * 2 - 1));
    }
  };
  let t = phase;
  let beat = 0;
  while (t < seconds) {
    put(t, beat % 4 === 0 ? 1 : accent);
    hits.push(t);
    const cur = bpm * (1 + (ramp * t) / seconds);
    if (sub) put(t + 30 / cur, sub);
    t += 60 / cur;
    beat++;
  }
  for (let i = 0; i < n; i++) pcm[i] += 0.06 * Math.sin(2 * Math.PI * 220 * (i / SR));
  return { pcm, hits };
}

// ---- tempo, across the reportable range ----------------------------------

for (const [bpm, seconds] of [[63, 30], [90, 26], [128, 24], [150, 24], [172, 24]]) {
  const { bpm: got } = detectRhythm(drums({ bpm, seconds }).pcm, SR);
  assert.ok(Math.abs(got - bpm) < 0.5, `expected ${bpm}, got ${got.toFixed(2)}`);
  ok(`${bpm} BPM recovered as ${got.toFixed(2)}`);
}

// ---- the octave traps ----------------------------------------------------
//
// Every periodicity measure is octave-blind, so these are the cases that decide
// whether the harmonic comb, the coverage-times-strength grid score and the
// tempo prior are actually doing their jobs.

{
  // Only beat 1 is accented, so the strongest periodicity in the signal is the
  // BAR, at 37.5 BPM — which folds to 75. Must still read 150.
  const { bpm } = detectRhythm(drums({ bpm: 150, seconds: 24, accent: 0.25 }).pcm, SR);
  assert.ok(Math.abs(bpm - 150) < 0.5, `downbeat-accented 150 read as ${bpm.toFixed(2)}`);
  ok('a bar-accented pattern is not mistaken for its own bar rate');
}

{
  // A backbeat noticeably weaker than the kick. The autocorrelation genuinely
  // peaks at half speed here; the prior is what has to carry it.
  for (const bpm of [128, 172]) {
    const got = detectRhythm(drums({ bpm, seconds: 24, accent: 0.6 }).pcm, SR).bpm;
    assert.ok(Math.abs(got - bpm) < 0.5, `weak backbeat at ${bpm} read as ${got.toFixed(2)}`);
  }
  ok('a weak backbeat does not halve the tempo');
}

{
  // A faint offbeat subdivision must not double it.
  const got = detectRhythm(drums({ bpm: 90, seconds: 26, sub: 0.25 }).pcm, SR).bpm;
  assert.ok(Math.abs(got - 90) < 0.5, `faint offbeat at 90 read as ${got.toFixed(2)}`);
  ok('a faint offbeat subdivision does not double the tempo');
}

{
  // And where it is genuinely ambiguous — an offbeat at half the level of the
  // beat is as defensible a backbeat as it is a subdivision — the answer may go
  // either way, but the other octave has to be ON THE BALLOT, because that is
  // what the page's x2 and /2 buttons reach for. Detection is the convenience
  // here; the manual override is the interface.
  const r = detectRhythm(drums({ bpm: 90, seconds: 26, sub: 0.5 }).pcm, SR);
  const offered = r.candidates.map((c) => c.bpm);
  assert.ok(offered.some((b) => Math.abs(b - 90) < 1.5),
    `90 must be reachable, candidates were ${offered.map((b) => b.toFixed(1)).join(', ')}`);
  assert.ok(offered.some((b) => Math.abs(b - 180) < 3), 'and so must 180');
  ok('on a genuinely ambiguous pattern both octaves are offered as candidates');
}

// ---- phase, downbeat and the shape of the beat clock ---------------------

{
  const { bpm, beatAt, barBeats } = detectRhythm(drums({ bpm: 128, seconds: 24, phase: 0.137 }).pcm, SR);
  assert.ok(Math.abs(bpm - 128) < 0.5);
  assert.equal(barBeats, 4);
  // The first real downbeat is at 0.137s and must land on a whole bar.
  const atDownbeat = beatAt(0.137);
  assert.ok(Math.abs(atDownbeat - Math.round(atDownbeat / 4) * 4) < 0.12,
    `beat at the true downbeat was ${atDownbeat.toFixed(3)}, not a multiple of 4`);
  ok('beat 0 is a downbeat: the true downbeat lands on a whole bar');

  // ringRotationAt() generates seeded 4/8/16-beat holds FORWARD from beat 0 and
  // VJ MEGAMIX cycles on 16-bar phrases, so a negative beat would put every
  // phrase boundary off the bar for the whole song.
  let lowest = Infinity;
  for (let t = 0; t < 24; t += 1 / 60) lowest = Math.min(lowest, beatAt(t));
  assert.ok(lowest >= 0, `beat went negative: ${lowest.toFixed(3)}`);
  ok(`the beat clock never goes negative (minimum ${lowest.toFixed(3)})`);
}

// ---- tempo drift ---------------------------------------------------------

{
  // A click track that speeds up by 3% across a minute. A constant grid cannot
  // hold this; the dynamic-programming tracker is the whole reason it does.
  const { pcm, hits } = drums({ bpm: 128, seconds: 60, ramp: 0.031 });
  const r = detectRhythm(pcm, SR);
  assert.ok(r.beatTimes && r.beatTimes.length > 100, 'the tracker must return a grid');
  assert.ok(r.drift > 0.01, `drift should be flagged, got ${(r.drift * 100).toFixed(2)}%`);
  const last = r.beatTimes[r.beatTimes.length - 1];
  const nearest = Math.min(...hits.map((h) => Math.abs(h - last)));
  assert.ok(nearest < 0.06,
    `the last tracked beat is ${(nearest * 1000).toFixed(0)}ms from a real one`);
  ok(`a 3% tempo ramp stays locked to ${(nearest * 1000).toFixed(0)}ms at the end, and is flagged`);
}

// ---- onsets --------------------------------------------------------------

{
  const { pcm, hits } = drums({ bpm: 120, seconds: 20 });
  const r = detectRhythm(pcm, SR);
  assert.ok(Math.abs(r.percussionAt.length - hits.length) <= 2,
    `expected about ${hits.length} hits, got ${r.percussionAt.length}`);
  let worst = 0;
  for (const got of r.percussionAt) {
    worst = Math.max(worst, Math.min(...hits.map((h) => Math.abs(h - got))));
  }
  assert.ok(worst < 0.03, `worst onset was ${(worst * 1000).toFixed(0)}ms out`);
  ok(`${r.percussionAt.length} onsets found, worst ${(worst * 1000).toFixed(0)}ms from truth`);

  // Sensitivity is a real control, not a decoration.
  const env = r.envelope;
  const loose = pickOnsets(env.percussive, env.frameRate, { delta: 0.05, offset: env.offset });
  const tight = pickOnsets(env.percussive, env.frameRate, { delta: 1.0, offset: env.offset });
  assert.ok(loose.length >= tight.length, `${loose.length} vs ${tight.length}`);
  ok('a lower onset threshold never finds fewer hits than a higher one');
}

// ---- buildGrid -----------------------------------------------------------

{
  const constant = buildGrid({ bpm: 120, barBeats: 4, t0: 0 });
  assert.equal(constant.beatAt(0), 0);
  assert.equal(constant.beatAt(1), 2);
  assert.ok(Math.abs(constant.timeAt(2) - 1) < 1e-9, 'timeAt inverts beatAt');
  ok('a constant grid is exactly (t - t0) * bpm / 60, and invertible');

  const tracked = buildGrid({
    beatTimes: [0.5, 1.0, 1.5, 2.0, 2.5], bpm: 120, downbeat: 0, barBeats: 4,
  });
  for (const beat of [4, 5.5, 7]) {
    assert.ok(Math.abs(tracked.beatAt(tracked.timeAt(beat)) - beat) < 1e-6,
      `timeAt/beatAt disagree at beat ${beat}`);
  }
  assert.ok(tracked.beatAt(0) >= 0, 'a tracked grid is non-negative from t=0');
  ok('a tracked grid round-trips through timeAt and beatAt');

  // An uneven grid is the point of tracking at all: the clock has to stretch.
  const uneven = buildGrid({ beatTimes: [0, 0.5, 1.2, 1.7], bpm: 120, downbeat: 0 });
  assert.ok(Math.abs(uneven.beatAt(0.85) - (uneven.beatAt(0.5) + 0.5)) < 1e-6,
    'halfway through a long gap should be half a beat');
  ok('the beat clock interpolates across uneven gaps');
}

// ---- determinism ---------------------------------------------------------

{
  const { pcm } = drums({ bpm: 128, seconds: 12 });
  const a = detectRhythm(pcm, SR);
  const b = detectRhythm(pcm, SR);
  assert.equal(a.bpm, b.bpm);
  assert.equal(a.confidence, b.confidence);
  assert.deepEqual(a.percussionAt, b.percussionAt);
  assert.deepEqual(Array.from(a.beatTimes), Array.from(b.beatTimes));
  ok('two runs over the same samples are identical — no Math.random in the detector');
}

// ---- the generator seam the page loads through ---------------------------

{
  const { pcm } = drums({ bpm: 128, seconds: 12 });
  const steps = onsetEnvelope(pcm, SR);
  assert.ok(steps.full.length > 100 && steps.low.length === steps.full.length);
  assert.ok(Math.abs(steps.frameRate - SR / 512) < 1e-6, 'hop 512 at 44.1kHz is 86.13Hz');
  const tempo = estimateTempo(steps.full, steps.frameRate);
  assert.ok(Math.abs(tempo.bpm - 128) < 0.5);
  const tracked = trackBeats(steps.full, steps.frameRate, tempo.bpm);
  assert.ok(tracked.beatTimes.length > 20);
  assert.ok(tracked.indices.every((v, i, all) => i === 0 || v > all[i - 1]),
    'the traceback must come back in order');
  ok('the primitives compose the way detectRhythm composes them');
}

console.log('beat-detect: all checks passed');
