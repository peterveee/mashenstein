/*
 * JMJR-4 — the seams the sound-preserving performance pass moved, and the rules that keep
 * them sound. Not a benchmark: nothing here asserts a millisecond, because a millisecond is
 * a fact about the machine that ran it. The measurements live in
 * work/local/jmjr4-perf-2026-09-06/; this file is what has to stay true afterwards.
 *
 *   node tests/jmjr4-performance.js
 *
 * What it holds:
 *   nasal fusion      one IIRFilterNode carrying the product of the Klatt resonator and the
 *                     anti-resonator is the SAME filter as the two in series, at both rates
 *                     and at every nasal place the data reaches
 *   silent branches   an aspiration branch is built exactly when the note's aspiration
 *                     envelope is not zero everywhere — and a voiced stop's is not, whatever
 *                     BREATH says, so the burst keeps its release aspiration
 *   extra events      a zero-gain extra is skipped WITHOUT renumbering the ones that remain:
 *                     the survivor keeps the seed and the level its own IR index gives it
 *   lifetime          every source a note makes is booked to stop, and a later stop never
 *                     replaces an earlier one; repeated batches do not grow the rack
 *   sound             the nasal and stop presets still sound, finite and under full scale,
 *                     at 44.1 and 48 kHz, and go quiet when they are done
 *
 * Needs Playwright's Chromium; skipped with a note where it is not installed.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

let chromium;
let esbuild;
try { ({ chromium } = require('playwright')); esbuild = require('esbuild'); } catch {
  console.log('note: playwright or esbuild not installed, the JMJR-4 performance test is skipped');
  process.exit(0);
}

const ENTRY = `
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import { JMJR4_DATA } from ${JSON.stringify(join(ROOT, 'src/engine/jmjr4/data.js'))};
import { compileJmjr4 } from ${JSON.stringify(join(ROOT, 'src/engine/jmjr4/compile.js'))};
import { syllable } from ${JSON.stringify(join(ROOT, 'src/engine/jmjr4/syll.js'))};
import { renderIr } from ${JSON.stringify(join(ROOT, 'src/engine/jmjr4/dsp.js'))};
import { HUM_PLACE } from ${JSON.stringify(join(ROOT, 'src/engine/jmjr4/note.js'))};

const NOISE_SECONDS = 4;                       // dsp.js's shared buffer length
const noiseOffset = (seed) => ((seed >>> 0) % (NOISE_SECONDS * 1000)) / 1000;

/** Every anti-resonator place the bank can reach: the phoneme table's, plus the live hum's. */
window.__nasalPlaces = () => {
  const places = new Set([HUM_PLACE]);
  for (const p of Object.values(JMJR4_DATA.phonemes)) if (p.nasal && p.nz) places.add(Math.round(p.nz));
  return [...places].sort((a, b) => a - b);
};

/** The serial pole/zero pair against the one filter carrying their product, impulse for impulse. */
window.__nasalEquivalence = async ({ rate, fz }) => {
  const tr = JMJR4_DATA.tract;
  const [fnp, bwp] = tr.nasal_pole;
  const bwz = tr.nasal_zero_bw;
  const T = 1 / rate;
  const pC = -Math.exp(-2 * Math.PI * bwp * T);
  const pB = 2 * Math.exp(-Math.PI * bwp * T) * Math.cos(2 * Math.PI * fnp * T);
  const pA = 1 - pB - pC;
  const C = -Math.exp(-2 * Math.PI * bwz * T);
  const B = 2 * Math.exp(-Math.PI * bwz * T) * Math.cos(2 * Math.PI * fz * T);
  const A = 1 - B - C;
  const run = async (make) => {
    const ctx = new OfflineAudioContext(1, rate, rate);            // one second of impulse response
    const buf = ctx.createBuffer(1, 1, rate);
    buf.getChannelData(0)[0] = 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const stage = make(ctx);
    src.connect(stage.head); stage.tail.connect(ctx.destination);
    src.start(0);
    return (await ctx.startRendering()).getChannelData(0);
  };
  const pair = await run((ctx) => {
    const pole = ctx.createIIRFilter([pA], [1, -pB, -pC]);
    const zero = ctx.createIIRFilter([1 / A, -B / A, -C / A], [1]);
    pole.connect(zero);
    return { head: pole, tail: zero };
  });
  const fused = await run((ctx) => {
    const n = ctx.createIIRFilter([pA / A, -pA * B / A, -pA * C / A], [1, -pB, -pC]);
    return { head: n, tail: n };
  });
  let peak = 0; let maxDiff = 0; let bad = 0;
  for (let i = 0; i < pair.length; i++) {
    if (!Number.isFinite(pair[i]) || !Number.isFinite(fused[i])) { bad++; continue; }
    peak = Math.max(peak, Math.abs(pair[i]));
    maxDiff = Math.max(maxDiff, Math.abs(pair[i] - fused[i]));
  }
  return { peak, maxDiff, bad };
};

