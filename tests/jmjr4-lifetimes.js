/*
 * JMJR-4 — what a note SCHEDULES and how long its sources live.
 *
 * The round-two optimisations are both about events nobody hears: an automation point that
 * cannot move a parameter, and a noise source that goes on being rendered after its gain has
 * reached zero for good. Neither shows up in a peak or an RMS, so neither is covered by
 * tests/jmjr4-render.js — this is the file that watches the timeline itself.
 *
 *   node tests/jmjr4-lifetimes.js
 *
 * Part one is pure Node: `automate` against a recording AudioParam, one shape per line.
 * Part two needs Playwright's Chromium and is skipped with a note where it is not installed:
 * every source of every note, through the real VoiceRack, with its start and every stop it
 * was ever given — so a release, a panic, a retrigger and a SPEAK phrase can each be held to
 * the rule that NOTHING may extend a stop a source has already been booked for.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { automate } from '../src/engine/jmjr4/dsp.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- part one: the automation itself ------------------------------------------------
/** An AudioParam that only remembers. `[kind, value, time]` per call, in call order. */
function recorder() {
  const ev = [];
  return {
    ev,
    setValueAtTime: (v, t) => ev.push(['set', v, t]),
    linearRampToValueAtTime: (v, t) => ev.push(['lin', v, t]),
  };
}
const shape = (T, V, t0 = 0, fn) => { const p = recorder(); automate(p, T, V, t0, fn); return p.ev; };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const sameEvents = (got, want) => got.length === want.length
  && got.every((e, i) => e[0] === want[i][0] && near(e[1], want[i][1]) && near(e[2], want[i][2]));
const show = (ev) => `[${ev.map(([k, v, t]) => `${k} ${v}@${t.toFixed(5)}`).join(', ')}]`;
const check = (msg, got, want) => assert(sameEvents(got, want), `${msg} — ${show(got)}`);

console.log('-- automation --');

// The plan's own example: the ramp that REACHES 750 is kept, the duplicate after it is not.
check('a rise-then-hold keeps the ramp and drops the terminal duplicate',
  shape([0, 0.048, 0.08, 0.32], [200, 200, 750, 750]),
  [['set', 200, 0], ['lin', 200, 0.048], ['lin', 750, 0.08]]);

check('a constant curve is one event',
  shape([0, 1, 2, 3], [5, 5, 5, 5]),
  [['set', 5, 0]]);

check('a two-point constant curve is one event',
  shape([0, 4], [750, 750]),
  [['set', 750, 0]]);

check('a fall-then-hold stops at the bottom of the fall',
  shape([0, 0.1, 0.2, 0.5], [900, 900, 300, 300]),
  [['set', 900, 0], ['lin', 900, 0.1], ['lin', 300, 0.2]]);

// An INTERIOR plateau keeps both ends: the point after it is where the curve moves again,
// and dropping it would start the next rise at the plateau's beginning.
check('an internal hold followed by movement keeps both ends of the hold',
  shape([0, 1, 2, 3], [0, 0, 0, 1]),
  [['set', 0, 0], ['lin', 0, 2], ['lin', 1, 3]]);

check('a plateau in the middle of two moves keeps its ends and drops its interior',
  shape([0, 1, 2, 3, 4, 5], [0, 1, 1, 1, 2, 2]),
  [['set', 0, 0], ['lin', 1, 1], ['lin', 1, 3], ['lin', 2, 4]]);

check('a curve that moves at every point keeps every point',
  shape([0, 1, 2], [0, 1, 2]),
  [['set', 0, 0], ['lin', 1, 1], ['lin', 2, 2]]);

// The TRANSFORM is the curve. Values that differ in the IR but are equal once the level
// multiplier has been applied are one plateau, and a transform that flattens the tail must
// drop the tail — this is the case that makes reading `V` directly wrong.
check('the terminal run is judged on TRANSFORMED values',
  shape([0, 1, 2, 3], [1, 2, 3, 4], 0, (v) => (v >= 3 ? 9 : v)),
  [['set', 1, 0], ['lin', 2, 1], ['lin', 9, 2]]);

check('a transform that zeroes everything is one event',
  shape([0, 1, 2], [1, 2, 3], 0, () => 0),
  [['set', 0, 0]]);

