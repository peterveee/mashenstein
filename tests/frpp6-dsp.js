// FRPP-6's core, measured: tuning to the cent, decay to the second, determinism, string
// assignment, and every "zero means off" being a true identity. Node only — the reference
// renderer runs the same source the worklet will.
import { renderFrpp6 } from '../src/engine/frpp6/dsp.js';
import { compileFrpp6, compileFrpp6With, frpp6BodyModes } from '../src/engine/frpp6/tables.js';
import { validateFrpp6 } from '../src/engine/frpp6/schema.js';
import { FRPP6_CANDIDATES } from '../tools/lib/frpp6-candidates.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const hzOf = (midi) => 440 * 2 ** ((midi - 69) / 12);
const note = (hz, { frame = 0, id = 1, vel = 1, dur = 0 } = {}) => ({
  type: 'noteOn', frame, eventId: id, hz, velocity: vel, ...(dur ? { durFrames: dur } : {}),
});
const render = (stored, events, { sr = 44100, seconds = 1, blockSize = 128, play = {} } = {}) =>
  renderFrpp6({ events, seconds, sampleRate: sr, blockSize, patch: compileFrpp6With(stored, sr, play) });
// The plainest string: no body, no TENSION, no detune, no STIFF. What tuning and decay
// tests want, so that what they measure is the loop and nothing else.
const plain = (over = {}) => ({
  body: { type: 'none', mix: 0 },
  strings: { tuning: 'free', tension: 0, ...(over.strings || {}) },
  string: { stiffness: 0, ...(over.string || {}) },
  exciter: { mix: 0, ...(over.exciter || {}) },
  amp: { release: 10, ...(over.amp || {}) },
  // The stages that have no pot, held still: no detune between strings, no key follow on
  // the ring, everything in the middle of the stereo field.
  internal: { detune: 0, keyFollow: 0, spread: 0, ...(over.internal || {}) },
  ...Object.fromEntries(Object.entries(over).filter(([k]) =>
    !['strings', 'string', 'exciter', 'amp', 'internal'].includes(k))),
});

/** Complex amplitude of frequency f over a Hann window of `size` starting at `at`. */
function dft(x, f, at, size, sr) {
  let re = 0;
  let im = 0;
  for (let n = 0; n < size; n++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (size - 1));
    const ph = (2 * Math.PI * f * n) / sr;
    re += w * x[at + n] * Math.cos(ph);
    im -= w * x[at + n] * Math.sin(ph);
  }
  return { mag: Math.hypot(re, im), ph: Math.atan2(im, re) };
}
const db = (v) => 20 * Math.log10(Math.max(1e-30, v));

/** The fundamental's real frequency: its phase advance across a known gap. */
function measuredHz(x, f, sr, at = Math.round(0.15 * sr), gapS = 0.2, size = 4096) {
  const gap = Math.round(gapS * sr);
  const a = dft(x, f, at, size, sr);
  const b = dft(x, f, at + gap, size, sr);
  let d = b.ph - a.ph - (2 * Math.PI * f * gap) / sr;
  d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
  return f + d / ((2 * Math.PI * gap) / sr);
}
const centsOff = (got, want) => 1200 * Math.log2(got / want);

// ---- tuning --------------------------------------------------------------------------------
for (const sr of [44100, 48000]) {
  for (const stiffness of [0, 0.5]) {
    let worst = 0;
    for (const midi of [40, 52, 64, 76, 88]) {
      const hz = hzOf(midi);
      const r = render(plain({ string: { stiffness, decay: 6 } }), [note(hz)], { sr, seconds: 0.8 });
      worst = Math.max(worst, Math.abs(centsOff(measuredHz(r.channels[0], hz, sr), hz)));
    }
    assert(worst < 1, `E2–E6 in tune within 1 cent at ${sr} Hz, STIFF ${stiffness} (worst ${worst.toFixed(3)})`);
  }
}
{
  // The guitar's own low E, on its own wound string with all four dispersion stages.
  const hz = hzOf(40);
  const r = render({ ...plain({ string: { stiffness: 0.6, decay: 6 } }),
    strings: { tuning: 'standard', tension: 0 } }, [note(hz)], { seconds: 0.8 });
  const off = Math.abs(centsOff(measuredHz(r.channels[0], hz, 44100), hz));
  assert(off < 1, `standard tuning's wound low E in tune with four stages (${off.toFixed(3)} cents)`);
}
{
  // The moving read (vibrato/glide presets) keeps the pitch too.
  let worst = 0;
  for (const midi of [40, 52, 64, 76]) {
    const hz = hzOf(midi);
    const r = render(plain({ string: { decay: 6 } }), [note(hz)], { seconds: 0.8, play: { portamento: 0.1 } });
    worst = Math.max(worst, Math.abs(centsOff(measuredHz(r.channels[0], hz, 44100), hz)));
  }
  assert(worst < 2, `the Lagrange read path is in tune within 2 cents (worst ${worst.toFixed(3)})`);
}

// ---- decay ---------------------------------------------------------------------------------
{
  const sr = 44100;
  for (const decay of [1, 3.5]) {
    const hz = 110;
    const r = render(plain({ string: { decay } }), [note(hz)], { seconds: decay * 1.2 + 0.5 });
    const x = r.channels[0];
    const pts = [];
    for (let t = 0.2; t + 0.1 < Math.min(decay, 3); t += 0.05) {
      pts.push([t, db(dft(x, hz, Math.round(t * sr), 4096, sr).mag)]);
    }
    const n = pts.length;
    const mt = pts.reduce((s, p) => s + p[0], 0) / n;
    const md = pts.reduce((s, p) => s + p[1], 0) / n;
    const slope = pts.reduce((s, p) => s + (p[0] - mt) * (p[1] - md), 0)
      / pts.reduce((s, p) => s + (p[0] - mt) ** 2, 0);
    const t60 = -60 / slope;
    assert(Math.abs(t60 / decay - 1) < 0.1, `T60 at A2 is DECAY ${decay}s within 10% (measured ${t60.toFixed(2)}s)`);
  }
}