const irFor = (voiceId, hold) => {
  const v = VOICES[voiceId];
  const { patch } = compileJmjr4(v, JMJR4_DATA);
  const syl = patch.line[0];
  return { patch, ir: syllable(JMJR4_DATA, { onset: syl.onset, vowel: syl.vowel, ending: [], hz: 164.81, hold, ctl: patch.ctl }) };
};

/**
 * What ONE note's graph is made of, counted at the source: every factory the note calls and
 * every buffer source's start offset. renderIr directly, not through the rack, so the lane's
 * own stage is not in the count.
 */
const irForCtl = (voiceId, hold, over) => {
  const { patch } = compileJmjr4(VOICES[voiceId], JMJR4_DATA);
  const syl = patch.line[0];
  return syllable(JMJR4_DATA, { onset: syl.onset, vowel: syl.vowel, ending: [], hz: 164.81, hold, ctl: { ...patch.ctl, ...over } });
};

window.__noteCensus = async ({ voiceId, rate = 48000, hold = 2, nasalPlaces = null, mutate = null }) => {
  const ir = mutate === 'breath-0' ? irForCtl(voiceId, hold, { asp: 0 }) : irFor(voiceId, hold).ir;
  if (mutate === 'force-aspiration') {
    // the same note with an audible aspiration envelope, so the omission is measured on ONE
    // preset rather than across two with different flutter and unison
    ir.aspiration = { t: ir.aspiration.t, v: ir.aspiration.v.map(() => 0.5) };
  }
  if (mutate === 'zero-first-extra') {
    // two extras, the first with a gain of exactly zero: the survivor must keep index 1
    ir.extras = [ir.extras[0], { ...ir.extras[0], start: ir.extras[0].start + Math.round(rate * 0.05) }];
    ir.levels = { ...ir.levels, extra_gains: [0, ir.levels.extra_gains[0]] };
  }
  const made = {};
  const bufferStarts = [];
  const CtxProto = Object.getPrototypeOf(OfflineAudioContext.prototype);
  const names = ['createBufferSource', 'createGain', 'createIIRFilter', 'createBiquadFilter', 'createOscillator'];
  const orig = {};
  const oStart = AudioBufferSourceNode.prototype.start;
  let handle;
  let aspAllZero;
  try {
    const ctx = new OfflineAudioContext(1, Math.ceil(rate * (hold + 1)), rate);
    const dest = ctx.createGain();
    dest.connect(ctx.destination);
    const gain = ir.levels.asp_gain;
    aspAllZero = ir.aspiration.v.every((v) => v * gain === 0);
    for (const n of names) { orig[n] = CtxProto[n]; CtxProto[n] = function patched(...a) { made[n] = (made[n] || 0) + 1; return orig[n].apply(this, a); }; }
    AudioBufferSourceNode.prototype.start = function patched(when, offset, d) {
      bufferStarts.push({ when, offset });
      return oStart.call(this, when, offset, d);
    };
    handle = renderIr(ctx, ir, { start: 0, destination: dest, nasalPlaces: nasalPlaces || [] });
  } finally {
    for (const n of names) if (orig[n]) CtxProto[n] = orig[n];
    AudioBufferSourceNode.prototype.start = oStart;
  }
  return { made, bufferStarts, aspAllZero, extras: ir.extras.length, seed: ir.seed,
    expectedOffsets: ir.extras.map((_, i) => noiseOffset(ir.seed + 17 * (i + 1))),
    aspOffset: noiseOffset(ir.seed),
    nodes: handle.nodes.length, sources: handle.sources.length };
};

