/*
 * TNGR-2's controller: lifecycle, routing, exports — docs/TNGR-2-completion-spec.md §5, §10, §12.2.
 *
 * The seams that decide whether this synth can be part of a song rather than a demo:
 *
 *   - ONE persistent node per {context, lane}, not one per note
 *   - a patch change reaches a lane without cutting the notes it is playing
 *   - a stem equals its contribution to the mix
 *   - a range render beginning after bar zero matches that range inside a full render,
 *     INCLUDING where a free-running LFO and a seeded phase had got to
 *   - teardown: lane release, context release, panic, and a context replaced by another
 *
 * The range-render claim is the one that catches a whole class of mistake. Every offline
 * context counts from frame zero, so rendering bar four means telling the core the render
 * starts elsewhere on the transport. Get that wrong and a range render sounds plausible
 * on its own and different from the full render it is supposed to be a slice of.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import {
  tngr2Lane, tngr2LaneNow, tngr2NoteOn, tngr2NoteOff, tngr2Param, tngr2Panic,
  releaseTngr2Lane, releaseTngr2Context, tngr2ControllerHealth, renderTngr2Lane,
  prepareTngr2Patch, familiesOf, frameAt, tngr2RangePlan,
} from ${JSON.stringify(join(ROOT, 'src/engine/tngr2/controller.js'))};

const chans = (buffer) => Array.from({ length: buffer.numberOfChannels },
  (_, c) => Array.from(buffer.getChannelData(c)));

/** One offline render through the controller's export path. */
window.__render = async ({ stored, events, seconds, sampleRate, frameOffset = 0, spb = 0.5 }) => {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  await renderTngr2Lane(ctx, { stored, events, spb, frameOffset });
  const rendered = await ctx.startRendering();
  return chans(rendered);
};

/** Two lanes into one context, summed — a mix. */
window.__renderMix = async ({ lanes, seconds, sampleRate, spb = 0.5 }) => {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  for (const lane of lanes) {
    await renderTngr2Lane(ctx, { stored: lane.stored, events: lane.events, spb });
  }
  const rendered = await ctx.startRendering();
  return chans(rendered);
};

/** Lane lifecycle on a live context. */
window.__lifecycle = async ({ stored }) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = {};
  try {
    await ctx.resume();
    const first = await tngr2Lane(ctx, 'bass', { stored });
    const again = await tngr2Lane(ctx, 'bass', { stored });
    out.sameNode = first.node === again.node;
    out.oneLane = tngr2ControllerHealth(ctx).lanes === 1;
    const lead = await tngr2Lane(ctx, 'lead', { stored });
    out.twoLanes = tngr2ControllerHealth(ctx).lanes === 2;
    out.differentNodes = lead.node !== first.node;
    out.tableBytes = tngr2ControllerHealth(ctx).tableBytes;

    // A patch change must reach the lane without replacing its node.
    const changed = await tngr2Lane(ctx, 'bass', {
      stored: { ...stored, oscA: { ...stored.oscA, position: 0.9 } },
    });
    out.patchKeptNode = changed.node === first.node;
    out.patchApplied = changed.patch.oscA.position === 0.9;

    // Switching one lane to another family set must not evict the first set and force a
    // repack/re-clone when another lane (or a later preset) asks for it again.
    await tngr2Lane(ctx, 'bass', {
      stored: { ...stored, oscA: { ...stored.oscA, table: 'basic' }, oscB: { ...stored.oscB, on: false } },
    });
    out.tableSetsAfterAlternate = tngr2ControllerHealth(ctx).tableSets;
    const restored = await tngr2Lane(ctx, 'bass', { stored });
    out.tableCacheReused = restored.tables === lead.tables;

    // Live scheduling: these go over the port, which is correct for a running context.
    first.node.connect(ctx.destination);
    tngr2NoteOn(first, { at: ctx.currentTime + 0.02, hz: 110, velocity: 1, eventId: 1 });
    tngr2Param(first, { at: ctx.currentTime + 0.02, path: 'modWheel', value: 0.5 });
    tngr2NoteOff(first, { at: ctx.currentTime + 0.2, eventId: 1 });
    tngr2Panic(first, { at: ctx.currentTime + 0.25, transportGeneration: 2 });
    out.generation = first.generation;

    out.releasedOne = releaseTngr2Lane(ctx, 'bass');
    out.afterRelease = tngr2ControllerHealth(ctx).lanes;
    out.laneGone = tngr2LaneNow(ctx, 'bass') === null;
    out.releasedAll = releaseTngr2Context(ctx);
    out.afterContext = tngr2ControllerHealth(ctx).lanes;
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await ctx.close();
  }

  // A REPLACED context: the old one is closed, and a new one must register cleanly rather
  // than inheriting anything from it.
  const next = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const lane = await tngr2Lane(next, 'bass', { stored });
    out.replacedContextWorks = !!lane && !!lane.node;
    out.replacedContextIsolated = tngr2ControllerHealth(next).lanes === 1;
  } catch (err) {
    out.replaceError = String(err && err.message ? err.message : err);
  } finally {
    await next.close();
  }
  return out;
};