// ---- determinism ---------------------------------------------------------------------------
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
{
  const chord = [hzOf(52), hzOf(56), hzOf(59), hzOf(64)];
  const events = [note(chord, { frame: 333, dur: 30000 }), note(hzOf(45), { frame: 9001, id: 2, dur: 8000, vel: 0.6 })];
  const busy = { ...FRPP6_CANDIDATES.funkRhythm.frpp6, string: { double: 'shimmer', buzz: 0.2, pickup: 'middle' },
    filter: { cutoff: 1500, resonance: 3, keyTrack: 0.3 }, filterEnv: { amount: 2, decay: 0.2 } };
  const play = { vibrato: { depth: 0.2, rate: 5, delay: 0.1 } };
  for (const [name, stored, pl] of [['steel', {}, {}], ['busy', busy, {}], ['vibrato', busy, play]]) {
    const a = render(stored, events, { seconds: 1.5, play: pl });
    const b = render(stored, events, { seconds: 1.5, play: pl });
    const c = render(stored, events, { seconds: 1.5, blockSize: 997, play: pl });
    assert(same(a.channels[0], b.channels[0]) && same(a.channels[1], b.channels[1]),
      `${name}: two renders are bit-identical`);
    assert(same(a.channels[0], c.channels[0]) && same(a.channels[1], c.channels[1]),
      `${name}: 128- and 997-frame blocks render the same samples`);
  }
}

// ---- stability -----------------------------------------------------------------------------
{
  let seed = 7;
  const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  let bad = 0;
  let loud = 0;
  for (let k = 0; k < 40; k++) {
    const extreme = () => (rand() < 0.5 ? 0 : 1);
    const stored = {
      exciter: { type: pick(['pick', 'noise', 'impulse']), mix: rand(), length: pick([0.001, 0.3]),
        hardness: extreme(), position: pick([0.05, 0.5]) },
      string: { decay: pick([0.02, 30]), damp: pick([0.02, 1]), stiffness: extreme(),
        double: pick(['off', 'shimmer', 'octave']), buzz: extreme(), pickup: pick(['acoustic', 'neck', 'bridge']) },
      damping: { mute: extreme(), mutedBelow: rand(), lift: extreme(), fret: extreme(), squeak: extreme() },
      // The fixed stages at their extremes too, through the test-only block.
      internal: { bright: extreme(), velocity: rand(), keyFollow: rand(), detune: 50 * rand(),
        settle: pick([0, 10]), spread: rand(), course: pick([0, 3, 700, 1200]) },
      filter: rand() < 0.5 ? { type: pick(['lowpass', 'highpass', 'bandpass']), cutoff: pick([20, 20000]),
        resonance: pick([0.5, 20]), keyTrack: extreme() } : null,
      filterEnv: { amount: pick([-8, 8]), attack: pick([0, 2]), decay: pick([0.001, 5]), sustain: rand() },
      amp: { attack: pick([0, 1]), decay: 0.2, sustain: rand(), release: pick([0.005, 30]) },
      strings: { tuning: pick(['standard', 'free', 'openG']), tension: pick([0, 50]) },
      body: { type: pick(['steel', 'nylon', 'archtop', 'banjo', 'harp', 'none']), mix: rand(), size: pick([0.5, 2]) },
    };
    const play = { mode: pick(['poly', 'mono', 'legato']), portamento: pick([0, 0.3]),
      vibrato: rand() < 0.5 ? { depth: pick([0.1, 12]), rate: pick([0.1, 60]) } : null };
    const events = [];
    for (let e = 0; e < 12; e++) {
      events.push(note(rand() < 0.3 ? [hzOf(40 + e), hzOf(47 + e)] : hzOf(28 + Math.floor(rand() * 72)),
        { frame: Math.floor(rand() * 40000), id: e + 1, vel: rand(), dur: Math.floor(rand() * 20000) + 1 }));
    }
    const r = render(stored, events, { seconds: 1.2, play });
    for (const ch of r.channels) for (const v of ch) { if (!Number.isFinite(v)) bad++; if (Math.abs(v) > 8) loud++; }
    if (r.health.nonFinite) bad += r.health.nonFinite;
  }
  assert(bad === 0, `40 extreme patches render no NaN or infinity (${bad})`);
  assert(loud === 0, `and none runs away past ±8 (${loud} samples)`);
}

// ---- strings -------------------------------------------------------------------------------
{
  const report = (stored, events, seconds = 0.1) => render(stored, events, { seconds }).core.stringReport();
  // A2 and C3 together: both want the A string. The lower note moves down to the E string.
  const r = report({}, [note([hzOf(45), hzOf(48)])]);
  assert(r[1].hz === hzOf(48) && r[0].hz === hzOf(45),
    'a chord that wants one string twice moves its lower note down a string');
  const open = report({}, [note([hzOf(40), hzOf(45), hzOf(50), hzOf(55), hzOf(59), hzOf(64)])]);
  assert(open.every((s, i) => s.active && Math.abs(s.hz - hzOf([40, 45, 50, 55, 59, 64][i])) < 1e-9),
    'an open E-shape chord takes one string each, low to high');
  const free = render({ strings: { tuning: 'free' } },
    [0, 1, 2, 3, 4, 5, 6].map((k) => note(hzOf(60 + k), { frame: k * 4000, id: k + 1 })), { seconds: 0.8 });
  assert(free.health.steals === 1, `FREE steals the oldest when a seventh note comes (${free.health.steals})`);
  const done = render({ string: { decay: 0.3 } }, [note(hzOf(52), { dur: 2000 })], { seconds: 2 });
  assert(done.health.voices === 0, 'a string that has died is retired');
}