/** Every source a WHOLE note-on makes, with its start and every stop booked on it, in order. */
window.__lifetimes = async ({ plays, rate = 48000, seconds = 6, release = null }) => {
  const rows = [];
  const SP = AudioScheduledSourceNode.prototype;
  const oStart = SP.start; const oStop = SP.stop;
  let seq = 0;
  let racked;
  try {
    SP.start = function patched(when, ...rest) {
      this.__id = ++seq;
      rows.push({ id: this.__id, kind: this.constructor.name, start: when == null ? 0 : when, stops: [] });
      return oStart.call(this, when, ...rest);
    };
    SP.stop = function patched(when) {
      const r = rows.find((x) => x.id === this.__id);
      if (r) r.stops.push(when == null ? 0 : when); else rows.push({ id: -1, kind: this.constructor.name, start: null, stops: [when == null ? 0 : when] });
      return oStop.call(this, when);
    };
    const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
    const rack = new VoiceRack(ctx);
    const dry = ctx.createGain(); dry.connect(ctx.destination);
    for (const p of plays) {
      rack.play('vox', p.voice, p.hz, { time: p.at, dur: p.hold ? null : p.dur, gain: 0.8, dry, wet: null,
        echo: false, step: p.step == null ? null : p.step, preview: !!p.hold, hold: !!p.hold });
    }
    if (release) rack._releasePreview(release);
    await ctx.startRendering();
    racked = { last: rack._jmjr4Last ? rack._jmjr4Last.size : 0, held: rack._heldNative ? rack._heldNative.size : 0,
      lines: rack._jmjr4Lines ? rack._jmjr4Lines.size : 0 };
  } finally { SP.start = oStart; SP.stop = oStop; }
  const end = plays.reduce((m, p) => Math.max(m, p.at + (p.dur || 0)), 0);
  return {
    rack: racked, sources: rows.length, noteEnd: end,
    neverBooked: rows.filter((r) => !r.stops.length).length,
    // the spec's rule: a later stop() REPLACES an earlier one, so a re-stop must never be later
    widened: rows.filter((r) => r.stops.length > 1 && Math.max.apply(null, r.stops) > r.stops[0]).length,
    latest: rows.reduce((m, r) => Math.max(m, r.stops.length ? Math.max.apply(null, r.stops) : Infinity), 0),
  };
};