// The index is the IR's own: a transform that reads `i` (the nasal owner map does) sees the
// original position of every point, including the ones that are not scheduled.
check('the transform sees the ORIGINAL index of every point',
  shape([0, 1, 2, 3], [0, 0, 0, 0], 0, (v, i) => (i === 3 ? 7 : i)),
  [['set', 0, 0], ['lin', 1, 1], ['lin', 2, 2], ['lin', 7, 3]]);

// Strictly increasing times, unchanged: a duplicate breakpoint time is nudged by 1e-5 and
// the nudge accumulates, exactly as it did before.
{
  const ev = shape([0, 0.1, 0.1, 0.1, 0.4], [0, 1, 1, 2, 3]);
  const times = ev.map((e) => e[2]);
  assert(times.every((t, i) => i === 0 || t > times[i - 1]), `duplicate breakpoint times stay strictly increasing — ${show(ev)}`);
  check('and a duplicate time carries the same adjustment it always did',
    ev, [['set', 0, 0], ['lin', 1, 0.1], ['lin', 1, 0.10001], ['lin', 2, 0.10002], ['lin', 3, 0.4]]);
}

// A note that starts later: every time is t0 + T[i], and the terminal rule is the same.
check('a nonzero note start offsets every time and changes nothing else',
  shape([0, 0.05, 0.2], [100, 400, 400], 3.25),
  [['set', 100, 3.25], ['lin', 400, 3.3]]);

check('an empty curve schedules nothing', shape([], []), []);
check('a single point is one event', shape([0.5], [42], 1), [['set', 42, 1.5]]);

// ---- part two: source lifetimes, through the real rack ------------------------------
let chromium;
let esbuild;
try { ({ chromium } = require('playwright')); esbuild = require('esbuild'); } catch {
  console.log('\nnote: playwright or esbuild not installed, the lifetime half is skipped');
  console.log(failed ? `\nJMJR-4 LIFETIMES: ${failed} FAILED` : '\nJMJR-4 LIFETIMES: OK (automation only)');
  process.exit(failed ? 1 : 0);
}