// ---- zero is off ---------------------------------------------------------------------------
{
  const ev = [note([hzOf(52), hzOf(59)], { dur: 20000 })];
  const base = render({}, ev, { seconds: 0.8 }).channels[0];
  const cases = [
    ['FILTER off', { filter: { on: false, cutoff: 300, resonance: 8 } }],
    ['BUZZ, COURSE, PICKUP, LIFT, FRET and SQUEAK at 0', { string: { buzz: 0, double: 'off', pickup: 'acoustic' }, damping: { lift: 0, fret: 0, squeak: 0 } }],
    ['a neutral AMP', { amp: { attack: 0, decay: 2, sustain: 1 } }],
  ];
  for (const [name, stored] of cases) {
    assert(same(base, render(stored, ev, { seconds: 0.8 }).channels[0]), `${name} renders bit-identical to its absence`);
  }
}

// ---- the collapsed filter ------------------------------------------------------------------
{
  const ev = [note([hzOf(45), hzOf(52), hzOf(57), hzOf(61)], { dur: 30000 })];
  const filt = { filter: { type: 'lowpass', cutoff: 1200, resonance: 4, keyTrack: 0 }, internal: { spread: 0.6 } };
  const one = render(filt, ev, { seconds: 1 }).channels;
  const six = render({ ...filt, internal: { spread: 0.6, collapse: false } }, ev, { seconds: 1 }).channels;
  let worst = 0;
  for (let c = 0; c < 2; c++) for (let i = 0; i < one[c].length; i++) worst = Math.max(worst, Math.abs(one[c][i] - six[c][i]));
  assert(worst < 1e-5, `one lane filter matches six string filters, to float32 rounding (${worst.toExponential(2)})`);
}

// ---- the commuted body ---------------------------------------------------------------------
for (const type of ['steel', 'banjo']) {
  const stored = { body: { type, mix: 0.8 }, strings: { tension: 0 }, string: { stiffness: 0.2 } };
  const ev = [note(hzOf(50))];
  const commuted = render(stored, ev, { seconds: 1.5 }).channels;
  const lane = render({ ...stored, internal: { bodyMethod: 'lane', laneModes: 64 } }, ev, { seconds: 1.5 }).channels;
  let worst = 0;
  let peak = 0;
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < commuted[c].length; i++) {
      worst = Math.max(worst, Math.abs(commuted[c][i] - lane[c][i]));
      peak = Math.max(peak, Math.abs(lane[c][i]));
    }
  }
  assert(worst / peak < 1e-4, `${type}: the body folded into the pluck equals the body run on the output (${(worst / peak).toExponential(2)})`);
}

// ---- release, chucks, COURSE, PICKUP -------------------------------------------------------
const rmsAt = (x, t, w, sr = 44100) => {
  const a = Math.round(t * sr);
  const b = a + Math.round(w * sr);
  let e = 0;
  for (let i = a; i < b; i++) e += x[i] * x[i];
  return Math.sqrt(e / (b - a));
};
{
  const sr = 44100;
  const r = render(plain({ string: { decay: 8 }, amp: { release: 0.25 } }), [note(hzOf(45), { dur: sr })], { seconds: 1.6 });
  const before = rmsAt(r.channels[0], 0.97, 0.02);
  const after = rmsAt(r.channels[0], 1.25, 0.02);
  assert(db(after / before) <= -60, `RELEASE 0.25 s takes a ringing string 60 dB down in 0.25 s (${db(after / before).toFixed(1)} dB)`);
}
{
  const r = render(plain({ string: { decay: 3 }, damping: { mutedBelow: 0.5 } }), [note(hzOf(52), { vel: 0.3 })], { seconds: 0.2 });
  const x = r.channels[0];
  let attack = 0;
  for (let i = 0; i < 0.01 * 44100; i++) attack = Math.max(attack, Math.abs(x[i]));
  let tail = 0;
  for (let i = Math.round(0.06 * 44100); i < Math.round(0.07 * 44100); i++) tail = Math.max(tail, Math.abs(x[i]));
  assert(db(tail / attack) <= -60, `a note under MUTED BELOW is a chuck: 60 dB down by 60 ms (${db(tail / attack).toFixed(1)} dB)`);
}
{
  const sr = 44100;
  const hz = hzOf(45);
  const at = Math.round(0.1 * sr);
  const h2 = (course) => dft(render(plain({ string: { decay: 4, course }, exciter: { position: 0.5 } }),
    [note(hz)], { seconds: 0.5 }).channels[0], 2 * hz, at, 8192, sr).mag;
  const gain = db(h2(1200) / h2(0));
  assert(gain >= 20, `COURSE 1200 puts a second partial series at 2f (+${gain.toFixed(1)} dB at 2f, plucked mid-string)`);
}
{
  const sr = 44100;
  const hz = hzOf(45);
  const at = Math.round(0.1 * sr);
  const h4 = (ratio) => dft(render(plain({ string: { decay: 4 }, internal: { pickup: (0.28 - ratio) / 0.22 } }),
    [note(hz)], { seconds: 0.5 }).channels[0], 4 * hz, at, 8192, sr).mag;
  const notch = db(h4(0.25) / h4(0.2));
  assert(notch <= -20, `PICKUP a quarter of the way along notches the 4th harmonic (${notch.toFixed(1)} dB)`);
}

