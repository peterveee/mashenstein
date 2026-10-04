/**
 * AUTO PORTAMENTO — what it SOUNDS like, and that the scheduler asks for it correctly.
 *
 * tests/auto-portamento.js holds the decision to the page; this holds the page to the
 * ear. Every claim is made about rendered samples or about the calls the scheduler makes,
 * and every one is a comparison between two renders that differ in one setting, so it
 * holds whatever the sound is:
 *
 *   · OFF is off — a lane that never asked, one that asked for nothing, and one whose
 *     sound cannot take a slide all render the samples they always did;
 *   · a CHOSEN connection slides: the pitch leaves the source and arrives on the target
 *     inside the note, and settles there; an UNCHOSEN one is struck on the target's own
 *     pitch — even on a preset whose own glide would have slid it;
 *   · the three states run in sequence — slide, clean attack, slide — with nothing stuck
 *     ringing after the last note and the chord in the middle sounding all of its tones;
 *   · vibrato and level survive the hand-over, and the destination releases as itself;
 *   · the scheduler's notes ARE the lane view's notes: same pitches, same gates, and a
 *     slide's source gate reaches the destination while the destination keeps its own end;
 *   · a loop does not join its end to its beginning; a stale source id, a seek, and an edit
 *     that cancels a stretched gate each leave a clean strike or the written length;
 *   · the worklet core reads the same per-note treatment from the event and never from
 *     the patch every note on the lane shares.
 *
 * The pooled classes and MRDR-3 native render through the real engine in Chromium; the
 * MRDR-3 worklet's core renders browserlessly, the string the worklet runs.
 *
 *   node tests/auto-portamento-render.js
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOICES } from '../src/data/voices.js';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { renderMrdr3, frameAt as mrdrFrame } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';
import { mrdr3NoteOn } from '../src/engine/mrdr3/controller.js';
import { installDom } from './dom-stub.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const assert = (cond, msg) => {
  if (!cond) { failed++; console.log(`FAIL: ${msg}`); } else console.log(`ok: ${msg}`);
};

const RATE = 44100;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const C4 = hz(60); const D4 = hz(62); const E4 = hz(64); const F4 = hz(65); const G4 = hz(67);

// ---- measuring ------------------------------------------------------------------------
/** The times a signal crosses zero going up, interpolated to better than a sample. */
const crossings = (ch, t0, t1) => {
  const out = [];
  for (let i = Math.max(1, Math.floor(t0 * RATE)); i < Math.min(ch.length, Math.floor(t1 * RATE)); i++) {
    if (ch[i - 1] <= 0 && ch[i] > 0) out.push((i - 1 + (0 - ch[i - 1]) / (ch[i] - ch[i - 1])) / RATE);
  }
  return out;
};
/** The pitch track [time, Hz] — period by period, which is what a sine allows. */
const track = (ch, t0, t1) => {
  const c = crossings(ch, t0, t1);
  const out = [];
  for (let k = 1; k < c.length; k++) out.push([c[k], 1 / (c[k] - c[k - 1])]);
  return out;
};
const pitchAt = (ch, t, win = 0.012) => {
  const tr = track(ch, t - win, t + win);
  return tr.length ? tr.reduce((a, [, h]) => a + h, 0) / tr.length : 0;
};
const rms = (ch, t0, t1) => {
  let s = 0; let n = 0;
  for (let i = Math.floor(t0 * RATE); i < Math.min(ch.length, Math.floor(t1 * RATE)); i++) { s += ch[i] * ch[i]; n++; }
  return Math.sqrt(s / Math.max(1, n));
};
const same = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};
/** The largest sample difference — for a sound whose own renders differ by float noise. */
const farthest = (a, b) => {
  if (a.length !== b.length) return Infinity;
  let worst = 0;
  for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
  return worst;
};
const cents = (a, b) => 1200 * Math.log2(a / b);
/** The amplitude of one frequency in a window — how much of that note is sounding. */
const component = (ch, f, t0, t1) => {
  let re = 0; let im = 0;
  const a = Math.floor(t0 * RATE); const b = Math.min(ch.length, Math.floor(t1 * RATE));
  for (let i = a; i < b; i++) {
    const phase = 2 * Math.PI * f * i / RATE;
    re += ch[i] * Math.cos(phase); im += ch[i] * Math.sin(phase);
  }
  return 2 * Math.hypot(re, im) / Math.max(1, b - a);
};
const spread = (ch, t0, t1) => {
  const hzs = track(ch, t0, t1).map(([, h]) => h);
  return hzs.length ? cents(Math.max(...hzs), Math.min(...hzs)) : 0;
};

// ---- the sounds: sine, so a pitch can be read off the waveform ---------------------------
const ENV = { attack: 0.005, decay: 0.05, sustain: 0.9, release: 0.1 };
const TONE = { synth: 'CRLS-1', category: 'Lead', dur: 1,
  options: { oscillator: { type: 'sine' }, envelope: { ...ENV } } };
const MRDR = { synth: 'MRDR-3', category: 'Lead', dur: 1,
  layer: { osc1: { type: 'sine', ratio: 1, gain: 0.8, ...ENV } } };