/**
 * A RANGE render, done the way an export has to do it: start early enough to catch notes
 * that are still sounding, tell the core where that is on the transport, and trim.
 */
window.__renderRange = async ({ stored, events, fromSeconds, seconds, sampleRate, spb = 0.5 }) => {
  const { patch } = prepareTngr2Patch(stored, { spb });
  const fromFrame = frameAt(fromSeconds, sampleRate);
  const plan = tngr2RangePlan(patch, events, fromFrame, sampleRate);
  const wanted = Math.ceil(seconds * sampleRate);
  const total = plan.trimFrames + wanted;
  const ctx = new OfflineAudioContext(2, total, sampleRate);
  await renderTngr2Lane(ctx, { stored, events, spb, frameOffset: plan.startFrame });
  const rendered = await ctx.startRendering();
  return {
    channels: chans(rendered).map((ch) => ch.slice(plan.trimFrames)),
    plan,
  };
};

/**
 * A LANE FOLLOWS ITS PRESET: edits and preset changes are heard on the next note.
 *
 * The native path read the preset afresh on every note-on, so an edit sounded
 * immediately. A worklet lane holds a compiled patch instead, and without re-installing
 * it the lane goes on playing whatever it was built with — a knob moves, the panel and
 * the stored preset both change, and nothing can be heard. Same for putting a different
 * preset on the lane entirely.
 */
window.__rackFollows = async ({ first, second }) => {
  const { VoiceRack } = await import(${JSON.stringify(join(ROOT, 'src/engine/voices.js'))});
  const { VOICES } = await import(${JSON.stringify(join(ROOT, 'src/data/voices.js'))});
  const { tngr2LaneNow } = await import(${JSON.stringify(join(ROOT, 'src/engine/tngr2/controller.js'))});
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = {};
  try {
    await ctx.resume();
    const dry = ctx.createGain();
    dry.gain.value = 0;
    dry.connect(ctx.destination);
    const rack = new VoiceRack(ctx);
    await rack.warmTngr2Lane(VOICES[first], 'bass');
    const lane = tngr2LaneNow(ctx, 'bass');
    const cutoffOf = () => lane.patch.filter.cutoff;
    out.built = cutoffOf();

    // 1. An EDIT to the preset on the lane, the way the editor makes one: in place.
    const edited = VOICES[first];
    const was = edited.tngr2.filter.cutoff;
    edited.tngr2.filter.cutoff = was === 1234 ? 4321 : 1234;
    rack.play('bass', first, 110, {
      time: ctx.currentTime + 0.02, dur: 0.2, gain: 0.8, dry, wet: null, echo: false,
    });
    out.afterEdit = cutoffOf();
    edited.tngr2.filter.cutoff = was;

    // 2. A different PRESET on the same lane.
    rack.play('bass', second, 110, {
      time: ctx.currentTime + 0.05, dur: 0.2, gain: 0.8, dry, wet: null, echo: false,
    });
    out.afterSwitch = cutoffOf();
    out.expected = VOICES[second].tngr2.filter.cutoff;
    out.lanes = rack.runtimeHealth().tngr2.lanes;
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await ctx.close();
  }
  return out;
};

