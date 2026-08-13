// The engine mirror in tools/lib/song-analysis.js, pinned.
//
// analyseSong() used to live inside tools/render-video.js. It moved out so the
// file-driven visualiser page could share it rather than grow a second copy — the
// repo deleted tools/lib/render-bank.js for exactly that reason. The digest below
// was taken from the pre-extraction code and must never move: it is the whole
// contract that a rendered clip still renders the same.
import assert from 'node:assert/strict';
import {
  analyseSong, prepareSong, retimeBeats, retimePercussion, applyDynamicsCurve,
} from '../tools/lib/song-analysis.js';

const ok = (message) => console.log(`ok: ${message}`);

// ---- the fixture, byte for byte what pinned the digest --------------------

const SR = 44100;

function fixturePcm(n) {
  let s = 0x12345678 >>> 0;
  const rnd = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0.30 * Math.sin(2 * Math.PI * 110 * t)
      + 0.15 * Math.sin(2 * Math.PI * 1500 * t)
      + 0.05 * (rnd() * 2 - 1);
    const into = i % 22050;
    if (into < 400) v += 0.5 * Math.exp(-into / 60) * (rnd() * 2 - 1);
    pcm[i] = v;
  }
  return pcm;
}

const FIXTURE_HITS = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
const FIXTURE_OPTS = { fps: 60, frames: 180, sampleRate: SR };
// Taken from tools/render-video.js BEFORE the extraction. If a change to
// song-analysis.js moves this, it has changed what every rendered video looks
// like — which may be intended, but is never incidental.
const GOLDEN = 'eaa2a2d2';

function digest(frames) {
  let h = 0x811c9dc5 >>> 0;
  const feed = (str) => {
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  };
  for (const f of frames) {
    feed([f.bass, f.mid, f.treble, f.level, f.dynamics, f.drums, f.hit, f.beat, f.beatPhase, f.beatPulse]
      .map((v) => v.toFixed(6)).join(','));
    feed(f.drumless ? '|1|' : '|0|');
    feed(Array.from(f.spectrum).join(''));
  }
  return h.toString(16).padStart(8, '0');
}

const pcm = fixturePcm(Math.round(SR * 3.5));
const base = analyseSong(pcm, 120, FIXTURE_HITS, FIXTURE_OPTS);

// ---- the byte-identity contract ------------------------------------------

assert.equal(digest(base), GOLDEN,
  'analyseSong no longer produces the numbers it produced inside render-video.js');
ok('golden digest matches the pre-extraction analyser');

assert.equal(base.length, FIXTURE_OPTS.frames);
ok('frames.length is exactly opts.frames (the --frames=N smoke path)');

assert.deepEqual(Object.keys(base[0]), [
  'bass', 'mid', 'treble', 'level', 'dynamics', 'drums', 'drumless', 'hit',
  'beat', 'beatPhase', 'beatPulse', 'spectrum',
]);
ok('frame shape is exactly what render-video.js structured-clones over CDP');

assert.ok(Array.isArray(base[0].spectrum), 'spectrum must default to a plain Array');
assert.equal(base[0].spectrum.length, 128);
assert.notEqual(base[0].spectrum, base[1].spectrum, 'each frame needs its own copy');
ok('spectrum is a fresh 128-element Array per frame by default');

assert.throws(() => analyseSong(pcm, 120, [], { fps: 60 }), /frames is required/);
ok('opts.frames is required rather than guessed from samples.length');

// ---- the options, proved wired rather than decorative ---------------------

assert.equal(digest(analyseSong(pcm, 120, FIXTURE_HITS, { ...FIXTURE_OPTS, gain: 1 })), GOLDEN);
ok('gain: 1 is bit-identical to no gain at all');

const bytes = analyseSong(pcm, 120, FIXTURE_HITS, { ...FIXTURE_OPTS, spectrumBytes: true });
assert.ok(bytes[0].spectrum instanceof Uint8Array);
assert.equal(digest(bytes), GOLDEN, 'the view layout must not change the numbers');
ok('spectrumBytes hands out Uint8Array views with identical contents');

assert.ok(!('waveform' in base[0]),
  'waveform must stay absent by default: render-video has never produced it, so NEON '
  + 'CATHEDRAL and OSCILLOSCOPE OVERDRIVE fall back to their synthetic sine in clips');
const waved = analyseSong(pcm, 120, FIXTURE_HITS, { ...FIXTURE_OPTS, waveform: true });
assert.equal(waved[0].waveform.length, 256);
assert.equal(digest(waved), GOLDEN, 'asking for waveform must not disturb anything else');
ok('waveform is opt-in, 256 bytes, and changes nothing else');

const at48 = analyseSong(pcm, 120, FIXTURE_HITS, { ...FIXTURE_OPTS, sampleRate: 48000 });
assert.notEqual(digest(at48), GOLDEN, 'sampleRate must move the band bin edges');
ok('sampleRate is wired through to the band edges');