/** One preset through the real rack, scanned. */
window.__render = async ({ voice, hz, rate, seconds, dur, plays }) => {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  const rack = new VoiceRack(ctx);
  const dry = ctx.createGain(); dry.connect(ctx.destination);
  const list = plays || [{ voice, hz, at: 0.05, dur, step: 0 }];
  const played = list.map((p) => rack.play('vox', p.voice || voice, p.hz, { time: p.at, dur: p.dur, gain: 0.5,
    dry, wet: null, echo: false, step: p.step == null ? null : p.step }));
  const d = (await ctx.startRendering()).getChannelData(0);
  let peak = 0; let sum = 0; let bad = 0;
  for (let i = 0; i < d.length; i++) { const x = d[i]; if (!Number.isFinite(x)) bad++; else { peak = Math.max(peak, Math.abs(x)); sum += x * x; } }
  const win = (a, b) => { let s = 0; let n = 0; for (let i = Math.floor(a * rate); i < Math.min(d.length, Math.floor(b * rate)); i++) { s += d[i] * d[i]; n++; } return n ? Math.sqrt(s / n) : 0; };
  return { played, peak, rms: Math.sqrt(sum / d.length), bad, tail: win(seconds - 0.3, seconds) };
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
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://jmjr4-performance.test/', { waitUntil: 'load' });

  // ---- the fused nasal filter IS the pole/zero pair --------------------------------
  {
    const places = await page.evaluate(() => window.__nasalPlaces());
    assert(places.length > 0, `the data names ${places.length} nasal places (${places.join(', ')} Hz)`);
    let worst = 0;
    let worstAt = '';
    for (const rate of [44100, 48000]) {
      for (const fz of places) {
        const r = await page.evaluate((a) => window.__nasalEquivalence(a), { rate, fz });
        if (r.bad) fail(`nasal ${fz} Hz at ${rate}: the impulse response is not finite`);
        const rel = r.maxDiff / (r.peak || 1);
        if (rel > worst) { worst = rel; worstAt = `${fz} Hz at ${rate}`; }
      }
    }
    // Two float paths through the same transfer function: equal to well inside single
    // precision, which is what the graph carries. Not a timing threshold — a numeric one.
    assert(worst < 1e-6, `the fused nasal filter matches the serial pair everywhere (worst ${worst.toExponential(2)} of peak, ${worstAt})`);
  }

  // ---- a silent aspiration branch is not built, and a stop's is ---------------------
  {
    // Choir Aah is a pure vowel: syll.js writes a zero at every aspiration breakpoint.
    const aah = await page.evaluate(() => window.__noteCensus({ voiceId: 'jmjrChoirAah' }));
    assert(aah.aspAllZero, 'Choir Aah has an aspiration envelope that is zero at every breakpoint');
    assert(aah.extras === 0 && (aah.made.createBufferSource || 0) === 0,
      `and so it builds no noise source at all (${aah.made.createBufferSource || 0})`);

    // Doo-wop opens on a D: the stop's release aspiration is in the envelope, so at the
    // preset's own BREATH the branch is built. The test is the EFFECTIVE gain, envelope times
    // pot: BREATH 0 zeroes it (the reference's asp_gain = asp * vref / ra) and the branch goes.
    const doo = await page.evaluate(() => window.__noteCensus({ voiceId: 'jmjrDoowop' }));
    assert(!doo.aspAllZero, 'Doo-wop opens on a stop, so its aspiration envelope is not silent');
    const dooNoBreath = await page.evaluate(() => window.__noteCensus({ voiceId: 'jmjrDoowop', mutate: 'breath-0' }));
    assert(dooNoBreath.aspAllZero && (dooNoBreath.made.createBufferSource || 0) === doo.extras,
      `at BREATH 0 the same stop keeps its burst and loses only the aspiration (${dooNoBreath.made.createBufferSource || 0} noise source)`);
    assert((doo.made.createBufferSource || 0) === 1 + doo.extras,
      `and it keeps its aspiration source beside its ${doo.extras} burst (${doo.made.createBufferSource} noise sources)`);
    assert(doo.bufferStarts.some((s) => s.offset === doo.aspOffset),
      'the aspiration source still reads the shared buffer at the offset its seed picks');

    // the same note, its aspiration envelope forced audible: exactly one source and one
    // handle source more, and it reads from the offset the note's own seed picks
    const forced = await page.evaluate(() => window.__noteCensus({ voiceId: 'jmjrChoirAah', mutate: 'force-aspiration' }));
    assert((forced.made.createBufferSource || 0) === 1 && forced.sources === aah.sources + 1,
      `the same note with an audible aspiration envelope builds it: ${aah.sources} handle sources become ${forced.sources}`);
    assert(forced.bufferStarts.length === 1 && forced.bufferStarts[0].offset === forced.aspOffset,
      'and that source reads the shared buffer at the offset the note seed picks, unchanged');
  }

  // ---- a zero-gain extra is skipped without renumbering the rest ---------------------
  {
    const r = await page.evaluate(() => window.__noteCensus({ voiceId: 'jmjrDoowop', mutate: 'zero-first-extra' }));
    assert(r.extras === 2, 'the fixture has two extra events, the first at gain zero');
    const offsets = r.bufferStarts.map((s) => s.offset);
    assert(!offsets.includes(r.expectedOffsets[0]), 'the silent extra builds nothing');
    assert(offsets.includes(r.expectedOffsets[1]),
      `and the audible one still reads from its OWN index's offset (${r.expectedOffsets[1]} s, seed + 34)`);
  }

  // ---- lifetime: booked, never widened, and the rack does not grow -------------------
  {
    const plays = [130.81, 146.83, 164.81, 196].map((hz, i) => ({ voice: 'jmjrDooWopLine', hz, at: 0.05 + i * 0.5, dur: 0.45, step: i }));
    const r = await page.evaluate((a) => window.__lifetimes(a), { plays, seconds: 5 });
    assert(r.neverBooked === 0, `every source a note makes is booked to stop (${r.sources} sources)`);
    assert(r.widened === 0, 'and no later stop replaces an earlier one');
    assert(r.latest < r.noteEnd + 3, `nothing runs past the last note plus its release (latest stop ${r.latest.toFixed(2)} s, last note ends ${r.noteEnd.toFixed(2)} s)`);

    // the same batch again and again: the rack keeps one line and one last-note record
    const many = [];
    for (let b = 0; b < 6; b++) for (let i = 0; i < 4; i++) many.push({ voice: 'jmjrDooWopLine', hz: 130.81 + i * 8, at: 0.05 + (b * 4 + i) * 0.2, dur: 0.18, step: b * 4 + i });
    const rr = await page.evaluate((a) => window.__lifetimes(a), { plays: many, seconds: 7 });
    assert(rr.rack.last <= 1 && rr.rack.lines <= 1 && rr.rack.held === 0,
      `24 note-ons leave one line and one last-note record, nothing held (last ${rr.rack.last}, lines ${rr.rack.lines}, held ${rr.rack.held})`);
    assert(rr.neverBooked === 0 && rr.widened === 0, 'and every one of their sources is booked once and never re-booked later');

    // a held key, then let go: the release must stop everything, not leave it ringing
    const held = await page.evaluate((a) => window.__lifetimes(a), {
      plays: [{ voice: 'jmjrChoirAah', hz: 164.81, at: 0.05, dur: 2, hold: true }], seconds: 6, release: 'vox|164.81',
    });
    assert(held.neverBooked === 0 && held.widened === 0, 'a held key releases through booked stops, none of them widened');
  }

  // ---- and it all still sounds, at both rates ---------------------------------------
  {
    for (const rate of [44100, 48000]) {
      for (const id of ['jmjrHummer', 'jmjrHumItClosed', 'jmjrHumsClosed', 'jmjrKazooLead', 'jmjrChoirAah', 'jmjrDoowop', 'jmjrDooWopLine']) {
        const r = await page.evaluate((a) => window.__render(a), { voice: id, hz: 164.81, rate, seconds: 5, dur: 1.2 });
        assert(r.played[0] === true && r.bad === 0 && r.rms > 1e-4 && r.peak < 1 && r.tail < 1e-3,
          `${id} at ${rate}: sounds, finite, under full scale, quiet by the end (rms ${r.rms.toFixed(4)}, peak ${r.peak.toFixed(3)})`);
      }
    }
    // BUZZ off and on are both a sound: the shelf sits in the wet path, after the fused filter
    const line = [110, 123.47, 130.81].map((hz, i) => ({ voice: 'jmjrHumsClosed', hz, at: 0.05 + i * 0.9, dur: 0.85, step: i }));
    const mixed = await page.evaluate((a) => window.__render(a), { rate: 48000, seconds: 5, plays: line });
    assert(mixed.played.every(Boolean) && mixed.bad === 0 && mixed.rms > 1e-4, 'a line of oral-to-nasal morphs plays through');
  }

  assert(errors.length === 0, `no page errors (${errors.join(' | ')})`);
} finally {
  await browser.close();
}

console.log(failed ? `\nJMJR-4 PERFORMANCE: ${failed} FAILED` : '\nJMJR-4 PERFORMANCE: OK');
process.exit(failed ? 1 : 0);