/**
 * SWEEPING THE KEYBOARD: held preview notes must end when the key comes up.
 *
 * A preview note has no note-off of its own — only lifting the key ends it — so it has
 * to be written into the rack's books for the release path to find. Dragging the mouse
 * across the keyboard presses and releases a run of keys in quick succession, which is
 * exactly the case that leaves notes sounding for ever if that bookkeeping is missing.
 */
window.__rackSweep = async ({ voiceId }) => {
  const { VoiceRack } = await import(${JSON.stringify(join(ROOT, 'src/engine/voices.js'))});
  const { VOICES } = await import(${JSON.stringify(join(ROOT, 'src/data/voices.js'))});
  const { tngr2LaneNow } = await import(${JSON.stringify(join(ROOT, 'src/engine/tngr2/controller.js'))});
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = {};
  try {
    await ctx.resume();
    const dry = ctx.createGain();
    dry.gain.value = 0;
    dry.connect(ctx.destination);
    const rack = new VoiceRack(ctx);
    const voice = VOICES[voiceId];
    await rack.warmTngr2Lane(voice, 'preview');
    const lane = tngr2LaneNow(ctx, 'preview');
    const ask = () => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no report')), 3000);
      lane.node.port.onmessage = (e) => {
        if (e.data && e.data.voices !== undefined) { clearTimeout(timer); resolve(e.data.voices); }
      };
      lane.node.port.postMessage({ type: 'report' });
    });
    // The sweep: six keys pressed and released as the pointer crosses them.
    const keys = [110, 123.47, 130.81, 146.83, 164.81, 174.61];
    for (const hz of keys) {
      rack.play('preview', voiceId, hz, {
        time: ctx.currentTime, dur: 30, gain: 0.8, dry, wet: null, echo: false,
        preview: true, hold: true,
      });
    }
    await new Promise((r) => setTimeout(r, 250));
    out.sounding = await ask();
    for (const hz of keys) rack.releasePreview('preview', hz);
    // Long enough for the note's OWN release to finish — this pad's is 3.2 s, and a
    // releasing voice is still a sounding one. Anything left after that is hung, not
    // fading, which is the difference this test exists to tell.
    await new Promise((r) => setTimeout(r, 4200));
    out.afterRelease = await ask();
    out.booksEmpty = rack.runtimeHealth().heldNative === 0;
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await ctx.close();
  }
  return out;
};

/**
 * THE PATH THE DESK ACTUALLY TAKES: play without warming anything first.
 *
 * Nothing in the engine calls warmTngr2Lane — a lane has to build itself on the first
 * note. This is the case that was silent: every other test here warms the lane by hand,
 * so none of them exercised what live playback really does.
 */
window.__rackCold = async ({ voiceId }) => {
  const { VoiceRack } = await import(${JSON.stringify(join(ROOT, 'src/engine/voices.js'))});
  const { VOICES } = await import(${JSON.stringify(join(ROOT, 'src/data/voices.js'))});
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = {};
  try {
    await ctx.resume();
    const dry = ctx.createGain();
    dry.gain.value = 0;
    dry.connect(ctx.destination);
    const rack = new VoiceRack(ctx);
    // Straight to play(), exactly as the sequencer does. No warm, no await.
    rack.play('bass', voiceId, [110, 164.81], {
      time: ctx.currentTime + 0.05, dur: 0.4, gain: 0.8, dry, wet: null, echo: false,
    });
    // Give the lane the moment it needs to register its module and flush the queue.
    await new Promise((r) => setTimeout(r, 600));
    out.lanes = rack.runtimeHealth().tngr2.lanes;
    const { tngr2LaneNow } = await import(${JSON.stringify(join(ROOT, 'src/engine/tngr2/controller.js'))});
    const lane = tngr2LaneNow(ctx, 'bass');
    out.built = !!lane;
    if (lane) {
      out.voices = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no report')), 3000);
        lane.node.port.onmessage = (e) => {
          if (e.data && e.data.voices !== undefined) { clearTimeout(timer); resolve(e.data.voices); }
        };
        lane.node.port.postMessage({ type: 'report' });
      });
    }
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await ctx.close();
  }
  return out;
};