// ---- FRET and SQUEAK -----------------------------------------------------------------------
{
  // A string held on E3, then moved to F3 while ringing: a fret tick on both notes, a
  // squeak on the move. Each must actually reach the output — and a chuck gets neither.
  const ev = [note(hzOf(52), { frame: 0, id: 1, dur: 20000 }), note(hzOf(53), { frame: 22050, id: 2, dur: 20000 })];
  const energy = (stored) => {
    const x = render(stored, ev, { seconds: 1 }).channels[0];
    let e = 0;
    for (let i = 22050; i < 22050 + 4000; i++) e += x[i] * x[i];
    return e;
  };
  const plainE = energy({});
  assert(energy({ damping: { fret: 1 } }) > plainE * 1.02, 'FRET adds a tick where a string moves to a new fret');
  assert(energy({ damping: { squeak: 1 } }) > plainE * 1.02, 'SQUEAK adds the slide when a ringing string moves');
  const chuck = [note(hzOf(52), { vel: 0.2 })];
  const a = render({ damping: { mutedBelow: 0.5 } }, chuck, { seconds: 0.3 }).channels[0];
  const b = render({ damping: { mutedBelow: 0.5, fret: 1, squeak: 1 } }, chuck, { seconds: 0.3 }).channels[0];
  assert(same(a, b), 'a muted chuck is unfretted: no tick, no squeak');
}

// ---- DRIVE: the shared curve, staged at the string ------------------------------------------
{
  // The rule every synth's DRIVE keeps (9 Oct 2026): the knee at the sound's own peak, so
  // DRIVE changes the character and not the level; and here, the note's LEVEL applied after
  // the shaper, so it bites the same on every lane.
  const sr = 44100;
  const ev = (level) => [note(hzOf(45), { dur: 30000, vel: 1 }), ].map((e) => ({ ...e, level }));
  const mono = { ...FRPP6_CANDIDATES.steelAcoustic, frpp6: { internal: { spread: 0 } } };
  const driven = (drive, place = 'post', extra = {}) => renderFrpp6({ events: ev(1), seconds: 1, sampleRate: sr,
    patch: compileFrpp6({ ...mono, ...extra, drive, shape: 'soft', drivePlace: place }, sr) }).channels[0];
  const peakOf = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const dry = driven(0);
  const hot = driven(1);
  assert(Math.abs(db(peakOf(hot) / peakOf(dry))) < 0.5,
    `the knee is at the string's own peak: full DRIVE leaves the peak where it was (${db(peakOf(hot) / peakOf(dry)).toFixed(2)} dB)`);
  // What is left once the best-fit gain is taken out: zero for a volume knob.
  let xy = 0, xx = 0;
  for (let i = 0; i < dry.length; i++) { xy += dry[i] * hot[i]; xx += dry[i] * dry[i]; }
  const g = xy / xx;
  let res = 0, tot = 0;
  for (let i = 0; i < dry.length; i++) { res += (hot[i] - g * dry[i]) ** 2; tot += hot[i] * hot[i]; }
  assert(res / tot > 0.05, `and it distorts, rather than turning up: ${(100 * res / tot).toFixed(0)}% of the driven note is not the dry note scaled`);
  const quarter = renderFrpp6({ events: ev(0.25), seconds: 1, sampleRate: sr,
    patch: compileFrpp6({ ...mono, drive: 0.6, shape: 'soft', drivePlace: 'post' }, sr) }).channels[0];
  const full = driven(0.6);
  let worst = 0;
  for (let i = 0; i < full.length; i++) worst = Math.max(worst, Math.abs(full[i] - 4 * quarter[i]));
  assert(worst / peakOf(full) < 1e-5, `the note's level does not move the knee: a quarter-level note is the same shape (${(worst / peakOf(full)).toExponential(1)})`);
  // The funk guitar: its stored peak is the fret tick, 12 dB over the string. The knee
  // must sit on the string regardless.
  const funk = { ...FRPP6_CANDIDATES.funkRhythm, frpp6: { ...FRPP6_CANDIDATES.funkRhythm.frpp6, internal: { spread: 0 } }, peak: 1.32 };
  const fp = compileFrpp6({ ...funk, drive: 1, shape: 'soft' }, sr);
  const fq = compileFrpp6({ ...funk, drive: 1, shape: 'soft', frpp6: { ...funk.frpp6, damping: { ...funk.frpp6.damping, fret: 0, squeak: 0, lift: 0 } } }, sr);
  const fpPeak = 1 / (fp.drive.scaleIn * 32);
  assert(Math.abs(db(fpPeak / fq.stringPeak)) < 0.5 && Math.abs(db(fpPeak / (1.32 / 0.7))) > 6,
    `the funk guitar's knee is at its string (${fpPeak.toFixed(3)}), not at its fret tick (${(1.32 / 0.7).toFixed(2)})`);
  const pre = driven(0.6, 'pre', { frpp6: { ...mono.frpp6, filter: { type: 'lowpass', cutoff: 800, resonance: 2 } } });
  const post = driven(0.6, 'post', { frpp6: { ...mono.frpp6, filter: { type: 'lowpass', cutoff: 800, resonance: 2 } } });
  assert(!same(pre, post), 'PRE and POST are two places: before the filter and after it');
}