const hits = [1, 0, 2];
analyseSong(pcm, 120, hits, FIXTURE_OPTS);
assert.deepEqual(hits, [1, 0, 2], 'percussionAt is the caller\'s array');
ok('analyseSong does not mutate the percussionAt it is handed');

const beated = analyseSong(pcm, 120, FIXTURE_HITS, { ...FIXTURE_OPTS, beatAt: (t) => t * 7 });
assert.ok(Math.abs(beated[60].beat - 7) < 1e-9, 'beatAt must replace the (t*bpm)/60 clock');
ok('beatAt overrides the procedural beat clock');

// ---- band and envelope behaviour -----------------------------------------

const tone = (hz, amp = 0.4) => {
  const n = Math.round(SR * 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin(2 * Math.PI * hz * (i / SR));
  return out;
};
const low = analyseSong(tone(100), 120, [], { ...FIXTURE_OPTS, frames: 100 }).at(-1);
assert.ok(low.bass > low.mid && low.bass > low.treble, `100Hz settled bass=${low.bass}`);
const high = analyseSong(tone(5000), 120, [], { ...FIXTURE_OPTS, frames: 100 }).at(-1);
assert.ok(high.treble > high.bass && high.treble > high.mid, `5kHz settled treble=${high.treble}`);
ok('a 100Hz tone lands in bass and a 5kHz tone in treble');

// A tone that stops, to prove the level envelope is asymmetric the way
// musicAnalysis() is: attack 0.45, release 0.12. Measured as time constants and
// not as raw deltas — four frames into the attack the gap left to close is already
// small, so the per-frame step there is smaller than a slow release's step down
// from full scale, and comparing those would say the opposite of the truth.
{
  const n = Math.round(SR * 2);
  const step = new Float32Array(n);
  for (let i = 0; i < n; i++) step[i] = i < SR ? 0.5 * Math.sin(2 * Math.PI * 400 * (i / SR)) : 0;
  const f = analyseSong(step, 120, [], { ...FIXTURE_OPTS, frames: 120 });
  const peak = Math.max(...f.slice(0, 60).map((x) => x.level));
  const riseFrames = f.findIndex((x) => x.level >= 0.9 * peak);
  const fallFrames = f.findIndex((x, i) => i > 60 && x.level <= 0.1 * peak) - 60;
  assert.ok(riseFrames > 0 && fallFrames > 0, `rise ${riseFrames} fall ${fallFrames}`);
  assert.ok(fallFrames > riseFrames * 2,
    `attack reached 90% in ${riseFrames} frames; release should need far more than `
    + `twice that to fall to 10%, took ${fallFrames}`);
  ok(`level attacks in ${riseFrames} frames and releases in ${fallFrames}`);
}

// ---- percussion -----------------------------------------------------------

{
  const f = analyseSong(pcm, 120, [1.0], { ...FIXTURE_OPTS, frames: 200 });
  const at = f.findIndex((x) => x.hit === 1);
  assert.equal(at, 60, 'the hit at 1.0s lands on frame 60 of a 60fps table');
  assert.ok(Math.abs(f[at + 1].hit - 0.55) < 1e-12, `next frame ${f[at + 1].hit}`);
  assert.ok(Math.abs(f[at + 2].hit - 0.3025) < 1e-12, `frame after ${f[at + 2].hit}`);
  ok('hit is 1 on the crossing frame, then falls by exactly 0.55 a frame');

  // 120bpm: a beat is 0.5s, so two beats after the hit is frame 60 + 60.
  assert.equal(f[119].drumless, false, 'still inside the two-beat window');
  assert.equal(f[121].drumless, true, 'past it');
  ok('drumless flips exactly two beats after the last hit');

  const dense = analyseSong(pcm, 120, Array.from({ length: 60 }, (_, i) => i * 0.125), {
    ...FIXTURE_OPTS, frames: 180,
  });
  assert.ok(dense.at(-1).drums > 0.95, `four hits a bar should saturate drums, got ${dense.at(-1).drums}`);
  ok('drums saturates under four hits per four beats');
}

// ---- prepareSong ----------------------------------------------------------

{
  const quiet = new Float32Array(SR * 3);
  for (let i = 0; i < quiet.length; i++) quiet[i] = 0.02 * Math.sin(2 * Math.PI * 300 * (i / SR));
  const p = prepareSong({ channels: [quiet, quiet], sampleRate: SR });
  assert.ok(p.wantedDb > 10, `a quiet file wants gain, got ${p.wantedDb}`);
  assert.equal(p.limited, false, 'and with 34dB of headroom it can have all of it');
  assert.ok(Math.abs(p.appliedDb - p.wantedDb) < 1e-9);
  ok('prepareSong gives a quiet file with headroom its full wanted gain');

  // Quiet in LUFS but peaking near full scale — the case the ceiling exists for.
  // loudness() reports SAMPLE peak, with no oversampled true-peak stage, so the
  // ceiling has to leave room for the intersample peaks a lossy decode adds.
  const peaky = new Float32Array(SR * 3);
  for (let i = 0; i < peaky.length; i++) {
    peaky[i] = 0.03 * Math.sin(2 * Math.PI * 300 * (i / SR));
    if (i % 22050 < 40) peaky[i] = 0.99;
  }
  const r = prepareSong({ channels: [peaky, peaky], sampleRate: SR });
  assert.ok(r.wantedDb > 0, `still wants gain, got ${r.wantedDb}`);
  assert.equal(r.limited, true, 'but cannot have it without clipping');
  assert.ok(Math.abs(r.appliedDb - r.headroomDb) < 1e-9, 'so it is held at the peak ceiling');
  assert.ok(Math.abs(r.appliedDb - (-1.5 - r.peakDb)) < 1e-9, 'which is -1.5dB under the peak');
  ok('prepareSong holds gain at the peak ceiling rather than clipping');

  const hot = new Float32Array(SR * 3);
  for (let i = 0; i < hot.length; i++) hot[i] = 0.95 * Math.sin(2 * Math.PI * 300 * (i / SR));
  const q = prepareSong({ channels: [hot, hot], sampleRate: SR });
  assert.ok(q.appliedDb < 0, 'a hot file is turned down');
  assert.equal(q.limited, false, 'and turning down is never peak-limited');
  ok('prepareSong turns a hot file down to the target');

  const stereo = prepareSong({
    channels: [new Float32Array([1, 1]), new Float32Array([-1, -1])], sampleRate: SR,
  });
  assert.deepEqual(Array.from(stereo.mono), [0, 0], 'the downmix is (L+R)/2, like render-video');
  ok('prepareSong downmixes to mono the way render-video does');
}

// ---- dynamics is scale-invariant, which is the whole point of the BREATHE knob

{
  const opts = { ...FIXTURE_OPTS, frames: 150 };
  const quietRun = analyseSong(pcm, 120, FIXTURE_HITS, { ...opts, gain: 0.25 });
  const loudRun = analyseSong(pcm, 120, FIXTURE_HITS, { ...opts, gain: 4 });
  for (const i of [40, 90, 149]) {
    assert.ok(Math.abs(quietRun[i].dynamics - loudRun[i].dynamics) < 1e-9,
      `dynamics moved with gain at frame ${i}: ${quietRun[i].dynamics} vs ${loudRun[i].dynamics}`);
    assert.ok(Math.abs(quietRun[i].level - loudRun[i].level) > 1e-6,
      `level should move with gain at frame ${i}`);
  }
  ok('dynamics is invariant to gain while level is not — normalising cannot fix a '
    + 'limited master, which is why applyDynamicsCurve exists');
}

// ---- the cheap post-passes ------------------------------------------------

{
  const f = analyseSong(pcm, 120, FIXTURE_HITS, FIXTURE_OPTS);
  retimeBeats(f, { fps: 60, bpm: 90 });
  assert.ok(Math.abs(f[120].beat - 3) < 1e-9, `two seconds at 90bpm is beat 3, got ${f[120].beat}`);
  assert.ok(Math.abs(f[120].beatPulse - Math.pow(1 - f[120].beatPhase, 5)) < 1e-12);
  retimeBeats(f, { fps: 60, beatAt: (t) => t * 2 });
  assert.ok(Math.abs(f[60].beat - 2) < 1e-9);
  ok('retimeBeats re-derives beat, beatPhase and beatPulse without an FFT');

  const before = f[100].drums;
  retimePercussion(f, [], { fps: 60, bpm: 120 });
  assert.equal(f[100].drums, 0, 'no hits means no drums');
  assert.equal(f[100].drumless, true);
  assert.ok(before > 0, 'and it really did change something');
  ok('retimePercussion re-derives drums, drumless and hit');

  const g = analyseSong(pcm, 120, FIXTURE_HITS, FIXTURE_OPTS);
  const wasAt = g[150].dynamics;
  applyDynamicsCurve(g, { gamma: 1, floor: 0 });
  assert.equal(g[150].dynamics, wasAt, 'the identity curve must be a no-op');
  applyDynamicsCurve(g, { gamma: 2 });
  assert.ok(Math.abs(g[150].dynamics - wasAt ** 2) < 1e-12);
  assert.ok(g[150].dynamics < wasAt, 'gamma above 1 pushes the quiet half down');
  ok('applyDynamicsCurve is a no-op at gamma 1 and reshapes above it');
}

console.log('song-analysis: all checks passed');