const J = (p) => JSON.stringify(p);
const ENTRY = `
import { VOICES } from ${J(join(ROOT, 'src/data/voices.js'))};
import { VoiceRack } from ${J(join(ROOT, 'src/engine/voices.js'))};
import { automate } from ${J(join(ROOT, 'src/engine/jmjr4/dsp.js'))};

/*
 * The equivalence the terminal-plateau rule claims, rendered rather than argued: one
 * ConstantSource at 1 through a GainNode, the curve on that gain, and the output sampled.
 * mode 'full' schedules EVERY point the way the code did before round two; 'automate' is
 * the shipped path. If the two ever differ by a sample, the rule is wrong — including after
 * a cancelScheduledValues or a setTargetAtTime retarget on either side of the point the new
 * rule leaves out, which is where an omitted event could show itself.
 */
window.__curve = async ({ T, V, t0 = 0, mode, cancelAt = null, retargetTo = null, tc = 0.02,
  rate = 48000, seconds = 1, probes }) => {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  const src = ctx.createConstantSource();
  src.offset.value = 1;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(g);
  g.connect(ctx.destination);
  if (mode === 'automate') {
    automate(g.gain, T, V, t0);
  } else {
    const times = [];
    let last = -1;
    for (let i = 0; i < T.length; i++) { let t = t0 + T[i]; if (t <= last) t = last + 1e-5; times.push(t); last = t; }
    g.gain.setValueAtTime(V[0], times[0]);
    for (let i = 1; i < T.length; i++) g.gain.linearRampToValueAtTime(V[i], times[i]);
  }
  if (cancelAt != null) g.gain.cancelScheduledValues(cancelAt);
  if (retargetTo != null) g.gain.setTargetAtTime(retargetTo, cancelAt ?? 0, tc);
  src.start(0);
  src.stop(seconds);
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  return probes.map((t) => d[Math.min(d.length - 1, Math.floor(t * rate))]);
};

// Fixtures whose aspiration is a KNOWN shape, so "the noise stops when the breath does" is a
// claim about a curve this file can point at rather than about whatever the bank now says.
VOICES.jmjrLifeBreath = { id: 'jmjrLifeBreath', label: 'life breath', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
  jmjr4: { voice: 'announcer', line: 'doo', unison: 1, breath: 0.6,
    amp: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.15 } } };
VOICES.jmjrLifeNoBreath = { ...VOICES.jmjrLifeBreath, id: 'jmjrLifeNoBreath',
  jmjr4: { ...VOICES.jmjrLifeBreath.jmjr4, breath: 0 } };
// An H in the line: aspiration in the MIDDLE of a syllable, which is the case a stop must
// not be taken across.
VOICES.jmjrLifeHah = { id: 'jmjrLifeHah', label: 'life hah', category: 'Lead', synth: 'JMJR-4', dur: 1.5,
  jmjr4: { voice: 'announcer', line: 'hah', unison: 1, breath: 0.6,
    amp: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.15 } } };
VOICES.jmjrLifeChoir = { id: 'jmjrLifeChoir', label: 'life choir', category: 'Pad', synth: 'JMJR-4', dur: 8,
  jmjr4: { voice: 'chorister', line: 'aah', unison: 3, spread: 20, breath: 0.5,
    amp: { attack: 0.1, decay: 0.3, sustain: 1, release: 0.6 } } };
// an ending consonant, so the note's second graph (the ending IR) is in the census too
VOICES.jmjrLifeDum = { id: 'jmjrLifeDum', label: 'life dum', category: 'Lead', synth: 'JMJR-4', dur: 1,
  jmjr4: { voice: 'announcer', line: 'dum', unison: 1, breath: 0.4,
    amp: { attack: 0.01, decay: 0.2, sustain: 1, release: 0.12 } } };

/*
 * Every AudioScheduledSourceNode built during one workload: when it started, and EVERY stop
 * it was given, in the order they were given. The spec's rule is that the last stop() wins,
 * so "no stop may be later than the first one booked" is the property the whole aspiration
 * optimisation rests on, and it is checked per source rather than in aggregate.
 */
function watch() {
  const rows = [];
  const restore = [];
  // AudioBufferSourceNode, OscillatorNode and ConstantSourceNode each declare their OWN
  // start() — the signatures differ — so patching AudioScheduledSourceNode alone catches the
  // stops and none of the starts, and every stop on a buffer source then looks like a
  // separate source with one stop. Which is the shape that hides a widened stop completely.
  for (const C of [AudioScheduledSourceNode, AudioBufferSourceNode, OscillatorNode, ConstantSourceNode]) {
    const proto = C && C.prototype;
    if (!proto || !Object.prototype.hasOwnProperty.call(proto, 'start')) continue;
    const orig = proto.start;
    proto.start = function patched(when, ...rest) {
      this.__row = { kind: this.constructor.name, start: when == null ? 0 : when, stops: [] };
      rows.push(this.__row);
      return orig.call(this, when, ...rest);
    };
    restore.push(() => { proto.start = orig; });
  }
  const SP = AudioScheduledSourceNode.prototype;
  const oStop = SP.stop;
  SP.stop = function patched(when) {
    const w = when == null ? 0 : when;
    if (this.__row) this.__row.stops.push(w);
    else rows.push({ kind: this.constructor.name, start: null, stops: [w] });
    return oStop.call(this, when);
  };
  restore.push(() => { SP.stop = oStop; });
  return { rows, off: () => { for (const f of restore) f(); } };
}

window.__life = async ({ rate = 48000, seconds, plays, release = null, panicAt = null, lane = 'vox' }) => {
  const w = watch();
  let played;
  let buf;
  try {
    const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
    const rack = new VoiceRack(ctx);
    const dry = ctx.createGain();
    dry.connect(ctx.destination);
    played = plays.map((p) => rack.play(lane, p.voice, p.hz, {
      time: p.at, dur: p.hold ? null : p.dur, gain: 0.6, dry, wet: null, echo: false,
      step: p.step ?? null, preview: !!p.hold, hold: !!p.hold,
    }));
    if (release) for (const key of [].concat(release)) rack._releasePreview(key);
    // A panic is stopPreview(): the desk's own, at the context's clock, which offline is 0.
    // Its point here is not when it lands but that it goes through the SAME callback a
    // note-off does, so a burst booked for later is not un-booked by it.
    if (panicAt != null) rack.stopPreview();
    buf = await ctx.startRendering();
  } finally { w.off(); }
  const d = buf.getChannelData(0);
  let peak = 0; let sum = 0; let bad = 0;
  const tailFrom = Math.max(0, d.length - Math.floor(rate * 0.25));
  let tail = 0; let tailN = 0;
  for (let i = 0; i < d.length; i++) {
    const x = d[i];
    if (!Number.isFinite(x)) { bad++; continue; }
    if (Math.abs(x) > peak) peak = Math.abs(x);
    sum += x * x;
    if (i >= tailFrom) { tail += x * x; tailN++; }
  }
  return {
    played, frames: d.length, peak, bad,
    rms: Math.sqrt(sum / d.length), tailRms: tailN ? Math.sqrt(tail / tailN) : 0,
    sources: w.rows.map((r) => ({ kind: r.kind, start: r.start, stops: r.stops })),
  };
};
window.__ready = true;
`;