// ---- Stage 3: bowed and blown -------------------------------------------------------------
{
  const sr = 44100;
  // Unambiguous pitch: a short gap first (±16 Hz), then the long one.
  const pitchOf = (x, f, at = Math.round(0.6 * sr)) => {
    let est = f;
    for (const [gapS, size] of [[0.008, 1024], [0.04, 2048], [0.25, 8192]]) {
      const gap = Math.round(gapS * sr);
      const a = dft(x, est, at, size, sr), b = dft(x, est, at + gap, size, sr);
      let d = b.ph - a.ph - (2 * Math.PI * est * gap) / sr;
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
      est += d / ((2 * Math.PI * gap) / sr);
    }
    return est;
  };
  const held = (stored, hz, secs = 1.4, play = {}, total = secs + 0.3) => renderFrpp6({
    events: [note(hz, { dur: Math.round(secs * sr) })], seconds: total, sampleRate: sr,
    patch: compileFrpp6With({ body: { type: 'none', mix: 0 }, strings: { tuning: 'free', tension: 0 },
      internal: { spread: 0 }, amp: { attack: 0.05, release: 0.1 }, ...stored }, sr, play),
  }).channels[0];
  const wind = (type, over = {}) => ({ exciter: { type, pressure: 0.6, ...over } });
  // Tuning, across the pressure range and the whole board. The worst case is the extreme:
  // the bow at full force on the low E.
  for (const [type, lo, hi, tol, at] of [['bow', 40, 88, 7, 0.6]]) {
    let worst = 0;
    let where = '';
    for (const press of [0.3, 0.6, 1]) {
      for (let midi = lo; midi <= hi; midi += 8) {
        const hz = hzOf(midi);
        const x = held(wind(type, { pressure: press }), hz);
        if (rmsAt(x, at, 0.4) < 0.003) { worst = Infinity; break; }
        const c = Math.abs(centsOff(pitchOf(x, hz, Math.round(at * sr)), hz));
        if (c > worst) { worst = c; where = `midi ${midi} at ${press}`; }
      }
    }
    assert(worst <= tol, `${type}: in tune within ${tol} cents from midi ${lo} to ${hi} at PRESSURE 0.3, 0.6 and 1 (worst ${worst.toFixed(1)}, ${where})`);
  }
  // The bow settles into steady (Helmholtz) motion quickly.
  {
    const x = held(wind('bow'), 220);
    let steady = null;
    for (let t = 0.02; t < 0.6; t += 0.01) {
      const a = db(dft(x, 220, Math.round(t * sr), 2048, sr).mag), b = db(dft(x, 220, Math.round((t + 0.05) * sr), 2048, sr).mag);
      if (Math.abs(a - b) < 1 && a > -40) { steady = t; break; }
    }
    assert(steady != null && steady <= 0.3, `the bow settles into steady motion within 300 ms (${steady == null ? 'never' : `${Math.round(steady * 1000)} ms`})`);
  }
  // Glide on a bowed note: the pitch arrives within 10% of GLIDE, with no click.
  {
    const glide = 0.2;
    const r = renderFrpp6({
      events: [note(hzOf(57), { dur: 30000 }), note(hzOf(69), { frame: Math.round(0.6 * sr), id: 2, dur: 30000 })],
      seconds: 1.6, sampleRate: sr,
      patch: compileFrpp6With({ ...wind('bow'), body: { type: 'none', mix: 0 }, strings: { tuning: 'free', tension: 0 },
        internal: { spread: 0 }, amp: { attack: 0.05 } }, sr, { mode: 'legato', portamento: glide }),
    }).channels[0];
    // Mid-glide the pitch is moving, so it is read through a window shorter than the glide.
    const quick = (x, f, at) => {
      let est = f;
      for (const [gapS, size] of [[0.006, 512], [0.02, 1024]]) {
        const gap = Math.round(gapS * sr);
        const a = dft(x, est, at, size, sr), b = dft(x, est, at + gap, size, sr);
        let d = b.ph - a.ph - (2 * Math.PI * est * gap) / sr;
        d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
        est += d / ((2 * Math.PI * gap) / sr);
      }
      return est;
    };
    const early = quick(r, hzOf(63), Math.round((0.6 + glide * 0.5) * sr)), late = pitchOf(r, hzOf(69), Math.round((0.6 + glide * 1.1 + 0.05) * sr));
    assert(Math.abs(centsOff(late, hzOf(69))) < 8 && Math.abs(centsOff(early, hzOf(69)) + 600) < 150,
      `legato glides over GLIDE: half-way it is ${(-centsOff(early, hzOf(69))).toFixed(0)} cents short of the octave, after it ${centsOff(late, hzOf(69)).toFixed(1)} cents off`);
    let step = 0;
    for (let i = 1; i < r.length; i++) step = Math.max(step, Math.abs(r[i] - r[i - 1]));
    const pk = r.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    assert(step < 0.5 * pk, `and no click: the largest sample step is ${(100 * step / pk).toFixed(0)}% of the peak`);
  }
  // RELEASE lifts the bow: the note is gone soon after.
  {
    const x = held({ ...wind('bow'), amp: { attack: 0.05, release: 0.1 }, string: { decay: 0.3 } }, 220, 1, {}, 2);
    const on = rmsAt(x, 0.9, 0.05), off = rmsAt(x, 1.6, 0.05);
    assert(db(off / on) < -40, `a released bow stops: ${db(off / on).toFixed(0)} dB down 0.6 s after the key comes up`);
  }
  // Determinism, breath noise and all; and stability over the whole of each pot.
  {
    const a = held(wind('bow', { noise: 0.8 }), 440), b = held(wind('bow', { noise: 0.8 }), 440);
    assert(same(a, b), 'a rough bow renders bit-identical twice: its noise is seeded');
    let bad = 0;
    for (const [pressure, noise, extra] of [[0, 1, {}], [1, 1, {}], [1, 0, { speed: 1 }], [0.5, 0.5, { speed: 0 }]]) {
      const x = held(wind('bow', { pressure, noise, ...extra }), hzOf(52), 0.6);
      for (const v of x) if (!Number.isFinite(v) || Math.abs(v) > 8) bad++;
    }
    assert(bad === 0, `the bow stays finite and bounded at every extreme (${bad})`);
  }
}

// ---- the Body · Advanced door -------------------------------------------------------------
{
  const base = frpp6BodyModes({ type: 'steel', size: 1 }, 44100);
  const moved = frpp6BodyModes({ type: 'steel', size: 1, air: { hz: 120, q: 30, db: 6 } }, 44100);
  assert(base[0] === 98 && base[1] === 14, 'untouched, the air mode is where the steel set puts it');
  assert(moved[0] === 120 && moved[1] === 30 && Math.abs(moved[2] / base[2] - 10 ** (6 / 20)) < 1e-9,
    'a pinned AIR HZ / Q moves the first mode, and its dB trims the set\'s gain');
  assert(moved[3] === base[3] && moved.length === base.length, 'the other modes and the cloud are untouched');
  const v = validateFrpp6({ body: { type: 'steel', top: { hz: 99999, db: 40 } } });
  assert(v.body.top.hz === 4000 && v.body.top.db === 18 && v.body.air.hz === null, 'mode overrides are clamped; an unset one stays unset');
}