const PRESETS = {
  'CRLS-1 poly': TONE,
  'CRLS-1 mono + glide': { ...TONE, mode: 'mono', portamento: 0.12 },
  'MRDR-3 poly': MRDR,
  'MRDR-3 mono + glide': { ...MRDR, mode: 'mono', portamento: 0.12 },
  'MRDR-3 legato + glide': { ...MRDR, mode: 'legato', portamento: 0.12 },
};

// ---- the songs: 120 bpm, so a step is 0.125 s and a beat half a second --------------------
const BPM = 120;
const STEP = 60 / BPM / 4;
const lane = (slots) => {
  const notes = new Array(32).fill(null); const lens = new Array(32).fill(null);
  for (const [slot, value, len] of slots) { notes[slot] = value; lens[slot] = len; }
  return { lead: notes, leadLen: lens };
};
const bankOf = (...sections) => ({
  bpm: BPM, sections, order: sections.map((_, i) => i),
});
/** A pickup into a held note: the likeliest slide there is. */
const PAIR = bankOf(lane([[0, C4, 2], [2, D4, 8]]));
/** Slide, then a pair that cannot slide (a repeat), then a slide, with a rest between each. */
const SEQUENCE = bankOf(lane([[0, C4, 2], [2, D4, 4], [10, E4, 2], [12, E4, 4], [20, F4, 2], [22, G4, 4]]));
const portamento = (over = {}) => ({ enabled: true, amount: 35, glide: 100, version: 1, ...over });
const mixOf = (preset, port = portamento()) => ({
  voiceParams: { leadVoice: { ...preset } },
  lanes: { lead: port ? { noteFx: { portamento: port } } : {} },
});

// ---- the page --------------------------------------------------------------------------
const ENTRY = `
import { renderBankPage } from ${JSON.stringify(join(ROOT, 'tools/lib/render-bank-page.js'))};
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))};

// Every note the scheduler hands the rack, as it hands it.
const calls = [];
const play = VoiceRack.prototype.play;
VoiceRack.prototype.play = function spy(laneKey, voiceId, freq, opts) {
  calls.push({
    laneKey, freq, time: opts.time, dur: opts.dur,
    articulation: opts.articulation ? { ...opts.articulation } : null,
  });
  return play.call(this, laneKey, voiceId, freq, opts);
};

window.__render = async ({ bank, mix, steps, loop, startStep }) => {
  calls.length = 0;
  // What the song and the catalogue say before and after: the plan is beside the notes, and
  // nothing the engine is handed — a lane array, a length, a shared preset — is written to.
  const snapshot = () => JSON.stringify([bank, mix, VOICES.syncRazorLead, VOICES.simpleSawtooth,
    VOICES.mrdrConcertFlute]);
  const before = snapshot();
  const out = await renderBankPage({
    bank, steps, loop, tail: 1, seed: 0x5eed1, sampleRate: ${RATE}, mix, trackId: null,
    blocks: Math.ceil(steps / 32), ...(startStep != null ? { startStep } : {}),
  });
  const view = Audio._portamentoView?.();
  return {
    samples: Array.from(out.outL),
    calls: calls.slice(),
    events: view ? view.events('lead') : [],
    untouched: snapshot() === before,
  };
};

// A lane that does not exist yet: the first notes wait for it, and carry their treatment
// with them. Every message the page posts to a port is logged, which is where a worklet
// note's articulation finally shows.
window.__awQueue = async () => {
  const id = '__apaw';
  VOICES[id] = { synth: 'MRDR-3 AW', id, dur: 1, category: 'Lead',
    layer: { osc1: { type: 'sine', ratio: 1, gain: 0.8, attack: 0.005, decay: 0.05, sustain: 0.9, release: 0.1 } } };
  const ctx = new OfflineAudioContext(2, ${RATE}, ${RATE});
  const rack = new VoiceRack(ctx);
  const posted = [];
  const post = MessagePort.prototype.postMessage;
  MessagePort.prototype.postMessage = function logged(message, ...rest) {
    if (message && message.type === 'noteOn') posted.push(message);
    return post.call(this, message, ...rest);
  };
  const dry = ctx.createGain(); dry.connect(ctx.destination);
  const attempts = [];
  const awPlay = rack._playMrdr3Aw.bind(rack);
  rack._playMrdr3Aw = (v, note) => { attempts.push(note.articulation ? { ...note.articulation } : null); return awPlay(v, note); };
  const note = (hz, at, articulation) => rack.play('lead', id, hz, {
    time: at, dur: 0.3, gain: 0.5, dry, wet: null, echo: false, articulation });
  note(262, 0.1, { kind: 'attack', id: 'a', from: null, glide: 0, link: true });
  note(294, 0.25, { kind: 'slide', id: 'b', from: 'a', glide: 0.1, link: false });
  const queuedAtFirst = rack._mrdrAwQueue?.get('lead')?.notes.length || 0;
  const until = performance.now() + 4000;
  while (performance.now() < until && posted.length < 2) await new Promise((r) => setTimeout(r, 20));
  MessagePort.prototype.postMessage = post;
  return { queuedAtFirst, attempts, posted: posted.map((m) => ({ auto: m.auto || null, frame: m.frame })) };
};

// A rack on its own, for the claims about its book-keeping: one preset, a lane, hand-fed notes.
let seq = 0;
window.__rack = async ({ preset, script }) => {
  const id = '__ap' + (seq++);
  VOICES[id] = { ...JSON.parse(JSON.stringify(preset)), id, dur: 1 };
  const ctx = new OfflineAudioContext(1, Math.ceil(${RATE} * 2), ${RATE});
  const rack = new VoiceRack(ctx);
  const dry = ctx.createGain(); dry.connect(ctx.destination);
  const play = (hz, at, dur, articulation) => rack.play('lead', id, hz, {
    time: at, dur, gain: 0.5, dry, wet: null, echo: false, articulation });
  const record = () => {
    const pooled = [...rack.pools.values()].map((p) => ({ slots: p.slots.length }));
    return { links: rack._links ? rack._links.size : 0, pooled };
  };
  const facts = {};
  script({ rack, play, ctx, facts, record });
  const rendered = await ctx.startRendering();
  return { samples: Array.from(rendered.getChannelData(0)), facts };
};
`;