const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
const html = '<!doctype html><meta charset="utf-8">' + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://jmjr4-lifetimes.test/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  const life = (a) => page.evaluate((x) => window.__life(x), a);

  /** The rule the whole aspiration change rests on: a source is only ever re-stopped EARLIER. */
  const neverWidened = (r) => r.sources.filter((s) => s.stops.length > 1 && Math.max(...s.stops) > s.stops[0] + 1e-9);
  const noiseRows = (r) => r.sources.filter((s) => s.kind === 'AudioBufferSourceNode');
  // The LAST stop is the one a source honours — the spec's rule, and the reason `cut` exists.
  const effective = (s) => (s.stops.length ? s.stops[s.stops.length - 1] : Infinity);
  const unstopped = (r) => r.sources.filter((s) => s.stops.length === 0);
  const describe = (rows) => rows.map((s) => `${s.kind}@${s.start} stops [${s.stops.join(', ')}]`).join('; ');

  console.log('\n-- source lifetimes --');

  // ---- a plain sung note: the noise stops when the breath does ----
  {
    const r = await life({ seconds: 3, plays: [{ voice: 'jmjrLifeBreath', hz: 130.81, at: 0.05, dur: 1, step: 0 }] });
    assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4, `a breathy doo plays (rms ${r.rms.toFixed(4)})`);
    assert(neverWidened(r).length === 0, 'no source is ever re-stopped later than its first booking');
    const noise = noiseRows(r);
    assert(noise.length > 0 && noise.every((s) => s.stops.length > 0), `every noise source is booked to stop (${noise.length} of them)`);
    assert(unstopped(r).length === 0, `and no source of any kind is left unstopped (${describe(unstopped(r)) || 'none'})`);
    assert(r.tailRms < 1e-3, `and the note has gone quiet by the end (tail rms ${r.tailRms.toExponential(1)})`);
  }

  // ---- the breath of a doo is over long before the note is ----
  {
    const r = await life({ seconds: 5, plays: [{ voice: 'jmjrLifeBreath', hz: 130.81, at: 0.05, dur: 3, step: 0 }] });
    const noise = noiseRows(r);
    assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4, 'a three-second breathy doo plays');
    // The D's release aspiration is the only breath in the syllable: it is over within a
    // tenth of a second, and the note runs for three. The noise source must not outlive it.
    const asp = Math.min(...noise.map(effective));
    assert(asp < 0.5, `the aspiration noise stops when the breath does, not when the note does (${asp.toFixed(3)} s of a 3 s note)`);
    assert(r.tailRms < 1e-3, 'and the note is still silent at the end');
  }

  // ---- a vowel with no consonant has no aspiration branch to stop ----
  {
    const r = await life({ seconds: 4, plays: [{ voice: 'jmjrLifeChoir', hz: 164.81, at: 0.05, dur: 2, step: 0 }] });
    assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4, 'a breathy choir note plays');
    assert(neverWidened(r).length === 0, 'the choir note never re-stops a source later');
    assert(unstopped(r).length === 0, `every source of a choir note is booked to stop (${describe(unstopped(r)) || 'none'})`);
    // An aah is one vowel: syll.js writes zero aspiration at every breakpoint whatever
    // BREATH says, so the branch is omitted at build and there is no noise to stop.
    assert(noiseRows(r).length === 0, `a plain vowel builds no aspiration source at all (${noiseRows(r).length} found)`);
  }

  // ---- an H inside the syllable: aspiration, then silence, then more vowel ----
  {
    const r = await life({ seconds: 3, plays: [{ voice: 'jmjrLifeHah', hz: 130.81, at: 0.05, dur: 1, step: 0 }] });
    assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4, 'an H-onset syllable plays');
    assert(neverWidened(r).length === 0, 'and never re-stops a source later');
  }

  // ---- an ending consonant: two graphs, both of them stopping ----
  {
    const r = await life({ seconds: 3, plays: [{ voice: 'jmjrLifeDum', hz: 130.81, at: 0.05, dur: 1, step: 0 }] });
    assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4, 'a note with an ending consonant plays');
    assert(neverWidened(r).length === 0, 'the ending consonant does not widen a stop either');
    assert(r.sources.every((s) => s.stops.length > 0), 'every source of both graphs is booked to stop');
  }

  // ---- held from the keyboard, then released ----
  {
    const r = await life({ seconds: 4, release: ['vox|164.81'],
      plays: [{ voice: 'jmjrLifeChoir', hz: 164.81, at: 0.05, dur: 3, hold: true }] });
    assert(r.played[0] === true && r.bad === 0, 'a held key registers');
    assert(neverWidened(r).length === 0, 'a note-off does not extend any booked stop');
    assert(r.tailRms < 1e-3, `a released note is silent by the end (tail rms ${r.tailRms.toExponential(1)})`);
    assert(r.sources.every((s) => effective(s) < 3.9), `and every source is pulled back from the 30 s backstop (latest effective stop ${Math.max(...r.sources.map(effective)).toFixed(2)} s)`);
  }

  // ---- a scheduled note-off on a note that also has a future burst ----
  {
    const plays = [110, 123.47, 130.81, 146.83].map((hz, i) => ({ voice: 'jmjrLifeDum', hz, at: 0.05 + i * 0.5, dur: 0.45, step: i }));
    const r = await life({ seconds: 4, plays });
    assert(r.played.every(Boolean) && r.bad === 0 && r.rms > 1e-4, 'a line of four ending-consonant notes plays through');
    assert(neverWidened(r).length === 0, 'no note in the line widens another\'s stop');
  }

  // ---- rapid retrigger: a note-on landing inside the note before it ----
  {
    const plays = Array.from({ length: 12 }, (_, i) => ({ voice: 'jmjrLifeBreath', hz: [110, 130.81, 146.83][i % 3], at: 0.05 + i * 0.12, dur: 0.2, step: i }));
    const r = await life({ seconds: 4, plays });
    assert(r.played.every(Boolean) && r.bad === 0 && r.rms > 1e-4, 'twelve overlapping retriggers play');
    assert(neverWidened(r).length === 0, 'a retrigger never extends the previous note\'s stops');
    assert(r.tailRms < 1e-3, `and the whole run is quiet by the end (tail rms ${r.tailRms.toExponential(1)})`);
  }

  // ---- panic while a burst is still in the future ----
  {
    const r = await life({ seconds: 3, panicAt: 0,
      plays: [{ voice: 'jmjrLifeDum', hz: 130.81, at: 0.5, dur: 1, hold: true }] });
    assert(r.bad === 0, 'a panic before a future burst renders finite samples');
    assert(neverWidened(r).length === 0, 'and does not un-book a stop it should have brought forward');
    assert(r.sources.every((s) => effective(s) < 2.9), `every source is stopped by the panic rather than left running (latest effective stop ${Math.max(...r.sources.map(effective)).toFixed(2)} s)`);
    assert(r.rms < 1e-3, `a panicked note makes (almost) no sound (rms ${r.rms.toExponential(1)})`);
  }

  // ---- SPEAK: the whole phrase, and a panic through the same callback ----
  {
    const say = { voice: 'jmjrAnnouncer', hz: 130.81, at: 0.05, dur: 0.4, step: 0 };
    const r = await life({ seconds: 3, plays: [say] });
    assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4, 'the announcer speaks');
    assert(neverWidened(r).length === 0, 'a spoken phrase widens no stop');
  }

  // ---- a note with NO aspiration at all still plays and still stops ----
  {
    const r = await life({ seconds: 3, plays: [{ voice: 'jmjrLifeNoBreath', hz: 130.81, at: 0.05, dur: 1, step: 0 }] });
    assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4, 'a zero-breath note plays');
    assert(neverWidened(r).length === 0, 'and widens nothing');
    assert(r.tailRms < 1e-3, 'and is quiet by the end');
  }

  // ---- the omitted terminal point changes no sample, cancelled or retargeted ----
  {
    console.log('\n-- the terminal point, rendered --');
    const curve = (a) => page.evaluate((x) => window.__curve(x), a);
    // the plan's example, stretched into a second so a probe lands in every region
    const T = [0, 0.15, 0.25, 0.9];
    const V = [200, 200, 750, 750];
    const probes = [0.02, 0.1, 0.2, 0.26, 0.5, 0.8, 0.95];
    const same = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
    const both = async (extra, msg) => {
      const full = await curve({ T, V, mode: 'full', probes, ...extra });
      const auto = await curve({ T, V, mode: 'automate', probes, ...extra });
      assert(same(full, auto), `${msg} — full ${full.map((x) => x.toFixed(2)).join('/')} vs automate ${auto.map((x) => x.toFixed(2)).join('/')}`);
      return auto;
    };
    const plain = await both({}, 'the curve renders identically with and without the terminal point');
    assert(Math.abs(plain[6] - 750) < 1e-6, `and it is still 750 after the point that was dropped (${plain[6].toFixed(2)})`);
    // BEFORE the dropped point, and before the ramp that reaches it: a cancel here throws
    // the rise away on both sides, so both must sit at 200.
    const early = await both({ cancelAt: 0.2 }, 'a cancel BEFORE the removed point behaves the same');
    assert(Math.abs(early[6] - 200) < 1e-6, `and a cancel mid-rise leaves the param at 200 (${early[6].toFixed(2)})`);
    // AFTER it: the old code had an event at 0.9 to cancel and the new code has none, and
    // the rendered result is the same 750 either way.
    const late = await both({ cancelAt: 0.6 }, 'a cancel AFTER the removed point behaves the same');
    assert(Math.abs(late[6] - 750) < 1e-6, `and leaves the param at 750 (${late[6].toFixed(2)})`);
    // The morph's own shape: cancel, then glide somewhere else — `retarget`'s `go`.
    await both({ cancelAt: 0.6, retargetTo: 300, tc: 0.05 }, 'a retarget after the removed point glides identically');
    await both({ cancelAt: 0.18, retargetTo: 300, tc: 0.05 }, 'a retarget before the removed point glides identically');
    // A scheduled morph landing exactly ON the dropped point's time.
    await both({ cancelAt: 0.9, retargetTo: 500, tc: 0.05 }, 'a retarget AT the removed point\'s own time glides identically');
  }

  // ---- a scheduled morph through the rack: the sweep still sweeps ----
  {
    for (const id of ['jmjrOohOpens', 'jmjrHumsClosed']) {
      const r = await life({ seconds: 5, plays: [{ voice: id, hz: 164.81, at: 0.05, dur: 3, step: 0 }] });
      assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4, `${id}: a scheduled morph plays through`);
      assert(neverWidened(r).length === 0, `${id}: and widens no stop`);
    }
  }

  // ---- the shipped bank, at two rates: finite, and no widened stop anywhere ----
  for (const rate of [44100, 48000]) {
    const ids = ['jmjrChoirAah', 'jmjrChoirOoh', 'jmjrDoowop', 'jmjrRobotChant', 'jmjrHummer', 'jmjrHumItClosed'];
    let widened = 0;
    let bad = 0;
    for (const id of ids) {
      const r = await life({ rate, seconds: 4, plays: [{ voice: id, hz: 164.81, at: 0.05, dur: 1.5, step: 0 }] });
      widened += neverWidened(r).length;
      bad += r.bad;
      if (r.rms <= 1e-4) fail(`${id} at ${rate} made no sound`);
    }
    assert(widened === 0 && bad === 0, `six shipped presets at ${rate} Hz: no widened stop, every sample finite`);
  }

  assert(errors.length === 0, `no page errors (${errors.join(' | ')})`);
} finally {
  await browser.close();
}

console.log(failed ? `\nJMJR-4 LIFETIMES: ${failed} FAILED` : '\nJMJR-4 LIFETIMES: OK');
process.exit(failed ? 1 : 0);