// ---- level up the neck ---------------------------------------------------------------------
{
  for (const [id, voice] of Object.entries(FRPP6_CANDIDATES)) {
    if (voice.ab) continue;
    // Without the preset's vibrato: the level curve is calibrated without it.
    const patch = compileFrpp6({ ...voice, mode: 'poly', portamento: 0, vibrato: null }, 44100);
    // A bowed note is measured once it has spoken (from 0.15 s, as the level curve is
    // calibrated); a pluck from the strike.
    const sustained = voice.frpp6?.exciter?.type === 'bow';
    const levels = [40, 52, 64, 76, 88].map((midi) => {
      const r = renderFrpp6({ events: [note(hzOf(midi), { dur: 44100 })], seconds: sustained ? 0.5 : 0.35, sampleRate: 44100, patch });
      return db(rmsAt(r.channels[0], sustained ? 0.15 : 0, 0.3));
    });
    const spread = Math.max(...levels) - Math.min(...levels);
    assert(spread <= 6, `${id}: E2 to E6 within ±3 dB (${spread.toFixed(1)} dB: ${levels.map((l) => l.toFixed(1)).join(' ')})`);
  }
}

// ---- SUB: a sine an octave below (27 Oct 2026) --------------------------------------------
{
  const sr = 44100;
  const f = hzOf(40); // E2
  const bass = (sub, over = {}) => plain({ string: { decay: 2, sub, ...(over.string || {}) },
    ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== 'string')) });
  const plainR = render(plain({ string: { decay: 2 } }), [note(f)], { seconds: 0.5 });
  const zeroR = render(bass(0), [note(f)], { seconds: 0.5 });
  assert(plainR.channels[0].every((x, i) => x === zeroR.channels[0][i]), 'SUB 0 is bit-identical to no SUB at all');

  const r = render(bass(1), [note(f)], { seconds: 1.5 });
  const x = r.channels[0];
  const half = dft(x, f / 2, 2205, 4096, sr).mag;
  const halfPlain = dft(plainR.channels[0], f / 2, 2205, 4096, sr).mag;
  assert(db(half) - db(halfPlain) > 30, `SUB puts an octave-below fundamental in (+${(db(half) - db(halfPlain)).toFixed(1)} dB at f/2)`);
  const subHz = measuredHz(x, f / 2, sr, Math.round(0.05 * sr), 0.1, 2048);
  assert(Math.abs(centsOff(subHz, f / 2)) < 1, `the sub is an octave down to the cent (${centsOff(subHz, f / 2).toFixed(2)} ct)`);

  // SUB 1 is a sub as loud as the string over the calibration stretch: the two add as powers.
  const sR = rmsAt(x, 0, 0.3), pR = rmsAt(plainR.channels[0], 0, 0.3);
  const subOnly = Math.sqrt(Math.max(0, sR * sR - pR * pR));
  assert(Math.abs(db(subOnly) - db(pR)) < 1.5, `SUB 1 is as loud as the string (${(db(subOnly) - db(pR)).toFixed(2)} dB)`);
  const r5 = render(bass(0.5), [note(f)], { seconds: 0.5 });
  const s5 = rmsAt(r5.channels[0], 0, 0.3);
  const sub5 = Math.sqrt(Math.max(0, s5 * s5 - pR * pR));
  assert(Math.abs(db(sub5 / subOnly) + 6.02) < 0.5, `SUB is a linear amount: 0.5 is 6 dB under 1 (${db(sub5 / subOnly).toFixed(2)} dB)`);

  // It rides the string: rings with RING, stops with the key.
  const early = dft(x, f / 2, Math.round(0.1 * sr), 4096, sr).mag;
  const late = dft(x, f / 2, Math.round(1.1 * sr), 4096, sr).mag;
  const fell = db(early) - db(late);
  assert(Math.abs(fell - 30) < 4, `a pluck's sub decays at the string's RING (${fell.toFixed(1)} dB in 1 s at RING 2 s; 30 expected)`);
  const cut = render(bass(1, { amp: { release: 0.05 } }), [note(f, { dur: Math.round(0.2 * sr) })], { seconds: 0.6 });
  assert(rmsAt(cut.channels[0], 0.45, 0.1) < 1e-4 * rmsAt(cut.channels[0], 0.05, 0.1), 'a released note takes its sub with it');

  // Glide: the sub follows the string's moving pitch.
  const g = render(bass(1, { string: { decay: 4 } }), [note(f, { id: 1, dur: 4410 }), note(f * 1.5, { id: 2, frame: 4410, dur: 40000 })],
    { seconds: 1, play: { mode: 'legato', portamento: 0.02 } });
  const gHz = measuredHz(g.channels[0], f * 0.75, sr, Math.round(0.3 * sr), 0.1, 2048);
  assert(Math.abs(centsOff(gHz, f * 0.75)) < 3, `under legato GLIDE the sub lands an octave under the new note (${centsOff(gHz, f * 0.75).toFixed(2)} ct)`);

  // The bow: the sub rides the bow's pressure, and stops with it.
  const bow = (sub) => plain({ exciter: { type: 'bow', pressure: 0.6 }, string: { decay: 2, sub }, amp: { attack: 0.05, release: 0.1 } });
  const bR = render(bow(1), [note(f, { dur: Math.round(0.6 * sr) })], { seconds: 1.2 });
  const bP = render(bow(0), [note(f, { dur: Math.round(0.6 * sr) })], { seconds: 1.2 });
  const bHalf = db(dft(bR.channels[0], f / 2, Math.round(0.2 * sr), 4096, sr).mag) - db(dft(bP.channels[0], f / 2, Math.round(0.2 * sr), 4096, sr).mag);
  assert(bHalf > 20, `a bowed note gets its sub while held (+${bHalf.toFixed(1)} dB at f/2)`);
  assert(rmsAt(bR.channels[0], 1.05, 0.1) < 1e-3 * rmsAt(bR.channels[0], 0.3, 0.1), 'a lifted bow takes its sub with it');

  // The level curve evens the STRING: a sub does not move it, nor the DRIVE's stage.
  const c0 = compileFrpp6With(bass(0), sr), c1 = compileFrpp6With(bass(0.7), sr);
  assert(c0.levelCurve.every((v, i) => v === c1.levelCurve[i]) && c0.stringPeak === c1.stringPeak,
    'SUB leaves the level curve and the drive stage where the string puts them');
  assert(c0.subRef === 0 && c1.subRef > 0, 'subRef is only measured for a patch that has a sub');

  // Deterministic and grid-exact: any block size, the same samples.
  const a = render(bass(1), [note(f), note(f * 2, { id: 2, frame: 3000 })], { seconds: 0.4, blockSize: 128 });
  const b = render(bass(1), [note(f), note(f * 2, { id: 2, frame: 3000 })], { seconds: 0.4, blockSize: 997 });
  assert(a.channels[0].every((v, i) => v === b.channels[0][i]), 'SUB renders the same in 128- and 997-frame blocks');
  assert(validateFrpp6({ string: { sub: 7 } }).string.sub === 1 && validateFrpp6({}).string.sub === 0, 'SUB is clamped to 0–1 and defaults to off');
}