const call = (script) => `(${script.toString()})`;

// ---- the worklet core, browserless ---------------------------------------------------------
{
  const tables = mrdr3Tables();
  const noise = mrdr3NoiseSet(RATE, mrdr3Colours(VOICES));
  const patchOf = (extra = {}) => compileMrdr3({
    id: 'apAw', synth: 'MRDR-3', ...extra,
    layer: { osc1: { type: 'sine', ratio: 1, gain: 0.8, ...ENV } },
  }).patch;
  const on = (at, hzValue, id, secs, auto) => ({
    type: 'noteOn', frame: mrdrFrame(at, RATE), eventId: id, hz: [hzValue],
    durFrames: mrdrFrame(secs, RATE), velocity: 1, ...(auto ? { auto } : {}),
  });
  const render = (patch, events) => renderMrdr3({
    events: [...events].sort((a, b) => a.frame - b.frame), seconds: 1.4,
    sampleRate: RATE, channels: 2, patch, tables, noise,
  }).channels[0];
  const SLIDE = 0.1;
  const slide = (from = 'a') => ({ kind: 'slide', id: 'b', from, glide: SLIDE, link: false });
  const SOURCE = { kind: 'attack', id: 'a', from: null, glide: 0, link: true };

  // A source stretched through the destination, and a destination that names it.
  const pair = (patch, destination = slide()) => render(patch, [
    on(0.1, C4, 1, 0.254, SOURCE), on(0.25, D4, 2, 0.5, destination)]);
  for (const [name, patch] of [['poly', patchOf()],
    ['mono + glide', patchOf({ mode: 'mono', portamento: 0.12 })],
    ['legato + glide', patchOf({ mode: 'legato', portamento: 0.12 })]]) {
    const slid = pair(patch);
    const early = pitchAt(slid, 0.25 + 0.03);
    const late = pitchAt(slid, 0.25 + 0.2);
    assert(early > C4 * 1.003 && early < D4 * 0.997 && Math.abs(cents(late, D4)) < 12,
      `AW ${name}: a slide leaves the source and arrives on the target (${early.toFixed(0)} → ${late.toFixed(0)} Hz)`);
    const stale = pair(patch, slide('nobody'));
    const attack = render(patch, [on(0.1, C4, 1, 0.254, SOURCE),
      on(0.25, D4, 2, 0.5, { kind: 'attack', id: null, from: null, glide: 0, link: false })]);
    assert(same(stale, attack),
      `AW ${name}: a slide naming a note that is not there is struck cleanly — the very samples an unchosen note makes`);
    const reached = component(attack, D4, 0.25 + 0.02, 0.25 + 0.06);
    const sliding = component(slid, D4, 0.25 + 0.02, 0.25 + 0.06);
    assert(reached > 1.5 * sliding && reached > 0.05,
      `AW ${name}: an unchosen note is struck on its own pitch, whatever the patch's glide says (${sliding.toFixed(3)} sliding, ${reached.toFixed(3)} struck)`);
    // The destination keeps its own written end: a short note ends where it was drawn to.
    const shortPair = render(patch, [on(0.1, C4, 1, 0.154, SOURCE),
      on(0.25, D4, 2, 0.2, slide())]);
    assert(rms(shortPair, 0.25 + 0.2 + 0.25, 0.25 + 0.2 + 0.4) < 0.003,
      `AW ${name}: the destination ends where it was drawn to, with its own release`);
  }
  // With no 'auto' the lane is the lane it always was: a mono patch still glides on overlap.
  const mono = patchOf({ mode: 'mono', portamento: 0.12 });
  const blanket = render(mono, [on(0.1, C4, 1, 0.3), on(0.25, D4, 2, 0.5)]);
  assert(pitchAt(blanket, 0.25 + 0.03) < D4 * 0.99, 'AW: an event with no treatment still takes its patch glide');
  // The chord in the middle of a line is played, whole, on a poly patch.
  const chord = render(patchOf(), [on(0.1, C4, 1, 0.254, SOURCE),
    { type: 'noteOn', frame: mrdrFrame(0.25, RATE), eventId: 3, hz: [E4, G4],
      durFrames: mrdrFrame(0.3, RATE), velocity: 1 }]);
  assert(rms(chord, 0.3, 0.5) > 0.05, 'AW: a chord after a source is played, not dropped');

  // An edit that voids a stretched gate lets the note go at its written end: the rack sends the
  // lane a note-off for the source, and the core draws its release from there.
  {
    const patch = patchOf();
    const off = (at, id) => ({ type: 'noteOff', frame: mrdrFrame(at, RATE), eventId: id });
    const stretched = render(patch, [on(0.1, C4, 1, 0.254, SOURCE)]);
    const cancelled = render(patch, [on(0.1, C4, 1, 0.254, SOURCE), off(0.25, 1)]);
    const probe = (ch) => rms(ch, 0.322, 0.345);
    assert(probe(stretched) > 0.05 && probe(cancelled) < 0.4 * probe(stretched),
      `AW: a source let go at its written end ends there, not at its stretched one (${probe(stretched).toFixed(3)} → ${probe(cancelled).toFixed(3)})`);
  }

  // The controller puts the treatment on the wire and nothing else on it.
  const sent = [];
  const fakeLane = { ctx: { sampleRate: RATE }, node: { port: { postMessage: (m) => sent.push(m) } } };
  mrdr3NoteOn(fakeLane, { at: 0.5, hz: C4, durSeconds: 0.2, eventId: 7, auto: slide() });
  mrdr3NoteOn(fakeLane, { at: 0.6, hz: D4, durSeconds: 0.2, eventId: 8 });
  assert(sent[0].auto?.kind === 'slide' && sent[0].auto.from === 'a' && sent[0].auto.glide === SLIDE,
    'AW controller: the treatment travels with the event');
  assert(!('auto' in sent[1]), 'and an event without one carries nothing extra');
}