/**
 * The VoiceRack switch, end to end.
 *
 * Warm a lane, flip the switch, play through the rack's ordinary play() call — the same
 * one the sequencer makes — and ask the processor whether the notes arrived. Anything less
 * than asking the processor would be testing that the rack did not throw.
 */
window.__rackSwitch = async ({ voiceId }) => {
  const { VoiceRack } = await import(${JSON.stringify(join(ROOT, 'src/engine/voices.js'))});
  const { tngr2LaneNow } = await import(${JSON.stringify(join(ROOT, 'src/engine/tngr2/controller.js'))});
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = {};
  try {
    await ctx.resume();
    const dry = ctx.createGain();
    dry.gain.value = 0;
    dry.connect(ctx.destination);
    const rack = new VoiceRack(ctx);
    const { VOICES } = await import(${JSON.stringify(join(ROOT, 'src/data/voices.js'))});
    const voice = VOICES[voiceId];

    out.warmed = await rack.warmTngr2Lane(voice, 'bass');
    out.lanes = rack.runtimeHealth().tngr2.lanes;

    const lane = tngr2LaneNow(ctx, 'bass');
    rack.play('bass', voiceId, [110, 164.81], {
      time: ctx.currentTime + 0.02, dur: 0.4, gain: 0.8, dry, wet: null, echo: false,
    });
    // Ask the processor itself what it received.
    const health = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('the processor never reported')), 4000);
      lane.node.port.onmessage = (e) => {
        if (e.data && e.data.voices !== undefined && e.data.frame > 0) {
          clearTimeout(timer);
          resolve(e.data);
        } else lane.node.port.postMessage({ type: 'report' });
      };
      const poll = setInterval(() => lane.node.port.postMessage({ type: 'report' }), 40);
      setTimeout(() => clearInterval(poll), 3500);
    });
    out.voices = health.voices;
    out.streams = health.streams;
    out.nonFinite = health.nonFinite;

    rack.dispose();
    out.disposedLanes = rack.runtimeHealth().tngr2.lanes;
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await ctx.close();
  }
  return out;
};

/** An OFFLINE rack must refuse the port path — see the guard in _playTngr2Node. */
window.__rackOffline = async ({ voiceId, flush }) => {
  const { VoiceRack } = await import(${JSON.stringify(join(ROOT, 'src/engine/voices.js'))});
  const { VOICES } = await import(${JSON.stringify(join(ROOT, 'src/data/voices.js'))});
  const ctx = new OfflineAudioContext(2, 44100, 44100);
  const dry = ctx.createGain();
  dry.connect(ctx.destination);
  const rack = new VoiceRack(ctx);
  const voice = VOICES[voiceId];
  const warmed = await rack.warmTngr2Lane(voice, 'bass');
  rack.play('bass', voiceId, [110], {
    time: 0.05, dur: 0.4, gain: 0.8, dry, wet: null, echo: false,
  });
  // The flush is what turns the collected schedule into a node — see flushTngr2Offline.
  const built = flush ? await rack.flushTngr2Offline() : 0;
  const rendered = await ctx.startRendering();
  let peak = 0;
  const d = rendered.getChannelData(0);
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  return { warmed, peak, built };
};