// ---- DROP, RESONANCE, WOOD (27 Oct 2026) ------------------------------------------------
{
  const sr = 44100;
  const f = 196;
  const rmsAt = (x, at, len) => { let e = 0; const a = Math.round(at * sr), n = Math.round(len * sr);
    for (let i = a; i < a + n; i++) e += x[i] * x[i]; return Math.sqrt(e / n); };
  const db = (x) => 20 * Math.log10(x);
  const g = (over = {}) => plain({ body: { type: 'steel', mix: 0.8 }, string: { decay: 3, ...(over.string || {}) },
    ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== 'string')) });

  // All three at 0 are exactly today's string.
  const today = render(g(), [note(f)], { seconds: 0.5 });
  const zeros = render(g({ string: { decay: 3, drop: 0, resonance: 0 }, body: { type: 'steel', mix: 0.8, wood: 0 } }), [note(f)], { seconds: 0.5 });
  assert(today.channels[0].every((x, i) => x === zeros.channels[0][i]), 'DROP, RESONANCE and WOOD at 0 are bit-identical to no pot at all');

  // DROP: the early fall is steeper than the late one; without it the two match.
  const slope = (r) => [db(rmsAt(r.channels[0], 0.05, 0.05)) - db(rmsAt(r.channels[0], 0.6, 0.05)),
    db(rmsAt(r.channels[0], 0.6, 0.05)) - db(rmsAt(r.channels[0], 1.15, 0.05))];
  const [e0, l0] = slope(render(g(), [note(f)], { seconds: 1.3 }));
  const [e1, l1] = slope(render(g({ string: { decay: 3, drop: 1 } }), [note(f)], { seconds: 1.3 }));
  assert(Math.abs(e0 - l0) < 1.5, `with no DROP the fall is even (${e0.toFixed(1)} then ${l0.toFixed(1)} dB per 0.55 s)`);
  assert(e1 > l1 + 4, `DROP 1 falls fast first, then slow (${e1.toFixed(1)} then ${l1.toFixed(1)} dB per 0.55 s)`);
  assert(validateFrpp6({ string: { drop: 0.5 } }).string.course > 0 && validateFrpp6({ string: { drop: 0.5, double: 'shimmer' } }).string.course === 4,
    'DROP splits a plain string into its two polarisations, and uses SHIMMER\'s pair when there is one');

  // RESONANCE: after a short note is let go, the open strings ring on; without it, silence.
  const short = (resonance) => render(g({ string: { decay: 3, resonance }, amp: { release: 0.05 } }),
    [note(hzOf(52), { dur: Math.round(0.2 * sr) })], { seconds: 1.2 });
  const dry = rmsAt(short(0).channels[0], 0.8, 0.2), wet = rmsAt(short(1).channels[0], 0.8, 0.2);
  assert(dry < 1e-6 && wet > 1e-4, `RESONANCE rings on after the note is damped (${db(wet).toFixed(0)} dBFS against ${db(dry || 1e-12).toFixed(0)})`);
  const c = compileFrpp6With(g({ string: { decay: 3, resonance: 0.5 } }), sr);
  assert(c.internal.sympathetic === 0.5 && c.internal.sympRing === 3, 'RESONANCE rings for as long as RING');

  // WOOD: same energy (the table is normalised), longer, noisier tail.
  const t0 = compileFrpp6With(g(), sr).tables.pulse, t1 = compileFrpp6With(g({ body: { type: 'steel', mix: 0.8, wood: 1 } }), sr).tables.pulse;
  const en = (t) => t.reduce((a, x) => a + x * x, 0);
  assert(Math.abs(db(Math.sqrt(en(t1) / en(t0)))) < 0.01, 'WOOD changes the colour of the pluck, not its energy');
  assert(t1.length >= t0.length && t1.some((x, i) => x !== (t0[i] ?? 0)), 'WOOD puts a tail into the pluck');
  const none = compileFrpp6With(plain({ body: { type: 'none', mix: 0, wood: 1 } }), sr).tables.pulse;
  const none0 = compileFrpp6With(plain(), sr).tables.pulse;
  assert(none.length === none0.length && none.every((x, i) => x === none0[i]), 'WOOD does nothing with no body');

  // Deterministic: any block size, the same samples.
  const all = g({ string: { decay: 3, drop: 0.6, resonance: 0.6 }, body: { type: 'steel', mix: 0.8, wood: 0.6 } });
  const a = render(all, [note(f), note(f * 1.5, { id: 2, frame: 3000 })], { seconds: 0.4, blockSize: 128 });
  const b = render(all, [note(f), note(f * 1.5, { id: 2, frame: 3000 })], { seconds: 0.4, blockSize: 997 });
  assert(a.channels[0].every((v, i) => v === b.channels[0][i]), 'DROP, RESONANCE and WOOD render the same in 128- and 997-frame blocks');
}