// ---- a Lab take with GO WILD, read the way the engine reads it ------------------------------------
installDom();
const { makeBanger, defaultMoodFor, hookSoundFor } = await import('../src/game/banger/make.js');
const { DEFAULT_SIMPLE } = await import('../src/game/banger/riff.js');
/** The Lab's own song for a style: GO WILD, opted in, the default grid. */
const labTake = (style, expression = 1) => makeBanger({
  notes: DEFAULT_SIMPLE, mode: 'simple', style, mood: defaultMoodFor(style), seed: 3, wild: true, expression,
});
/** Just the hook lane of a take: its notes, its sound, its Note FX — nothing else of the song. */
const hookOnly = (song) => {
  const lane = song.laneOf?.hook || 'lead';
  return {
    bank: {
      bpm: song.bank.bpm, order: song.bank.order,
      sections: song.bank.sections.map((section) => ({
        lead: section[lane] || new Array(32).fill(null), leadLen: section[`${lane}Len`] || new Array(32).fill(null),
      })),
    },
    mix: { voice: { leadVoice: song.mix.voice[`${lane}Voice`] },
      lanes: { lead: { gain: 0, ...(song.mix.lanes[lane]?.noteFx ? { noteFx: song.mix.lanes[lane].noteFx } : {}) } } },
  };
};