window.__families = (stored) => familiesOf(prepareTngr2Patch(stored).patch);
window.__frameAt = (seconds, rate) => frameAt(seconds, rate);
`;

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const peak = (chs) => {
  let max = 0;
  for (const ch of chs) for (const s of ch) max = Math.max(max, Math.abs(s));
  return max;
};
const diff = (a, b) => {
  let max = 0;
  for (let c = 0; c < Math.min(a.length, b.length); c++) {
    for (let i = 0; i < Math.min(a[c].length, b[c].length); i++) {
      max = Math.max(max, Math.abs(a[c][i] - b[c][i]));
    }
  }
  return max;
};
const slice = (chs, from, to) => chs.map((ch) => ch.slice(from, to));

const RATE = 44100;
const TOL = 5e-6;

// A patch in the PROTOTYPE shape on purpose: the controller migrates it, so this also
// proves the migration is on the live path rather than only in the schema test.
const STORED = {
  mode: 'poly',
  oscA: { table: 'vowelGlass', position: 0.3, envAmount: 0.4, lfoAmount: 0.2, lfo2Amount: 0.1,
    level: 0.8, unison: 2, spread: 14, stereo: 0.6 },
  oscB: { table: 'sawForm', position: 0.6, level: 0.4, octave: -1 },
  amp: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 },
  positionEnv: { attack: 0.3, decay: 0.5, sustain: 0.3 },
  filter: { type: 'lowpass', cutoff: 3000, resonance: 3 },
  filterEnv: { octaves: 1.5, attack: 0.05, decay: 0.3, sustain: 0.4 },
  lfo1: { shape: 'triangle', rate: 3.7 },
  lfo2: { shape: 'samplehold', rate: 5.3 },
  master: { gain: 0.7 },
};
const OTHER = { ...STORED, oscA: { ...STORED.oscA, table: 'crystal', position: 0.7 } };

const notesFrom = (start, ids, hzs) => {
  const events = [];
  for (let i = 0; i < hzs.length; i++) {
    const at = start + i * 0.25;
    events.push({ type: 'noteOn', frame: Math.round(at * RATE), eventId: ids[i], hz: hzs[i], velocity: 0.8 });
    events.push({ type: 'noteOff', frame: Math.round((at + 0.2) * RATE), eventId: ids[i] });
  }
  return events;
};

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;

const browser = await chromium.launch({
  headless: true, args: ['--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) => route.fulfill({
    status: 200, contentType: 'text/html', body: html,
  }));
  await page.goto('https://tngr2-controller.test/', { waitUntil: 'load' });

  // ---- lifecycle -------------------------------------------------------------
  const life = await page.evaluate((a) => window.__lifecycle(a), { stored: STORED });
  if (life.error) fail(`lifecycle: ${life.error}`);
  assert(life.sameNode, 'asking for the same lane twice returns the SAME node — one per lane, per §5');
  assert(life.oneLane && life.twoLanes && life.differentNodes,
    'each lane gets its own node, and the controller knows how many it holds');
  assert(life.patchKeptNode, 'a patch change reaches a lane without replacing its node');
  assert(life.patchApplied, 'and the new patch is what the lane now holds');
  assert(life.tableSetsAfterAlternate === 2 && life.tableCacheReused,
    'different lane family sets stay cached and returning to one reuses its packed payload');
  assert(life.generation === 2, 'a panic carries its transport generation');
  assert(life.releasedOne && life.afterRelease === 1 && life.laneGone,
    'releasing one lane leaves the others alone');
  assert(life.releasedAll === 1 && life.afterContext === 0,
    'releasing the context releases what is left');
  assert(!life.replaceError && life.replacedContextWorks && life.replacedContextIsolated,
    'a replacement context registers cleanly and shares nothing with the closed one');
  assert(life.tableBytes > 0 && life.tableBytes < 12 * 1024 * 1024,
    `a lane's tables are accounted for (${(life.tableBytes / 1024 / 1024).toFixed(2)} MiB)`);

  // Only the families a patch needs are packed — a lane never carries the catalogue.
  const families = await page.evaluate((a) => window.__families(a), STORED);
  assert(families.length === 3 && families.includes('vowelGlass') && families.includes('sawForm')
    && families.includes('basic'),
  `a lane packs only the families it uses, plus the fallback (${families.join(', ')})`);

  // ---- a stem equals its contribution to the mix ------------------------------
  const seconds = 1.6;
  const laneA = { stored: STORED, events: notesFrom(0.05, [1, 2, 3], [110, 164.81, 220]) };
  const laneB = { stored: OTHER, events: notesFrom(0.15, [11, 12], [330, 440]) };
  const stemA = await page.evaluate((a) => window.__render(a),
    { stored: laneA.stored, events: laneA.events, seconds, sampleRate: RATE });
  const stemB = await page.evaluate((a) => window.__render(a),
    { stored: laneB.stored, events: laneB.events, seconds, sampleRate: RATE });
  const mix = await page.evaluate((a) => window.__renderMix(a),
    { lanes: [laneA, laneB], seconds, sampleRate: RATE });
  assert(peak(stemA) > 0.05 && peak(stemB) > 0.05, 'both stems are audible');
  const summed = stemA.map((ch, c) => ch.map((s, i) => s + stemB[c][i]));
  assert(diff(summed, mix) < TOL, `stems sum to the mix (${diff(summed, mix).toExponential(2)})`);

  // ---- a range render matches the same range in a full render ------------------
  //
  // The patch's LFOs are free-running, so this only passes if the range render is told
  // where it sits on the transport. Rendering bar-two-onward as though the song started
  // there would put both LFOs at the wrong phase.
  const full = await page.evaluate((a) => window.__render(a),
    { stored: STORED, events: laneA.events, seconds: 2, sampleRate: RATE });
  const startAt = 0.5;
  const offset = Math.round(startAt * RATE);
  const ranged = await page.evaluate((a) => window.__renderRange(a), {
    stored: STORED, events: laneA.events, fromSeconds: startAt, seconds: 2 - startAt,
    sampleRate: RATE,
  });
  const range = ranged.channels;
  const fullTail = slice(full, offset, offset + range[0].length);
  assert(peak(fullTail) > 0.01, 'the range being compared has something in it');
  assert(ranged.plan.trimFrames > 0,
    `the range render pre-rolls to catch a note that is still sounding (${ranged.plan.trimFrames} frames)`);
  assert(diff(fullTail, range) < TOL,
    `a range render beginning after bar zero matches the full render (${diff(fullTail, range).toExponential(2)})`);
  // And the negative: without the offset it should NOT match, or the test above proves
  // nothing about the offset being used.
  const naive = await page.evaluate((a) => window.__render(a), {
    stored: STORED, events: laneA.events, seconds: 2 - startAt, sampleRate: RATE, frameOffset: 0,
  });
  assert(diff(fullTail, naive) > TOL,
    'and a range render that ignored the transport would not have matched');

  // ---- determinism through the whole controller path ---------------------------
  const twice = await page.evaluate((a) => window.__render(a),
    { stored: STORED, events: laneA.events, seconds, sampleRate: RATE });
  assert(diff(stemA, twice) === 0, 'the same lane renders identically twice');

  // ---- both sample rates -------------------------------------------------------
  for (const rate of [44100, 48000]) {
    const r = await page.evaluate((a) => window.__render(a), {
      stored: STORED,
      events: notesFrom(0.05, [1, 2], [110, 220]).map((e) => ({
        ...e, frame: Math.round((e.frame / RATE) * rate),
      })),
      seconds: 1, sampleRate: rate,
    });
    assert(peak(r) > 0.05, `${rate}: the controller renders audibly`);
    assert(r.every((ch) => ch.every(Number.isFinite)), `${rate}: every sample is finite`);
  }

  // ---- a lane follows the preset that is on it --------------------------------
  const follows = await page.evaluate((a) => window.__rackFollows(a),
    { first: 'tngrBurntHorizon', second: 'tngrOrangeCurrent' });
  if (follows.error) fail(`the lane follow: ${follows.error}`);
  assert(follows.afterEdit !== follows.built,
    `an edit to the preset is heard on the next note (cutoff ${follows.built} -> ${follows.afterEdit})`);
  assert(follows.afterSwitch === follows.expected,
    `and a different preset on the lane takes it over (cutoff ${follows.afterSwitch}, expected ${follows.expected})`);
  assert(follows.lanes === 1,
    `changing the preset reuses the lane rather than stranding the old node (${follows.lanes} lane)`);

  // ---- a swept keyboard leaves nothing hanging --------------------------------
  const sweep = await page.evaluate((a) => window.__rackSweep(a), { voiceId: 'tngrBurntHorizon' });
  if (sweep.error) fail(`the keyboard sweep: ${sweep.error}`);
  assert(sweep.sounding >= 6, `six held keys sound six notes (${sweep.sounding})`);
  assert(sweep.afterRelease === 0,
    `and every one of them ends when its key comes up (${sweep.afterRelease} left sounding)`);
  assert(sweep.booksEmpty, 'the rack keeps no record of a note it has released');

  // ---- the cold path: play with nothing warmed --------------------------------
  const cold = await page.evaluate((a) => window.__rackCold(a), { voiceId: 'tngrBurntHorizon' });
  if (cold.error) fail(`the cold path: ${cold.error}`);
  assert(cold.built && cold.lanes === 1,
    'playing a TNGR-2 note with nothing warmed builds the lane on demand');
  assert(cold.voices >= 2,
    `and the notes that were waiting reach the processor (${cold.voices} voices)`);

  // ---- the VoiceRack switch ---------------------------------------------------
  const rack = await page.evaluate((a) => window.__rackSwitch(a), { voiceId: 'tngrBurntHorizon' });
  if (rack.error) fail(`the rack switch: ${rack.error}`);
  assert(rack.warmed && rack.lanes === 1, 'warming a lane builds exactly one node for it');
  assert(rack.voices >= 2, `notes played through the rack reach the processor (${rack.voices} voices)`);
  assert(rack.streams > rack.voices,
    `and each note expands into its oscillator streams (${rack.streams} for ${rack.voices} voices)`);
  assert(rack.nonFinite === 0, 'nothing non-finite reached the output');
  assert(rack.disposedLanes === 0, 'disposing the rack releases its worklet lanes');

  // OFFLINE: notes are collected during the scheduling pass and become a node at the
  // flush, because a worklet takes its schedule at construction.
  const offline = await page.evaluate((a) => window.__rackOffline(a),
    { voiceId: 'tngrBurntHorizon', flush: true });
  assert(offline.built === 1, 'the flush builds one node for the lane that was booked');
  assert(offline.peak > 0.01,
    `an offline render through the rack is audible (peak ${offline.peak.toFixed(3)})`);

  // And the hazard, pinned: WITHOUT the flush there is no node and the render is silent.
  // Any new offline path that forgets `flushTngr2Offline` loses TNGR-2 entirely, so this
  // states the requirement rather than leaving it to be discovered in a bounce.
  const unflushed = await page.evaluate((a) => window.__rackOffline(a),
    { voiceId: 'tngrBurntHorizon', flush: false });
  assert(unflushed.peak === 0,
    'an offline render that skips the flush is silent — the flush is not optional');

  if (errors.length) fail(`page errors — ${errors.join(' | ')}`);
  await page.close();
} finally {
  await browser.close();
}

console.log(failed ? `\nTNGR-2 CONTROLLER: ${failed} FAILED` : '\nTNGR-2 CONTROLLER: PASSED');
process.exit(failed ? 1 : 0);