// ---- METAL past 1 (27 Oct 2026) -----------------------------------------------------------
{
  const sr = 44100;
  assert(validateFrpp6({ string: { stiffness: 3 } }).string.stiffness === 2, 'METAL is clamped to 0–2');
  for (const [tuning, m] of [['free', 52], ['free', 76], ['standard', 40], ['standard', 64]]) {
    const f0 = hzOf(m);
    const r = render(plain({ string: { stiffness: 2, decay: 4 }, strings: { tuning } }), [note(f0)], { seconds: 1 });
    const x = r.channels[0];
    let best = 0, bc = 0;
    for (let c = -20; c <= 20; c += 0.5) {
      const mag = dft(x, f0 * 2 ** (c / 1200), 4096, 16384, sr).mag;
      if (mag > best) { best = mag; bc = c; }
    }
    assert(Math.abs(bc) <= 1 && r.health.nonFinite === 0, `METAL 2 keeps ${tuning} m${m} in tune and finite (${bc} ct)`);
  }
}

// ---- the widened ranges (27 Oct 2026) -----------------------------------------------------
{
  const sr = 44100;
  const v = validateFrpp6({ string: { decay: 99, resonance: 9 }, body: { wood: 9, size: 99 }, exciter: { position: 0 } });
  assert(v.string.decay === 30 && v.string.resonance === 2 && v.body.wood === 2 && v.body.size === 4 && v.exciter.position === 0.02,
    'RING reaches 30 s, RESONANCE and WOOD 2, SIZE 4, WHERE 0.02');
  assert(validateFrpp6({ body: { size: 0 } }).body.size === 0.25, 'SIZE goes down to 0.25');
  const peakOf = (r) => r.channels[0].reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  const base = render(plain({ body: { type: 'steel', mix: 0.8 } }), [note(110)], { seconds: 1 });
  for (const [name, over] of [
    ['RING 30 s', { string: { decay: 30 } }],
    ['WHERE 0.02', { exciter: { position: 0.02 } }],
    ['a bow at WHERE 0.02', { exciter: { type: 'bow', position: 0.02, pressure: 0.6 } }],
    ['SIZE 0.25', { body: { type: 'steel', mix: 0.8, size: 0.25 } }],
    ['SIZE 4', { body: { type: 'steel', mix: 0.8, size: 4 } }],
    ['RESONANCE 2 and WOOD 2', { string: { resonance: 2 }, body: { type: 'steel', mix: 0.8, wood: 2 } }],
  ]) {
    const r = render(plain({ body: { type: 'steel', mix: 0.8 }, ...over }), [note(110), note(hzOf(88), { id: 2, frame: 2000 })], { seconds: 1 });
    const p = peakOf(r);
    assert(r.health.nonFinite === 0 && p > 0 && p < 40 * peakOf(base), `${name} plays, finite and bounded (peak ${p.toFixed(3)})`);
  }
  // RING 30 s really rings: 60 dB over 30 s is 2 dB a second, so ~6 dB in the 2.95 s measured.
  const long = render(plain({ string: { decay: 30 }, internal: { keyFollow: 0 } }), [note(110)], { seconds: 3.2 });
  const rmsOf = (x, a, n) => { let e = 0; for (let i = a; i < a + n; i++) e += x[i] * x[i]; return Math.sqrt(e / n); };
  const fell = 20 * Math.log10(rmsOf(long.channels[0], 4410, 4410) / rmsOf(long.channels[0], Math.round(3.05 * sr), 4410));
  assert(Math.abs(fell - 6) < 3, `RING 30 s falls ~2 dB a second (${fell.toFixed(1)} dB over 2.95 s)`);
}

// ---- STRETCH: METAL's two bends (27 Oct 2026) ----------------------------------------------
{
  const glass = (string, internal = {}) => ({ exciter: { type: 'impulse', hardness: 0.9, mix: 0 },
    string: { decay: 3, damp: 0.9, stiffness: 2, ...string }, strings: { tuning: 'free', tension: 0 },
    body: { type: 'none', mix: 0 }, internal });
  const ev = [note(hzOf(84)), note(hzOf(60), { id: 2, frame: 2000 })];
  const same = (a, b) => a.channels[0].every((x, i) => x === b.channels[0][i]);
  assert(same(render(glass({ stretch: 'piano' }), ev, { seconds: 0.3 }), render(glass({}, { inharmonic: true }), ev, { seconds: 0.3 })),
    'STRETCH PIANO is the piano trial\'s internal.inharmonic, sample for sample');
  assert(same(render(glass({ stretch: 'string' }), ev, { seconds: 0.3 }), render(glass({}), ev, { seconds: 0.3 })),
    'STRETCH STRING is METAL as it was');
  assert(validateFrpp6({ string: { stretch: 'piano' } }).internal.inharmonic === true
    && validateFrpp6({ string: { stretch: 'piano' }, internal: { inharmonic: false } }).internal.inharmonic === false
    && validateFrpp6({ string: { stretch: 'nonsense' } }).string.stretch === 'string', 'STRETCH validates, and an explicit internal key still wins');
}

console.log(failed ? '\nFRPP-6 DSP: FAILED' : '\nFRPP-6 DSP: PASSED');
process.exit(failed ? 1 : 0);