// ---- everything else, through the real engine in Chromium ------------------------------------
let chromium; let esbuild;
try { ({ chromium } = require('playwright')); esbuild = require('esbuild'); } catch {
  console.log('note: playwright or esbuild not installed, the engine half is skipped');
}
if (chromium) {
  const built = await esbuild.build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent' });
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
  try {
    const errors = [];
    const html = '<!doctype html><meta charset="utf-8">'
      + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
    // Served from an https ORIGIN, as the renderer serves it: on `about:blank` a page is not a
    // secure context and Chromium does not put an `audioWorklet` on the context at all.
    const open = async () => {
      const page = await browser.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
      await page.goto('https://mashenstein.render/', { waitUntil: 'load' });
      return page;
    };
    // A FRESH PAGE PER SONG RENDER, as tools/lib/render-bank-browser.js does it: the engine is
    // a singleton and a second `renderBankPage` in the same page comes back silent. Without
    // that, every "these two renders are the same" below would be two silences.
    const render = async (bank, mix, steps = 32, loop, startStep = null) => {
      const page = await open();
      try {
        return await page.evaluate((a) => window.__render(a), { bank, mix, steps, loop, startStep });
      } finally { await page.close(); }
    };
    // The rack on its own owns its context, so one page serves them all.
    const rackPage = await open();
    const rack = (preset, script) => rackPage.evaluate(
      ({ preset: p, source }) => window.__rack({ preset: p, script: eval(source) }),
      { preset, source: call(script) });

    // ---- off is off ---------------------------------------------------------------------
    for (const [name, preset] of Object.entries(PRESETS)) {
      const base = (await render(PAIR, mixOf(preset, null))).samples;
      const off = (await render(PAIR, mixOf(preset, portamento({ enabled: false })))).samples;
      const zero = (await render(PAIR, mixOf(preset, portamento({ amount: 0 })))).samples;
      assert(same(base, off) && same(base, zero),
        `${name}: a lane with the switch off, or Amount at 0, renders the samples it always did`);
    }
    {
      const piano = { ...VOICES.mrdrElectricGrand };
      delete piano.id;
      const none = (await render(PAIR, { voiceParams: { leadVoice: piano }, lanes: { lead: {} } })).samples;
      const asked = (await render(PAIR, { voiceParams: { leadVoice: piano },
        lanes: { lead: { noteFx: { portamento: portamento() } } } })).samples;
      // This preset is a filtered piano whose own renders differ from one another by a bit or
      // two (1.5e-8, with or without the setting), so the claim is "the same to float noise".
      assert(farthest(none, asked) < 1e-6 && asked.some((x) => Math.abs(x) > 0.001),
        'a sound that cannot take a slide renders the samples it always did, though the lane asked');
      const future = (await render(PAIR, mixOf(MRDR, { enabled: true, amount: 90, version: 2 }))).samples;
      assert(same(future, (await render(PAIR, mixOf(MRDR, null))).samples),
        'settings from a version this build does not know are not read as version 1');
    }

    // ---- a chosen connection slides; an unchosen one is struck ---------------------------
    const onset = 2 * STEP;
    for (const [name, preset] of Object.entries(PRESETS)) {
      const slid = await render(PAIR, mixOf(preset));
      const early = pitchAt(slid.samples, onset + 0.03);
      const mid = pitchAt(slid.samples, onset + 0.06);
      const late = pitchAt(slid.samples, onset + 0.25);
      assert(early > C4 * 1.002 && early < mid && mid < D4 * 0.998 && Math.abs(cents(late, D4)) < 12,
        `${name}: a chosen slide leaves C and arrives on D inside the note and settles (`
        + `${early.toFixed(0)} → ${mid.toFixed(0)} → ${late.toFixed(0)} Hz)`);
      const first = slid.calls[0]; const second = slid.calls[1];
      assert(first.articulation?.link === true && second.articulation?.kind === 'slide'
        && second.articulation.from === first.articulation.id,
      `${name}: the scheduler names the source in the destination, and the source knows it is one`);
      assert(first.dur > 2 * STEP + 0.0015 && first.dur < 2 * STEP + 0.0035
        && Math.abs(second.dur - 8 * STEP) < 1e-6,
      `${name}: the source gate reaches the destination plus 2 ms, and the destination keeps its own end`
        + ` (${(first.dur * 1000).toFixed(1)} ms, ${(second.dur * 1000).toFixed(1)} ms)`);
      const length = slid.samples;
      assert(rms(length, onset + 8 * STEP + 0.3, onset + 8 * STEP + 0.6) < 0.002,
        `${name}: nothing is left ringing after the last note`);

      // Not chosen: Amount can pick nothing here, and the note arrives on its own pitch —
      // even where the preset's own glide would have slid it across the overlap.
      const bare = bankOf(lane([[0, C4, 2.4], [2, D4, 8]]));
      const picked = await render(bare, mixOf(preset, portamento({ amount: 100 })));
      const blanket = await render(bare, mixOf(preset, null));
      // A leap of more than an octave cannot be chosen — and is exactly what a preset's own
      // glide would have slid across, since the first note still holds its gate.
      const D5 = hz(74);
      const refused = await render(bankOf(lane([[0, C4, 2.4], [2, D5, 8]])), mixOf(preset));
      if (preset.mode && preset.portamento) {
        const wide = await render(bankOf(lane([[0, C4, 2.4], [2, D5, 8]])), mixOf(preset, null));
        assert(pitchAt(wide.samples, onset + 0.03) < D5 * 0.9,
          `${name}: with no Auto Portamento the preset's own glide slides an overlapping note`);
      }
      assert(picked.calls[1].articulation.kind === 'slide', `${name}: Amount 100 chooses the pickup`);
      const struck = component(refused.samples, D5, onset + 0.02, onset + 0.06);
      const steady = component(refused.samples, D5, onset + 0.3, onset + 0.4);
      assert(refused.calls[1].articulation.kind === 'attack' && steady > 0.05 && struck > 0.6 * steady,
        `${name}: an unchosen note is struck on its own pitch, not slid in by the preset's glide `
        + `(${struck.toFixed(3)} of ${steady.toFixed(3)} at once)`);
    }

    // ---- slide, clean attack, slide: in sequence, nothing stuck -----------------------------
    for (const [name, preset] of Object.entries(PRESETS)) {
      const out = await render(SEQUENCE, mixOf(preset), 32);
      const kinds = out.calls.map((c) => c.articulation?.kind);
      assert(kinds.join() === 'attack,slide,attack,attack,attack,slide',
        `${name}: the scheduler reads slide / clean attack / slide (${kinds.join(' ')})`);
      const at = (step) => step * STEP;
      assert(pitchAt(out.samples, at(2) + 0.03) < D4 * 0.995 && pitchAt(out.samples, at(22) + 0.03) < G4 * 0.995,
        `${name}: the first and the third connection slide`);
      assert(Math.abs(cents(pitchAt(out.samples, at(12) + 0.03), E4)) < 25,
        `${name}: the one between them is struck on its own pitch`);
      assert(rms(out.samples, at(26) + 0.45, at(26) + 0.9) < 0.002,
        `${name}: nothing is left ringing after the last note`);
    }

    // ---- a chord is a barrier, and is played ---------------------------------------------------
    for (const name of ['CRLS-1 poly', 'MRDR-3 poly']) {
      const dyadBank = bankOf(lane([[0, C4, 2], [2, D4, 4], [8, [E4, G4], 4], [14, F4, 2], [16, G4, 4]]));
      const out = await render(dyadBank, mixOf(PRESETS[name]), 48);
      const kinds = out.calls.map((c) => c.articulation?.kind ?? 'none');
      assert(kinds[2] === 'none' && out.calls[2].articulation === null,
        `${name}: the chord is played as it always was — no articulation, no dropped tones`);
      const lone = component(out.samples, C4, 0.02, 0.2);
      assert(out.calls[2].freq.length === 2
        && component(out.samples, E4, 8 * STEP + 0.05, 8 * STEP + 0.3) > 0.4 * lone
        && component(out.samples, G4, 8 * STEP + 0.05, 8 * STEP + 0.3) > 0.4 * lone,
      `${name}: both tones of the chord sound (${component(out.samples, E4, 1.05, 1.3).toFixed(3)} and `
        + `${component(out.samples, G4, 1.05, 1.3).toFixed(3)} against ${lone.toFixed(3)})`);
      assert(out.calls[1].articulation.link === false && Math.abs(out.calls[1].dur - 4 * STEP) < 1e-6,
        `${name}: the note before the chord is not stretched toward it`);
      assert(out.calls[3].articulation.kind !== 'slide',
        `${name}: the note after the chord is struck, not slid`);
    }

    // ---- the Lab: GO WILD on a style whose hook can slide, through the engine --------------------------
    {
      const withIt = hookOnly(labTake('eurobeat'));
      const without = hookOnly(labTake('eurobeat', 0));
      assert(JSON.stringify(withIt.bank) === JSON.stringify(without.bank),
        'the Lab take with the setting has the very notes the one without it has');
      assert(withIt.mix.lanes.lead.noteFx?.portamento?.enabled === true && !without.mix.lanes.lead.noteFx,
        'GO WILD put an ordinary lane setting on the hook, and the legacy recipe has none');
      const steps = 16 * 12;
      const on = await render(withIt.bank, withIt.mix, steps);
      const off = await render(without.bank, without.mix, steps);
      const sliding = on.calls.filter((c) => c.articulation?.kind === 'slide');
      assert(sliding.length >= 4 && off.calls.every((c) => c.articulation === null),
        `through the real engine the take slides (${sliding.length} slides in 12 bars; none without the setting)`);
      assert(on.calls.length === off.calls.length
        && on.calls.every((c, i) => Math.abs(c.time - off.calls[i].time) < 1e-9 && Math.abs(c.freq - off.calls[i].freq) < 1e-9),
      'and not one note moves: the same pitches at the same times, with or without the slides');
      assert(on.calls.every((c, i) => c.articulation?.link || Math.abs(c.dur - off.calls[i].dur) < 1e-9),
        'and every gate is the one that was written, except the source of a slide, which is stretched');
      // The first slide, heard: at the destination's onset the take with the setting has not yet
      // arrived on its pitch, and the one without it has.
      const first = sliding[0];
      const arrival = (run) => component(run.samples, first.freq, first.time + 0.012, first.time + 0.04)
        / Math.max(1e-9, component(run.samples, first.freq, first.time + 0.5 * first.dur, first.time + 0.9 * first.dur));
      assert(arrival(on) < 0.8 * arrival(off),
        `and the first slide is audible: ${arrival(on).toFixed(2)} of its pitch on arrival, against ${arrival(off).toFixed(2)} without it`);
    }

    // ---- a render that starts between the two notes begins with a clean attack --------------------
    {
      // A ranged render (Freeze on a selection, a cropped bounce) has no note before its first
      // one to slide from, and says so honestly: the destination still names its source — the
      // plan is the song's — but the rack has no such note, so it is struck cleanly.
      const ranged = await render(PAIR, mixOf(MRDR), 8, null, 2);
      const first = ranged.calls[0];
      assert(first && Math.abs(first.freq - D4) < 1e-6 && first.articulation.kind === 'slide',
        'a render that begins on the destination still names its source');
      const struck = component(ranged.samples, D4, 0.02, 0.06);
      const steady = component(ranged.samples, D4, 0.2, 0.4);
      assert(steady > 0.05 && struck > 0.6 * steady,
        `and, with no source, begins with a clean attack (${struck.toFixed(3)} of ${steady.toFixed(3)} at once)`);
    }

    // ---- a different instrument is a barrier ------------------------------------------------------
    {
      // The last note of one section touches the first of the next. On one instrument that is a
      // pickup into a held note and slides; on two it is two instruments, and nothing may.
      const across = (voiceB) => ({
        bpm: BPM, order: [0, 1],
        sections: [{ ...lane([[30, C4, 2]]), leadVoice: 'syncRazorLead' },
          { ...lane([[0, D4, 8]]), leadVoice: voiceB }],
      });
      const asked = { lanes: { lead: { noteFx: { portamento: portamento() } } } };
      const together = await render(across('syncRazorLead'), asked, 64);
      assert(together.untouched,
        'rendering with slides writes to nothing it was handed: not the lane arrays, nor the lengths, nor the shared presets');
      assert(together.calls[0].articulation.link === true && together.calls[1].articulation.kind === 'slide',
        'across a section boundary on ONE instrument the pickup slides into the held note');
      for (const next of ['simpleSawtooth', 'mrdrElectricGrand']) {
        const apart = await render(across(next), asked, 64);
        assert(apart.calls[0].articulation.link === false
          && Math.abs(apart.calls[0].dur - 2 * STEP) < 1e-6
          && (apart.calls[1].articulation === null || apart.calls[1].articulation.kind === 'attack'),
        `a change to ${next} between the two notes is a barrier: no stretch, no slide`);
        assert(rms(apart.samples, 32 * STEP + 8 * STEP + 0.4, 32 * STEP + 8 * STEP + 0.9) < 0.002,
          `and nothing is left ringing after the instrument change (${next})`);
      }
    }

    // ---- the hand-over keeps what it should --------------------------------------------------------
    {
      const vibrato = { ...MRDR, vibrato: { depth: 0.4, rate: 6, delay: 0.001 } };
      const longPair = bankOf(lane([[0, C4, 8], [8, D4, 16]]));
      const off = (await render(longPair, mixOf(vibrato, null), 32)).samples;
      const on = await render(longPair, mixOf(vibrato, portamento({ glide: 60 })), 32);
      assert(on.calls[1].articulation.kind === 'slide', 'the vibrato fixture slides');
      const t = 8 * STEP;
      const beforeOff = spread(off, t - 0.55, t - 0.05); const afterOff = spread(off, t + 0.25, t + 0.75);
      const beforeOn = spread(on.samples, t - 0.55, t - 0.05); const afterOn = spread(on.samples, t + 0.25, t + 0.75);
      assert(beforeOn > 20 && afterOn > 0.6 * beforeOn && afterOn > 0.6 * afterOff,
        `vibrato survives the hand-over (${beforeOn.toFixed(0)} → ${afterOn.toFixed(0)} cents peak to peak; `
        + `a plain strike measures ${afterOff.toFixed(0)})`);
      const level = (ch, a, b) => rms(ch, a, b);
      assert(level(on.samples, t + 0.3, t + 0.7) > 0.5 * level(on.samples, t - 0.4, t - 0.05),
        'the destination holds the sustain it inherited rather than dying or re-attacking');
      assert(rms(on.samples, t + 16 * STEP + 0.35, t + 16 * STEP + 0.7) < 0.002,
        'and releases as itself once it ends');
    }

    // ---- loops, seeks and edits ----------------------------------------------------------------------
    {
      // A loop that ends between a source and its destination: the end is not joined to what
      // follows, so the note before the wrap keeps the length it was drawn with.
      const wrap = bankOf(lane([[12, C4, 2], [14, D4, 2], [16, E4, 8]]));
      const open = await render(wrap, mixOf(PRESETS['MRDR-3 poly']), 24);
      const planned = open.calls.find((c) => Math.abs(c.freq - D4) < 1e-6);
      assert(planned.articulation.link === true,
        'without a loop the note before the held landing is stretched to reach it');
      const looped = await render(wrap, mixOf(PRESETS['MRDR-3 poly']), 24,
        { start: 12, loop: { start: 12, end: 16 } });
      const edge = looped.calls.find((c) => Math.abs(c.freq - D4) < 1e-6);
      assert(edge && edge.articulation && edge.articulation.link === false
        && Math.abs(edge.dur - 2 * STEP) < 1e-6,
      'a note at the end of a loop is not stretched to reach a note on the other side of it');
      const afterWrap = looped.calls.filter((c) => Math.abs(c.freq - C4) < 1e-6);
      assert(afterWrap.length >= 2 && afterWrap.every((c) => c.articulation.kind === 'attack'),
        'and the first note of the next pass is struck, never slid into');
    }
    {
      const book = await rack(MRDR, ({ play }) => {
        const source = { kind: 'attack', id: 'a', from: null, glide: 0, link: true, release: 0.3 };
        play(262, 0.1, 0.254, source);
        play(294, 0.25, 0.4, { kind: 'slide', id: 'b', from: 'ghost', glide: 0.1, link: false });
      });
      const struck = component(book.samples, 294, 0.25 + 0.02, 0.25 + 0.06);
      const steady = component(book.samples, 294, 0.25 + 0.15, 0.25 + 0.3);
      assert(steady > 0.05 && struck > 0.6 * steady,
        `a slide that names a note the rack never saw is struck cleanly (${struck.toFixed(3)} of ${steady.toFixed(3)} at once)`);
    }
    for (const [name, preset] of Object.entries({ 'CRLS-1 poly': TONE, 'MRDR-3 poly': MRDR })) {
      const kept = (await rack(preset, ({ play }) => {
        play(262, 0.1, 0.254, { kind: 'attack', id: 'a', from: null, glide: 0, link: true, release: 0.3 });
        play(294, 0.25, 0.5, { kind: 'slide', id: 'b', from: 'a', glide: 0.1, link: false });
      })).samples;
      const cleared = (await rack(preset, ({ rack: r, play }) => {
        play(262, 0.1, 0.254, { kind: 'attack', id: 'a', from: null, glide: 0, link: true, release: 0.3 });
        r.clearPortamento();
        play(294, 0.25, 0.5, { kind: 'slide', id: 'b', from: 'a', glide: 0.1, link: false });
      })).samples;
      const arrival = (ch) => component(ch, 294, 0.25 + 0.02, 0.25 + 0.06)
        / Math.max(1e-9, component(ch, 294, 0.25 + 0.2, 0.25 + 0.35));
      assert(arrival(kept) < 0.5,
        `${name}: the same two notes slide when the book is open (${arrival(kept).toFixed(2)} of its pitch at once)`);
      assert(arrival(cleared) > 0.6,
        `${name}: a seek, a loop or a stop closes the book, and the next note is struck (${arrival(cleared).toFixed(2)})`);
    }
    for (const [name, preset] of Object.entries({ 'CRLS-1 poly': TONE, 'MRDR-3 poly': MRDR })) {
      // The source is stretched to 0.254 s for a slide; an edit cancels it before the
      // destination is scheduled, and the note goes back to the 0.15 s it was written with.
      const stretched = (await rack(preset, ({ play }) => {
        play(262, 0.1, 0.254, { kind: 'attack', id: 'a', from: null, glide: 0, link: true, release: 0.25 });
      })).samples;
      const cancelled = (await rack(preset, ({ rack: r, play }) => {
        play(262, 0.1, 0.254, { kind: 'attack', id: 'a', from: null, glide: 0, link: true, release: 0.25 });
        r.cancelPortamento();
      })).samples;
      const plain = (await rack(preset, ({ play }) => { play(262, 0.1, 0.15, null); })).samples;
      // Just after the written end, the stretched note is still at its sustain and the
      // cancelled one is deep in its release — the same place the note written at 0.15 s is.
      const probe = (ch) => rms(ch, 0.322, 0.345);
      assert(probe(stretched) > 0.05 && probe(cancelled) < 0.4 * probe(stretched)
        && probe(cancelled) < 1.5 * probe(plain) + 0.002,
      `${name}: an edit that voids a slide takes the stretched gate back to the written end `
        + `(${probe(stretched).toFixed(3)} → ${probe(cancelled).toFixed(3)}; written ${probe(plain).toFixed(3)})`);
    }

    // ---- the scheduler's notes are the lane view's notes ---------------------------------------------
    {
      const parity = {
        bpm: BPM, resolution: 16,
        sections: [lane([[0, C4, 2], [2, D4, 2], [4, E4, 2], [6, F4, 6]]),
          lane([[0, G4, null], [1, hz(69), null], [2, hz(71), null], [8, [C4, E4], 4]])],
        order: [0, { s: 0, bars: 2, transpose: 3 }, 1, { s: 0, bars: 1, off: ['lead'] }, 0],
      };
      const out = await render(parity, mixOf(PRESETS['MRDR-3 poly'], portamento({ amount: 100 })), 16 * 9);
      const expected = out.events.filter((e) => !e.barrier);
      const played = out.calls.filter((c) => !Array.isArray(c.freq));
      assert(expected.length > 6 && expected.length === played.length,
        `the scheduler plays exactly the notes the lane view reads (${played.length})`);
      let agree = true;
      expected.forEach((e, i) => {
        const c = played[i];
        if (!c || Math.abs(c.freq / e.hz - 1) > 1e-6 || Math.abs(c.time - e.step * STEP) > 1e-6) agree = false;
        // The gate is the drawn one, unless this note is the source of a slide.
        const stretched = c?.articulation?.link && c.articulation.release != null;
        if (c && !stretched && Math.abs(c.dur - e.len * STEP) > 1e-6) agree = false;
        if (c && stretched && !(c.dur > e.len * STEP)) agree = false;
      });
      assert(agree, 'in pitch, in time, and in gate — a note only ever differs by a stretched source');
    }

    // ---- a worklet lane that is not built yet: the notes wait, and keep their treatment ---------
    {
      const aw = await rackPage.evaluate(() => window.__awQueue());
      assert(aw.queuedAtFirst === 2, 'the first notes on a lane with no node yet are held, not dropped');
      assert(aw.attempts.length >= 4 && aw.attempts[2]?.kind === 'attack' && aw.attempts[3]?.kind === 'slide'
        && aw.attempts[3].from === 'a', 'and are played again, in order, with the same articulation');
      assert(aw.posted.length >= 2 && aw.posted[0].auto?.link === true
        && aw.posted[1].auto?.kind === 'slide' && aw.posted[1].auto.from === 'a'
        && aw.posted[1].auto.glide > 0 && aw.posted[1].frame > aw.posted[0].frame,
      'and what reaches the worklet carries it: the source says it is one, the destination names it');
    }

    assert(errors.length === 0, `no page errors (${errors.join(' | ')})`);
  } finally {
    await browser.close();
  }
}

console.log(failed ? `\nAUTO PORTAMENTO RENDER: ${failed} FAILED` : '\nAUTO PORTAMENTO RENDER: PASSED');
process.exit(failed ? 1 : 0);
