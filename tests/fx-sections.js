// BAR-EFFECT SECTIONS, THE STUTTER AND THE LATENCY TABLE — MEASURED OFF THE SAMPLES.
//
// The format is src/data/automation.js (a lane's `fx`, and `__master`); the playing of it
// is `_writeSections` in src/engine/audio.js and makeSectionSwitch in src/engine/mixer.js.
// Rendered in Chromium through an OfflineAudioContext, like tests/mix-automation.js,
// because the ways this goes wrong are timing and leakage, and neither shows in a graph:
//
//   1. A SECTION IS EXACTLY ITS STRETCH. A -12 dB Gain section on a track, one starting on
//      a 1/32, and one on the master are -12 dB inside and unchanged outside — and outside
//      means the same samples, not merely the same level.
//   2. A GATE ON THE MASTER chops only its section.
//   3. THE STUTTER REPEATS ITS SLICE: every sixteenth of a section is the sixteenth it
//      grabbed, a retrigger grabs again on the beat, FADE takes each repeat down, and
//      releasing the section (a stop) ends a loop nothing upstream could.
//   4. SECTIONS ONLY OFFER WHAT IS ON TIME. Every effect is measured: what SECTION_EFFECTS
//      offers comes out with its input, and every effect EFFECT_LATENCY_MS names is as late
//      as it says. An effect that grows a look-ahead fails here until it is listed.
//   5. THE BIT CRUSHER, rebuilt from native nodes, is exact: its levels are the levels,
//      its holds are DOWNSAMPLE samples long, and it is on time (which 4 also checks).
//   6. A RETUNE MOVES THE PLAYING SECTION — the Spot FX editor's live knobs — without
//      building a second graph.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EFFECTS, SECTION_EFFECTS, EFFECT_LATENCY_MS, INSERT_EFFECTS, effectPresetNames, resolveEffectPreset,
  matchEffectPreset, visibleParams,
} from '../src/engine/effects.js';
import { EFFECT_PRESETS } from '../src/data/effect-presets.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import * as Tone from 'tone';
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { createMixer } from ${JSON.stringify(join(ROOT, 'src/engine/mixer.js'))};
import { createEffect } from ${JSON.stringify(join(ROOT, 'src/engine/effects.js'))};
import { prepareEngineWorklets } from ${JSON.stringify(join(ROOT, 'src/engine/engine-worklets.js'))};
window.__Audio = Audio;
window.__prepareEngineWorklets = prepareEngineWorklets;
window.__createMixer = createMixer;
window.__Tone = Tone;
window.__createEffect = createEffect;
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

// 120 BPM: a sixteenth is 0.125s and a bar is 2s.
const SPB = 0.125;
const SR = 44100;

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
// Autoplay allowed for the one live case (11); every other render is offline.
const browser = await chromium.launch({ headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];

async function freshPage(label) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.render/', { waitUntil: 'load' });
  return page;
}

/** One song render, one channel (the left unless asked) back as a plain array. */
async function render(label, { bank, arrangement, steps = 32, seconds = 4.5, channel = 0 }) {
  const page = await freshPage(label);
  const L = await page.evaluate(async (c) => {
    const Audio = window.__Audio;
    const ctx = new OfflineAudioContext(2, 44100 * c.seconds, 44100);
    Audio.setCaptureEnabled(false);
    Audio.setNoiseSeed(1);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;
    Audio.setBank(c.bank, null, c.arrangement ?? undefined);
    Audio.nextTime = 0;
    Audio.songTrim.gain.cancelScheduledValues(0);
    Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
    for (let i = 0; i < c.steps; i++) Audio.scheduleStep();
    const buf = await ctx.startRendering();
    return Array.from(buf.getChannelData(c.channel));
  }, { bank, arrangement, steps, seconds, channel });
  await page.close();
  return L;
}

const rms = (x, from, to) => {
  const a = Math.max(0, Math.floor(from * SR));
  const b = Math.min(x.length, Math.floor(to * SR));
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return b > a ? Math.sqrt(s / (b - a)) : 0;
};
/** The part of sixteenth `i` clear of its edges, as [from, to] seconds. */
const inner = (i, lo = 0.2, hi = 0.8) => [(i + lo) * SPB, (i + hi) * SPB];
const maxDiff = (a, b, from, to) => {
  let m = 0;
  for (let i = Math.floor(from * SR); i < Math.min(a.length, Math.floor(to * SR)); i++) {
    m = Math.max(m, Math.abs(a[i] - b[i]));
  }
  return m;
};
/** Normalised correlation of two equal-length windows of the same render. */
const corr = (x, aFrom, bFrom, len) => {
  let ab = 0; let aa = 0; let bb = 0;
  const a0 = Math.floor(aFrom * SR); const b0 = Math.floor(bFrom * SR); const n = Math.floor(len * SR);
  for (let i = 0; i < n; i++) { ab += x[a0 + i] * x[b0 + i]; aa += x[a0 + i] ** 2; bb += x[b0 + i] ** 2; }
  return aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0;
};

const rest = () => new Array(32).fill(null);

// ---- 0. the section effects' presets are what they say ---------------------------------
//
// A preset is resolved through its effect's ranges, and a range nobody declared is 0–1: the
// Stutter's note lengths are beats, so an undeclared range made a two-bar Tape Stop a beat.
for (const id of ['stutter', 'filter', 'gain', 'delay', 'pingpong', 'chandelay', 'widener', 'shifter']) {
  for (const name of effectPresetNames(id)) {
    const stored = EFFECT_PRESETS.inserts[id].presets[name];
    const resolved = resolveEffectPreset(id, name);
    const kept = Object.entries(stored).every(([k, v]) => (typeof v === 'number'
      ? Math.abs(resolved[k] - v) < 1e-9 : resolved[k] === v));
    assert(kept && matchEffectPreset(id, resolved) === name,
      `${id} preset ${name} resolves to its own settings and is recognised as itself`);
  }
}
const gainFx = (db) => [{ id: 'gain', params: { gain: db } }];

try {
  // ---- 1. a section is exactly its stretch -----------------------------------------
  //
  // A lead held through both bars, re-struck at each bar line, so every sixteenth has a
  // level to compare with the same song rendered plain.
  {
    const notes = rest(); const lens = rest();
    for (const s of [0, 16]) { notes[s] = 220; lens[s] = 16; }
    const bank = { bpm: 120, lead: notes, leadLen: lens, order: [{ s: 0, bars: 2 }] };
    const plain = await render('plain', { bank });
    const arranged = await render('sections', { bank, arrangement: { automation: {
      lead: { fx: [
        { from: [1, 4], to: [1, 8], chain: gainFx(-12) },
        // A 1/32: starts halfway through sixteenth 10.
        { from: [1, 10.5], to: [1, 12], chain: gainFx(-12) },
      ] },
      __master: { fx: [{ from: [2, 4], to: [2, 8], chain: gainFx(-12) }] },
    } } });
    const drop = (i, lo, hi) => dB(rms(arranged, ...inner(i, lo, hi)) / rms(plain, ...inner(i, lo, hi)));
    const inside = [4, 5, 6, 7, 20, 21, 22, 23].map((i) => drop(i));
    assert(inside.every((d) => Math.abs(d + 12) < 0.2),
      `a track section and a master section are -12 dB through every sixteenth they cover (${inside.map((d) => d.toFixed(2)).join(', ')})`);
    assert(Math.abs(drop(10, 0.1, 0.45)) < 0.2 && Math.abs(drop(10, 0.55, 0.95) + 12) < 0.2
      && Math.abs(drop(11) + 12) < 0.2,
      'a section starting on a 1/32 switches halfway through its sixteenth, not at either end of it');
    const outside = [[0, 4 * SPB], [8 * SPB + 0.005, 10.5 * SPB], [12 * SPB + 0.005, 20 * SPB], [24 * SPB + 0.005, 32 * SPB]];
    const worst = Math.max(...outside.map(([a, b]) => maxDiff(plain, arranged, a, b)));
    assert(worst < 1e-6, `outside its sections the song is the same samples (worst ${worst.toExponential(2)})`);
  }

  // ---- 2. a gate on the master -------------------------------------------------------
  {
    const notes = rest(); const lens = rest();
    for (const s of [0, 16]) { notes[s] = 220; lens[s] = 16; }
    const bank = { bpm: 120, lead: notes, leadLen: lens, order: [{ s: 0, bars: 2 }] };
    const plain = await render('gate:plain', { bank });
    const gated = await render('gate', { bank, arrangement: { automation: { __master: { fx: [{
      from: [1, 8], to: [2, 0],
      chain: [{ id: 'rhythmgate', params: { division: 0.25, gateLength: 0.5, attack: 0.002, decay: 0.004, depth: 1 } }],
    }] } } } });
    const closed = [8, 9, 10, 11, 12, 13, 14, 15]
      .map((i) => dB(rms(gated, ...inner(i, 0.6, 0.95)) / rms(plain, ...inner(i, 0.6, 0.95))));
    const open = [8, 9, 10, 11, 12, 13, 14, 15]
      .map((i) => dB(rms(gated, ...inner(i, 0.08, 0.42)) / rms(plain, ...inner(i, 0.08, 0.42))));
    assert(closed.every((d) => d < -60) && open.every((d) => Math.abs(d) < 0.5),
      `a master gate section opens the first half of each sixteenth and shuts the second (open ${open.map((d) => d.toFixed(1)).join(', ')}; shut ${closed.map((d) => d.toFixed(0)).join(', ')})`);
    assert(maxDiff(plain, gated, 0, 8 * SPB) < 1e-6 && maxDiff(plain, gated, 16 * SPB + 0.01, 32 * SPB) < 1e-6,
      'and the bars around it are untouched');
  }

  // ---- 3. the stutter ------------------------------------------------------------------
  //
  // A lead that changes note every sixteenth, so a repeat is told from the music by what
  // it plays: sixteenth k of the song and sixteenth k of the stutter are different notes.
  {
    const notes = rest(); const lens = rest();
    for (let s = 0; s < 32; s++) { notes[s] = 220 * 2 ** ((s % 12) / 12); lens[s] = 1; }
    const bank = { bpm: 120, lead: notes, leadLen: lens, order: [{ s: 0, bars: 2 }] };
    const stutter = (params, from = [1, 4], to = [2, 0]) => ({ automation: { __master: { fx: [{
      from, to, chain: [{ id: 'stutter', params: { slice: 0.25, retrigger: 0, fade: 0, ...params } }],
    }] } } });
    const plain = await render('stutter:plain', { bank });
    const held = await render('stutter:hold', { bank, arrangement: stutter({}) });
    // The loop is a whole number of frames — a sixteenth here is 5512.5 — so repeat k of a
    // slice grabbed at `grab` starts k LOOPS on, not k sixteenths. Half a frame a repeat is
    // nothing anyone hears; it is everything to a correlation of a square wave's edges.
    const LOOP = Math.round(SPB * SR) / SR;
    const repeatAt = (grab, k) => grab + k * LOOP;
    const repeats = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      .map((k) => corr(held, 4 * SPB + 0.2 * LOOP, repeatAt(4 * SPB, k) + 0.2 * LOOP, 0.6 * LOOP));
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => dB(
      rms(held, repeatAt(4 * SPB, k) + 0.2 * LOOP, repeatAt(4 * SPB, k) + 0.8 * LOOP)
      / rms(held, 4 * SPB + 0.2 * LOOP, 4 * SPB + 0.8 * LOOP)));
    assert(repeats.every((c) => c > 0.999) && levels.every((d) => Math.abs(d) < 0.1),
      `every sixteenth of the section is the sixteenth it grabbed, at its level (worst correlation ${Math.min(...repeats).toFixed(5)})`);
    assert(corr(plain, 4.2 * SPB, 9.2 * SPB, 0.6 * SPB) < 0.9,
      'which the song itself does not play — the repeats are the stutter, not the part');
    assert(maxDiff(plain, held, 0, 5 * SPB - 0.003) < 1e-6,
      'the grab is the music playing live: nothing changes until the first repeat');
    assert(maxDiff(plain, held, 16 * SPB + 0.01, 32 * SPB) < 1e-6,
      'and when the section ends the song carries on as written');

    const beats = await render('stutter:retrigger', { bank, arrangement: stutter({ retrigger: 1 }, [1, 0], [2, 0]) });
    const sameBeat = [];
    const otherBeat = [];
    for (let beat = 0; beat < 4; beat++) {
      for (let j = 1; j < 4; j++) {
        sameBeat.push(corr(beats, 4 * beat * SPB + 0.2 * LOOP, repeatAt(4 * beat * SPB, j) + 0.2 * LOOP, 0.6 * LOOP));
      }
      if (beat) otherBeat.push(corr(beats, 0.2 * SPB, (4 * beat + 0.2) * SPB, 0.6 * SPB));
    }
    assert(sameBeat.every((c) => c > 0.999) && otherBeat.every((c) => c < 0.9),
      'a RETRIGGER of a beat grabs again on every beat, and repeats that beat\'s first sixteenth through it');

    const faded = await render('stutter:fade', { bank, arrangement: stutter({ fade: -6 }) });
    const at = (k) => [repeatAt(4 * SPB, k) + 0.2 * LOOP, repeatAt(4 * SPB, k) + 0.8 * LOOP];
    const steps = [2, 3, 4].map((k) => dB(rms(faded, ...at(k)) / rms(faded, ...at(k - 1))));
    assert(steps.every((d) => Math.abs(d + 6) < 0.3),
      `FADE takes each repeat down by its amount (${steps.map((d) => d.toFixed(2)).join(', ')} dB)`);
  }

  // A stop has to end the loop. The Stutter is downstream of every gate a stop closes, so
  // without the release it would repeat its slice for as long as the page was open.
  {
    const page = await freshPage('release');
    const r = await page.evaluate(async () => {
      const ctx = new OfflineAudioContext(2, 44100 * 1.2, 44100);
      window.__Tone.setContext(ctx);
      const musicBus = ctx.createGain(); const echoBus = ctx.createGain();
      const songTrim = ctx.createGain(); const master = ctx.createGain();
      musicBus.connect(songTrim); echoBus.connect(songTrim); songTrim.connect(master);
      const mixer = window.__createMixer(ctx, { musicBus, echoBus, songTrim, master, destination: ctx.destination });
      await mixer.ready;
      const osc = ctx.createOscillator(); osc.frequency.value = 330;
      osc.connect(musicBus); osc.start(0); osc.stop(0.3);
      const chain = [{ id: 'stutter', params: { slice: 0.25, retrigger: 0, fade: 0 } }];
      mixer.prepareBarEffects([], 120, { __master: { fx: [{ from: [1, 0], to: [2, 0], chain }] } });
      mixer.scheduleBarEffects('__master', chain, 0.1, { fresh: true, sixteenth: 0.125 });
      mixer.releaseBarEffects(0.7, 0);
      const L = (await ctx.startRendering()).getChannelData(0);
      const level = (a, b) => {
        let s = 0; for (let i = Math.floor(a * 44100); i < Math.floor(b * 44100); i++) s += L[i] * L[i];
        return Math.sqrt(s / (Math.floor(b * 44100) - Math.floor(a * 44100)));
      };
      return { looping: level(0.4, 0.65), after: level(0.75, 1.15) };
    });
    await page.close();
    assert(r.looping > 0.05 && r.after < 1e-6,
      `after its music has stopped the Stutter still repeats (${dB(r.looping).toFixed(1)} dB) until it is released, and then nothing (${dB(r.after).toFixed(0)} dB)`);
  }

  // ---- 4. what a section may hold ---------------------------------------------------------
  {
    const page = await freshPage('latency');
    const lags = await page.evaluate(async (ids) => {
      const out = {};
      for (const id of ids) {
        const N = Math.ceil(0.8 * 44100);
        const ctx = new OfflineAudioContext(1, N, 44100);
        window.__Tone.setContext(ctx);
        // As every real render has them, through `mixer.ready`: the Noise Gate is a worklet,
        // and measured without one it is its ScriptProcessor fallback, 12ms late.
        await window.__prepareEngineWorklets(ctx);
        const buffer = ctx.createBuffer(1, N, 44100);
        const x = buffer.getChannelData(0);
        const at = Math.round(0.25 * 44100);
        const len = Math.round(0.006 * 44100);
        for (let i = 0; i < len; i++) x[at + i] = 0.3 * Math.sin(2 * Math.PI * 1500 * i / 44100) * Math.sin(Math.PI * i / len);
        const src = ctx.createBufferSource(); src.buffer = buffer;
        const fx = window.__createEffect(id, {}, ctx, 120);
        window.__Tone.connect(src, fx.node.input || fx.node);
        window.__Tone.connect(fx.node.output || fx.node, ctx.destination);
        src.start(0);
        const y = (await ctx.startRendering()).getChannelData(0);
        let best = 0; let lag = 0;
        for (let l = 0; l <= Math.round(0.15 * 44100); l++) {
          let s = 0;
          for (let i = 0; i < len; i++) s += x[at + i] * y[at + i + l];
          if (Math.abs(s) > Math.abs(best)) { best = s; lag = l; }
        }
        out[id] = best ? (lag / 44100) * 1000 : 0;
      }
      return out;
    }, EFFECTS.map((d) => d.id));
    await page.close();
    const late = SECTION_EFFECTS.filter((d) => lags[d.id] > 1);
    assert(!late.length, `every effect a section offers is on time — within a millisecond, which a filter's phase is and a look-ahead is not (late: ${late.map((d) => `${d.id} ${lags[d.id].toFixed(2)}ms`).join(', ') || 'none'})`);
    const wrong = Object.entries(EFFECT_LATENCY_MS)
      .filter(([id, ms]) => !(Math.abs(lags[id] - ms) <= Math.max(0.5, ms * 0.1)));
    assert(!wrong.length, `every effect EFFECT_LATENCY_MS names is as late as it says (wrong: ${wrong.map(([id, ms]) => `${id} listed ${ms}ms, measured ${lags[id]?.toFixed(2)}ms`).join(', ') || 'none'})`);
    assert(SECTION_EFFECTS.some((d) => d.id === 'stutter') && !INSERT_EFFECTS.some((d) => d.id === 'stutter'),
      'the Stutter is offered on a section and nowhere else');
    assert(SECTION_EFFECTS.some((d) => d.id === 'bitcrusher'), 'and the Bit Crusher is back on the list a section offers');
    // Not zero here: its attack opens across this 6ms burst, which pulls the best match one
    // cycle of the 1500Hz tone later. tests/engine-worklets.js has it sample-exact.
    assert(SECTION_EFFECTS.some((d) => d.id === 'noisegate') && lags.noisegate <= 1,
      `and so is the Noise Gate, on time on its worklet (${lags.noisegate?.toFixed(2)}ms, one cycle of the probe as it opens)`);
  }

  // ---- 5. the bit crusher, exactly --------------------------------------------------------
  {
    const page = await freshPage('crusher');
    const r = await page.evaluate(async () => {
      const run = async (params) => {
        const N = 44100;
        const ctx = new OfflineAudioContext(1, N, 44100);
        window.__Tone.setContext(ctx);
        const buffer = ctx.createBuffer(1, N, 44100);
        const x = buffer.getChannelData(0);
        for (let i = 0; i < N; i++) x[i] = -1.2 + 2.4 * (i / N);
        const src = ctx.createBufferSource(); src.buffer = buffer;
        const fx = window.__createEffect('bitcrusher', { wet: 1, ...params }, ctx, 120);
        src.connect(fx.node.input); fx.node.output.connect(ctx.destination);
        src.start(0);
        return { x, y: (await ctx.startRendering()).getChannelData(0) };
      };
      const depth = await run({ bits: 4, downsample: 1 });
      let off = 0; let wrong = 0;
      for (let i = 0; i < depth.y.length; i++) {
        const level = Math.round(depth.y[i] * 8);
        if (Math.abs(depth.y[i] * 8 - level) > 1e-4) off++;
        else if (level !== Math.round(depth.x[i] * 8)) wrong++;
      }
      const hold = await run({ bits: 24, downsample: 6 });
      let broken = 0;
      for (let b = 6; b + 6 <= hold.y.length; b += 6) {
        for (let j = 1; j < 6; j++) if (Math.abs(hold.y[b + j] - hold.y[b]) > 1e-6) broken++;
        if (Math.abs(hold.y[b] - hold.x[b]) > 1e-5) broken++;
      }
      return { off, wrong, broken, n: depth.y.length };
    });
    await page.close();
    assert(r.off < r.n * 0.002 && r.wrong === 0,
      `4 bits is sixteen levels, each the one the input rounds to (${r.off} of ${r.n} samples between two, on a step's edge)`);
    assert(r.broken === 0, 'a DOWNSAMPLE of 6 holds the sample at the top of each period for six samples');
  }
  // ---- 6. a retune moves the section that is playing ---------------------------------------
  //
  // The Spot FX editor's knobs. Halfway through a master Gain section the chain's params
  // change, at an audio time, while it plays: the nodes already sounding take it (-12 dB
  // becomes -24 dB from there on) and no second graph is built for the new value — one
  // would start with an empty tail and re-grab a Stutter. See makeSectionSwitch's retune.
  {
    const notes = rest(); const lens = rest();
    for (const s of [0, 16]) { notes[s] = 220; lens[s] = 16; }
    const bank = { bpm: 120, lead: notes, leadLen: lens, order: [{ s: 0, bars: 2 }] };
    const plain = await render('retune:plain', { bank });
    const page = await freshPage('retune');
    const r = await page.evaluate(async (c) => {
      const Audio = window.__Audio;
      const ctx = new OfflineAudioContext(2, 44100 * 4.5, 44100);
      Audio.setCaptureEnabled(false);
      Audio.setNoiseSeed(1);
      Audio.ensure(ctx);
      if (Audio.mixer) await Audio.mixer.ready;
      const old = [{ id: 'gain', params: { gain: -12 } }];
      Audio.setBank(c.bank, null, { automation: { __master: { fx: [{ from: [1, 0], to: [3, 0], chain: old }] } } });
      Audio.nextTime = 0;
      Audio.songTrim.gain.cancelScheduledValues(0);
      Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
      for (let i = 0; i < 32; i++) Audio.scheduleStep();
      const before = Audio.mixer._masterSectionSlots.length;
      const out = { before, after: null, retuned: null };
      ctx.suspend(2).then(() => {
        out.retuned = Audio.mixer.retuneBarEffects('__master', old, [{ id: 'gain', params: { gain: -24 } }], 120);
        out.after = Audio.mixer._masterSectionSlots.length;
        ctx.resume();
      });
      const buf = await ctx.startRendering();
      return { ...out, L: Array.from(buf.getChannelData(0)) };
    }, { bank });
    await page.close();
    const drop = (i) => dB(rms(r.L, ...inner(i)) / rms(plain, ...inner(i)));
    const early = [4, 8, 12, 15].map(drop);
    const late = [18, 22, 26, 30].map(drop);
    assert(r.retuned === true && r.before === r.after,
      `a retune is taken by the branch already built — no second graph (${r.before} before, ${r.after} after)`);
    assert(early.every((d) => Math.abs(d + 12) < 0.2) && late.every((d) => Math.abs(d + 24) < 0.2),
      `and the playing section moves with it: ${early.map((d) => d.toFixed(1)).join(', ')} dB, then ${late.map((d) => d.toFixed(1)).join(', ')} dB`);
  }

  // ---- 7. the tape stop ---------------------------------------------------------------------
  //
  // A Stutter's TAPE STOP winds what it plays down to a standstill that lands on the
  // section's end. The speed falls in a straight line, so a quarter of the way through the
  // music is at three quarters of its speed — and its pitch, read off the zero crossings,
  // with it. Measured against the same song plain, at the same note. The note is struck
  // every sixteenth so the level holds steady through the bar rather than decaying away.
  {
    // Frequency from the first and last zero crossing in a window, each placed between its
    // two samples: counting crossings alone is a sixteenth-of-a-period guess at low pitch.
    const zc = (x, from, to) => {
      let n = 0; let first = null; let last = null;
      for (let i = Math.floor(from * SR) + 1; i < Math.floor(to * SR); i++) {
        if ((x[i - 1] < 0) === (x[i] < 0)) continue;
        const at = i - 1 + x[i - 1] / (x[i - 1] - x[i]);
        if (first == null) first = at;
        last = at; n++;
      }
      return n > 2 ? ((n - 1) / 2) / ((last - first) / SR) : 0;
    };
    const stutterAt = (params, from, to) => ({ automation: { __master: { fx: [{
      from, to, chain: [{ id: 'stutter', params: { slice: 0.25, retrigger: 0, fade: 0, stop: 0, ...params } }],
    }] } } });
    const drone = rest(); const droneLens = rest();
    for (let s = 0; s < 32; s++) { drone[s] = 220; droneLens[s] = 1; }
    const droneBank = { bpm: 120, lead: drone, leadLen: droneLens, order: [{ s: 0, bars: 2 }] };
    const plain = await render('tape:plain', { bank: droneBank });
    // SLICE Off: a plain tape stop over the second half of bar 1, 1.0s to 2.0s.
    const stopped = await render('tape:stop', { bank: droneBank, arrangement: stutterAt({ slice: 0, stop: 8 }, [1, 8], [2, 0]) });
    const speed = (u) => {
      const t = 1 + u;
      return zc(stopped, t - 0.03, t + 0.03) / zc(plain, t - 0.03, t + 0.03);
    };
    const speeds = [0.25, 0.5, 0.7].map(speed);
    assert(Math.abs(speeds[0] - 0.75) < 0.04 && Math.abs(speeds[1] - 0.5) < 0.04 && Math.abs(speeds[2] - 0.3) < 0.04,
      `a tape stop falls in speed and pitch along a straight line (${speeds.map((v) => v.toFixed(2)).join(', ')} at 25/50/70 %)`);
    // Silent where it ends, against the song's own level: a read point crawling over one
    // note's attack can be louder than the plain song at that instant, so the instant is
    // not the yardstick — the last quarter-millisecond against the music as it plays is.
    const peak = (x, from, to) => {
      let m = 0;
      for (let i = Math.floor(from * SR); i < Math.floor(to * SR); i++) m = Math.max(m, Math.abs(x[i]));
      return m;
    };
    const level = rms(plain, 0.4, 0.6);
    const tail = dB(peak(stopped, 2 - 0.00025, 2.0) / level);
    const fading = dB(rms(stopped, 1.9, 1.95) / rms(stopped, 1.5, 1.55));
    assert(tail < -40 && fading < -6,
      `and fades as it stands still — ${fading.toFixed(1)} dB over its last quarter, ${tail.toFixed(0)} dB at its end`);
    assert(maxDiff(plain, stopped, 0, 1.0) < 1e-6 && maxDiff(plain, stopped, 2.03, 4.0) < 1e-6,
      'the music before the section and after it is the same samples');
    // The shortest stop, a 1/16: the section plays straight until its last sixteenth, then winds
    // down inside it — half speed half way through it — to silence on the section's end.
    const blip = await render('tape:sixteenth', { bank: droneBank, arrangement: stutterAt({ slice: 0, stop: 0.25 }, [1, 8], [2, 0]) });
    const sixteenth = 60 / 120 / 4;
    const blipSpeed = (t, half) => zc(blip, t - half, t + half) / zc(plain, t - half, t + half);
    const straight = blipSpeed(1.5, 0.03);
    const halfway = blipSpeed(2 - sixteenth / 2, 0.02);
    const blipTail = dB(peak(blip, 2 - 0.00025, 2.0) / level);
    assert(Math.abs(straight - 1) < 0.01 && Math.abs(halfway - 0.5) < 0.08 && blipTail < -40,
      `a 1/16 tape stop takes only the section's last sixteenth (speed ${straight.toFixed(2)} before it, ${halfway.toFixed(2)} half way through it, ${blipTail.toFixed(0)} dB at its end)`);

    // With a slice: the repeats hold through the first half, then wind down with the rest.
    const notes = rest(); const lens = rest();
    for (let s = 0; s < 32; s++) { notes[s] = 220 * 2 ** ((s % 12) / 12); lens[s] = 1; }
    const chromatic = { bpm: 120, lead: notes, leadLen: lens, order: [{ s: 0, bars: 2 }] };
    const both = await render('tape:stutter', { bank: chromatic, arrangement: stutterAt({ slice: 0.25, stop: 2 }, [1, 0], [2, 0]) });
    const LOOP = Math.round(SPB * SR) / SR;
    const held1 = corr(both, 0.2 * LOOP, 5 * LOOP + 0.2 * LOOP, 0.6 * LOOP);
    const early = zc(both, 0.6, 0.9);
    const late = zc(both, 1.45, 1.55);
    assert(held1 > 0.999 && Math.abs(late / early - 0.5) < 0.06,
      `a Stutter with a stop repeats its slice, then the repeats slow (${early.toFixed(0)} Hz held, ${late.toFixed(0)} Hz half way down)`);

    // Turned while its section plays — the Spot FX knob — it is heard from then on. Scheduled
    // a tenth of a second ahead as the live clock does, so that at the turn the section is
    // still the one playing, not one whose end the whole song was booked past already. The
    // engine schedules some of its own moves from `currentTime`, so the yardstick is the
    // same song scheduled the same way with nothing turned.
    const live = async (label, turn) => {
      const page = await freshPage(label);
      const out = await page.evaluate(async (c) => {
        const Audio = window.__Audio;
        const ctx = new OfflineAudioContext(2, 44100 * 4.5, 44100);
        Audio.setCaptureEnabled(false);
        Audio.setNoiseSeed(1);
        Audio.ensure(ctx);
        if (Audio.mixer) await Audio.mixer.ready;
        const off = [{ id: 'stutter', params: { slice: 0, retrigger: 0, fade: 0, stop: 0 } }];
        Audio.setBank(c.bank, null, { automation: { __master: { fx: [{ from: [1, 0], to: [2, 0], chain: off }] } } });
        Audio.nextTime = 0;
        Audio.songTrim.gain.cancelScheduledValues(0);
        Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
        let steps = 0;
        const pump = (t) => { while (steps < 32 && Audio.nextTime < t + 0.1) { Audio.scheduleStep(); steps++; } };
        pump(0);
        let retuned = null;
        for (let i = 1; i < 44; i++) {
          const t = i * 0.1;
          ctx.suspend(t).then(() => {
            if (i === 10 && c.turn) {
              // As the desk's commit does: the playing branch retuned, and the arrangement
              // written with the same chain, so the sixteenths after this one select it.
              const on = [{ id: 'stutter', params: { slice: 0, retrigger: 0, fade: 0, stop: 8 } }];
              retuned = Audio.mixer.retuneBarEffects('__master', off, on, 120);
              Audio.setArrangement({ automation: { __master: { fx: [{ from: [1, 0], to: [2, 0], chain: on }] } } });
            }
            pump(t);
            ctx.resume();
          });
        }
        const buf = await ctx.startRendering();
        return { retuned, L: Array.from(buf.getChannelData(0)) };
      }, { bank: droneBank, turn });
      await page.close();
      return out;
    };
    const control = await live('tape:live', false);
    const turned = await live('tape:turned', true);
    const turnedSpeed = zc(turned.L, 1.47, 1.53) / zc(control.L, 1.47, 1.53);
    const turnedBefore = maxDiff(control.L, turned.L, 0, 1.0);
    const turnedTail = dB(peak(turned.L, 2 - 0.00025, 2.0) / rms(control.L, 0.4, 0.6));
    assert(turned.retuned === true && turnedBefore < 1e-6 && turnedSpeed < 0.6 && turnedTail < -40,
      `a TAPE STOP turned mid-section winds down from then to the same end (speed ${turnedSpeed.toFixed(2)} half way, `
      + `${turnedTail.toFixed(0)} dB at its end, ${turnedBefore.toExponential(1)} off the song before the turn)`);

    // At rest — no section engaged — a Stutter with a stop dialled in is a wire.
    const restPage = await freshPage('tape:rest');
    const restDiff = await restPage.evaluate(async () => {
      const ctx = new OfflineAudioContext(1, 22050, 44100);
      window.__Tone.setContext(ctx);
      const buffer = ctx.createBuffer(1, 22050, 44100);
      const x = buffer.getChannelData(0);
      for (let i = 0; i < x.length; i++) x[i] = 0.3 * Math.sin(2 * Math.PI * 330 * i / 44100);
      const src = ctx.createBufferSource(); src.buffer = buffer;
      const fx = window.__createEffect('stutter', { slice: 0.25, stop: 4 }, ctx, 120);
      src.connect(fx.node.input); fx.node.output.connect(ctx.destination); src.start(0);
      const y = (await ctx.startRendering()).getChannelData(0);
      let m = 0; for (let i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i] - x[i]));
      return m;
    });
    await restPage.close();
    assert(restDiff < 1e-6, `with a stop dialled in and nothing engaged, the Stutter passes its input untouched (${restDiff.toExponential(1)})`);
  }

  // ---- 8. the filter sweep -----------------------------------------------------------------
  //
  // On a section, the Filter's cutoff glides from CUTOFF at the section's start to SWEEP TO
  // at its end, evenly in pitch: halfway through a 200 Hz → 8 kHz sweep it is at the
  // geometric middle, 1265 Hz, not the arithmetic one. Read off the node's own schedule,
  // then heard in the samples.
  {
    const page = await freshPage('sweep');
    const curve = await page.evaluate(async () => {
      const Audio = window.__Audio;
      const out = {};
      for (const [name, a, b] of [['up', 200, 8000], ['down', 8000, 200]]) {
        const ctx = new OfflineAudioContext(2, 44100 * 3, 44100);
        Audio.setCaptureEnabled(false);
        Audio.ensure(ctx);
        if (Audio.mixer) await Audio.mixer.ready;
        const notes = new Array(32).fill(null);
        const bank = { bpm: 120, lead: notes, order: [{ s: 0, bars: 2 }] };
        const chain = [{ id: 'filter', params: { type: 'lowpass', frequency: a, Q: 1, sweep: 1, sweepTo: b } }];
        Audio.setBank(bank, null, { automation: { __master: { fx: [{ from: [1, 0], to: [2, 0], chain }] } } });
        Audio.nextTime = 0;
        for (let i = 0; i < 32; i++) Audio.scheduleStep();
        const freq = Audio.mixer._masterSectionSlots[0].chain[0].node.frequency;
        out[name] = [0.001, 0.5, 1.0, 1.5, 1.99].map((t) => freq.getValueAtTime(t));
      }
      // Engaged part-way through a section — a jump, a loop — it is where the sweep would be.
      const ctx = new OfflineAudioContext(1, 44100 * 3, 44100);
      window.__Tone.setContext(ctx);
      const link = window.__createEffect('filter', { type: 'lowpass', frequency: 200, Q: 1, sweep: 1, sweepTo: 8000 }, ctx, 120);
      link.engage(0.5, 0.125, 2.0, 0.0);
      out.landed = link.node.frequency.getValueAtTime(0.501);
      // And in an insert slot, nobody engages it: a filter with a sweep dialled in stays put.
      const still = window.__createEffect('filter', { type: 'lowpass', frequency: 200, Q: 1, sweep: 1, sweepTo: 8000 }, ctx, 120);
      out.insert = still.node.frequency.getValueAtTime(1.0);
      // A SWEEP TO turned half way through — the Spot FX knob — aims the rest of the sweep at
      // the new end, from where it had got to.
      const live = new OfflineAudioContext(1, 44100 * 2.5, 44100);
      window.__Tone.setContext(live);
      const turned = window.__createEffect('filter', { type: 'lowpass', frequency: 200, Q: 1, sweep: 1, sweepTo: 8000 }, live, 120);
      const src = live.createOscillator();
      window.__Tone.connect(src, turned.node); window.__Tone.connect(turned.node, live.destination); src.start(0);
      turned.engage(0, 0.125, 2.0, 0);
      live.suspend(1).then(() => { turned.set({ sweepTo: 2000 }); live.resume(); });
      await live.startRendering();
      // Read once the 20ms it takes to ease onto the new line is over (see sectionGlide).
      out.turnedMid = turned.node.frequency.getValueAtTime(1.04);
      out.turnedEnd = turned.node.frequency.getValueAtTime(1.995);
      return out;
    });
    await page.close();
    const even = (a, b, u) => a * (b / a) ** u;
    const near = (got, want) => Math.abs(got / want - 1) < 0.02;
    const us = [0, 0.25, 0.5, 0.75, 0.995];
    assert(curve.up.every((f, i) => near(f, even(200, 8000, us[i]))),
      `a sweep up runs evenly in pitch from CUTOFF to SWEEP TO (${curve.up.map((f) => f.toFixed(0)).join(' → ')} Hz)`);
    assert(curve.down.every((f, i) => near(f, even(8000, 200, us[i]))),
      `and a sweep down the other way (${curve.down.map((f) => f.toFixed(0)).join(' → ')} Hz)`);
    assert(near(curve.landed, even(200, 8000, 0.25)),
      `landing a quarter of the way into its section, the sweep starts a quarter of the way up (${curve.landed.toFixed(0)} Hz)`);
    assert(Math.abs(curve.insert - 200) < 1e-3, 'a Filter in an insert slot never sweeps, whatever it is set to');
    assert(near(curve.turnedMid, even(200, 2000, 0.52)) && Math.abs(curve.turnedEnd / 2000 - 1) < 0.03,
      `a SWEEP TO turned half way re-aims the rest of the sweep (${curve.turnedMid.toFixed(0)} Hz then ${curve.turnedEnd.toFixed(0)} Hz at the end)`);

    // Heard: the drone gets brighter quarter by quarter, and is itself again after.
    const drone = rest(); const droneLens = rest();
    for (let s = 0; s < 32; s++) { drone[s] = 220; droneLens[s] = 1; }
    const droneBank = { bpm: 120, lead: drone, leadLen: droneLens, order: [{ s: 0, bars: 2 }] };
    const plain = await render('sweep:plain', { bank: droneBank });
    const swept = await render('sweep:up', { bank: droneBank, arrangement: { automation: { __master: { fx: [{
      from: [1, 0], to: [2, 0],
      chain: [{ id: 'filter', params: { type: 'lowpass', frequency: 200, Q: 1, sweep: 1, sweepTo: 8000 } }],
    }] } } } });
    // How much of the signal is top end: the first difference's level against the signal's.
    const bright = (x, from, to) => {
      let d = 0; let e = 0;
      for (let i = Math.floor(from * SR) + 1; i < Math.floor(to * SR); i++) { d += (x[i] - x[i - 1]) ** 2; e += x[i] ** 2; }
      return Math.sqrt(d / Math.max(1e-12, e));
    };
    const quarters = [0.05, 0.55, 1.05, 1.55].map((t) => bright(swept, t, t + 0.4));
    assert(quarters.every((v, i) => i === 0 || v > quarters[i - 1] * 1.15),
      `the sweep is heard opening up, quarter by quarter (${quarters.map((v) => v.toFixed(3)).join(', ')})`);
    assert(maxDiff(plain, swept, 2.1, 4.0) < 1e-6, 'and after its section the song is the same samples');
  }

  // ---- 9. the gain sweep: fades and pans --------------------------------------------------
  //
  // On a section the Gain glides from GAIN to GAIN TO and BALANCE to BALANCE TO. On the
  // master that is the whole mix fading out or in, evenly in dB down to the floor (-48),
  // which is the bottom of GAIN's travel and silence. A stop in the middle of a fade carries
  // on from the level the fade has reached, not from where it started.
  {
    const gainDef = EFFECTS.find((d) => d.id === 'gain');
    const shown = (params, section) => visibleParams(gainDef, params, { section }).join(' ');
    assert(shown({ sweep: 1 }, false) === 'gain balance mono'
      && shown({ sweep: 0 }, true) === 'gain balance mono sweep'
      && shown({ sweep: 1 }, true) === 'gain balance mono sweep gainTo balanceTo',
    'an insert Gain shows no sweep; a section shows SWEEP, and GAIN TO and BALANCE TO with it on');

    const drone = rest(); const droneLens = rest();
    for (let s = 0; s < 32; s++) { drone[s] = 220; droneLens[s] = 1; }
    const droneBank = { bpm: 120, lead: drone, leadLen: droneLens, order: [{ s: 0, bars: 2 }] };
    const sweepOn = (params) => ({ automation: { __master: { fx: [{
      from: [1, 0], to: [2, 0], chain: [{ id: 'gain', params: { gain: 0, balance: 0, mono: 0, sweep: 1, gainTo: 0, balanceTo: 0, ...params } }],
    }] } } });
    const plain = await render('gainsweep:plain', { bank: droneBank });
    const per = (x, ref, i) => dB(rms(x, ...inner(i)) / rms(ref, ...inner(i)));
    // What a gain moving under the window SHOULD read: each note is struck and decays, so a
    // window's energy sits early in it, and a plain mid-window value is not the yardstick.
    // The song's own samples, each times the gain at its instant, are.
    const want = (ref, i, gainAt) => {
      const [a, b] = inner(i);
      let num = 0; let den = 0;
      for (let n = Math.floor(a * SR); n < Math.floor(b * SR); n++) {
        num += (ref[n] * gainAt(n / SR)) ** 2; den += ref[n] ** 2;
      }
      return 10 * Math.log10(num / den);
    };
    const SIXTEENTHS = [1, 3, 5, 7, 9, 11, 13];

    const out = await render('gainsweep:out', { bank: droneBank, arrangement: sweepOn({ gainTo: -48 }) });
    const outDb = SIXTEENTHS.map((i) => [per(out, plain, i), want(plain, i, (t) => 10 ** (-48 * (t / 2) / 20))]);
    assert(outDb.every(([got, w]) => Math.abs(got - w) < 0.1),
      `a master fade-out falls evenly in dB across its section (${outDb.map(([d]) => d.toFixed(1)).join(', ')} dB)`);
    assert(maxDiff(plain, out, 2.01, 4.0) < 1e-6, 'and the bar after it is the song again, the same samples');

    const fadeIn = await render('gainsweep:in', { bank: droneBank, arrangement: sweepOn({ gain: -48, gainTo: 0 }) });
    const inDb = SIXTEENTHS.map((i) => [per(fadeIn, plain, i), want(plain, i, (t) => 10 ** (-48 * (1 - t / 2) / 20))]);
    assert(inDb.every(([got, w]) => Math.abs(got - w) < 0.1),
      `a fade-in from −∞ rises the same way (${inDb.map(([d]) => d.toFixed(1)).join(', ')} dB)`);

    // A pan, hard left to hard right: the right side rides up to the centre, then the left
    // side rides down — the balance law, read on each channel against the song plain.
    const pan = sweepOn({ balance: -1, balanceTo: 1 });
    const panL = await render('gainsweep:panL', { bank: droneBank, arrangement: pan });
    const panR = await render('gainsweep:panR', { bank: droneBank, arrangement: pan, channel: 1 });
    const plainR = await render('gainsweep:plainR', { bank: droneBank, channel: 1 });
    const bal = (t) => -1 + 2 * (t / 2);
    const panAt = [4, 6, 9, 11].map((i) => ({
      l: per(panL, plain, i), r: per(panR, plainR, i),
      wantL: want(plain, i, (t) => (bal(t) <= 0 ? 1 : 1 - bal(t))),
      wantR: want(plainR, i, (t) => (bal(t) >= 0 ? 1 : 1 + bal(t))),
    }));
    assert(panAt.every((p) => Math.abs(p.l - p.wantL) < 0.1 && Math.abs(p.r - p.wantR) < 0.1),
      `BALANCE to BALANCE TO pans across the section (${panAt.map((p) => `L ${p.l.toFixed(1)} R ${p.r.toFixed(1)}`).join('; ')} dB)`);

    // A stop half way through a fade: the level carries on down through the stop's own fade
    // rather than jumping back to where the fade began.
    const page = await freshPage('gainsweep:stop');
    const r = await page.evaluate(async () => {
      const ctx = new OfflineAudioContext(2, 44100 * 1.2, 44100);
      window.__Tone.setContext(ctx);
      const musicBus = ctx.createGain(); const echoBus = ctx.createGain();
      const songTrim = ctx.createGain(); const master = ctx.createGain();
      musicBus.connect(songTrim); echoBus.connect(songTrim); songTrim.connect(master);
      const mixer = window.__createMixer(ctx, { musicBus, echoBus, songTrim, master, destination: ctx.destination });
      await mixer.ready;
      const osc = ctx.createOscillator(); osc.frequency.value = 330;
      osc.connect(musicBus); osc.start(0);
      const chain = [{ id: 'gain', params: { gain: 0, balance: 0, mono: 0, sweep: 1, gainTo: -48, balanceTo: 0 } }];
      mixer.prepareBarEffects([], 120, { __master: { fx: [{ from: [1, 0], to: [2, 0], chain }] } });
      mixer.scheduleBarEffects('__master', chain, 0.1, { fresh: true, sixteenth: 0.125, since: 0.1, until: 1.1 });
      mixer.releaseBarEffects(0.6, 0.2);
      const L = (await ctx.startRendering()).getChannelData(0);
      const level = (a, b) => {
        let s = 0; for (let i = Math.floor(a * 44100); i < Math.floor(b * 44100); i++) s += L[i] * L[i];
        return Math.sqrt(s / (Math.floor(b * 44100) - Math.floor(a * 44100)));
      };
      const full = level(0.02, 0.08);
      return { before: level(0.5, 0.6) / full, during: level(0.65, 0.75) / full, after: level(0.9, 1.0) / full };
    });
    await page.close();
    const fadeAt = (t) => -48 * (t - 0.1);
    assert(Math.abs(dB(r.before) - fadeAt(0.55)) < 0.6 && Math.abs(dB(r.during) - fadeAt(0.7)) < 0.6 && Math.abs(dB(r.after)) < 0.1,
      `a stop mid-fade carries the fade on through its own fade-out (${dB(r.before).toFixed(1)} then ${dB(r.during).toFixed(1)} dB), and the master is back at full once it has let go (${dB(r.after).toFixed(2)} dB)`);

    // GAIN TO turned half way through — the Spot FX knob — re-aims the rest of the fade from
    // where the new line would be; and a Gain nobody engages (an insert) stays put, with the
    // bottom of its travel silent.
    const livePage = await freshPage('gainsweep:live');
    const lv = await livePage.evaluate(async () => {
      const tone = (ctx, fx) => {
        const o = ctx.createOscillator(); o.frequency.value = 330; o.start(0);
        o.connect(fx.node.input);
      };
      const level = (x, a, b) => {
        let s = 0; for (let i = Math.floor(a * 44100); i < Math.floor(b * 44100); i++) s += x[i] * x[i];
        return Math.sqrt(s / (Math.floor(b * 44100) - Math.floor(a * 44100))) / Math.SQRT1_2;
      };
      const ctx = new OfflineAudioContext(1, 44100 * 2.5, 44100);
      window.__Tone.setContext(ctx);
      const turned = window.__createEffect('gain', { sweep: 1, gain: 0, gainTo: -48 }, ctx, 120);
      tone(ctx, turned); turned.node.output.connect(ctx.destination);
      turned.engage(0, 0.125, 2.0, 0);
      ctx.suspend(1).then(() => { turned.set({ gainTo: -24 }); ctx.resume(); });
      const L = (await ctx.startRendering()).getChannelData(0);
      // An insert with a sweep dialled in (left) and one at the bottom of GAIN (right).
      const ctx2 = new OfflineAudioContext(2, 44100 * 0.5, 44100);
      window.__Tone.setContext(ctx2);
      const merge = ctx2.createChannelMerger(2);
      for (const [params, ch] of [[{ sweep: 1, gain: 0, gainTo: -48 }, 0], [{ gain: -48 }, 1]]) {
        const fx = window.__createEffect('gain', params, ctx2, 120);
        tone(ctx2, fx);
        const split = ctx2.createChannelSplitter(2);
        fx.node.output.connect(split); split.connect(merge, 0, ch);
      }
      merge.connect(ctx2.destination);
      const two = await ctx2.startRendering();
      // From 0.3s: a Gain glides to its setting from unity when it is built, as it always has.
      let floor = 0;
      const right = two.getChannelData(1);
      for (let i = Math.floor(0.3 * 44100); i < right.length; i++) floor = Math.max(floor, Math.abs(right[i]));
      return {
        half: level(L, 1.45, 1.55), end: level(L, 1.9, 1.98),
        insert: level(two.getChannelData(0), 0.2, 0.5), floor,
      };
    });
    await livePage.close();
    // From u = 0.5 the new line runs 0 → -24 dB: -18 at 75%, about -23.5 by the end window.
    assert(Math.abs(dB(lv.half) - -18) < 0.5 && Math.abs(dB(lv.end) - -23.5) < 0.6,
      `GAIN TO turned half way re-aims the rest of the fade (${dB(lv.half).toFixed(1)} dB at 75%, ${dB(lv.end).toFixed(1)} dB at the end)`);
    assert(Math.abs(lv.insert - 1) < 1e-3 && lv.floor < 1e-5,
      `a Gain in an insert slot never sweeps (${dB(lv.insert).toFixed(2)} dB), and the bottom of GAIN's travel is silence (${dB(lv.floor).toFixed(0)} dB)`);
  }
  // ---- 10. every sweep ----------------------------------------------------------------------
  //
  // SWEEP is one mechanism (sectionGlide) behind every card that has it: the catalogue's
  // `sweeps` says which controls glide and where their end values live. Each Tone sweep is
  // read off the node's own schedule; the Advanced Delay, which is ours, is heard; and the
  // Stutter's sweep is a ROLL — the slice steps down, a fresh grab at each step.
  {
    const swept = EFFECTS.filter((d) => d.sweeps);
    const consistent = swept.filter((d) => {
      const starts = Object.keys(d.sweeps);
      const ends = Object.values(d.sweeps);
      return d.params.includes('sweep') && [...starts, ...ends].every((k) => d.params.includes(k) && k in d.defaults);
    });
    assert(consistent.length === swept.length && swept.length >= 8,
      `every card with a sweep carries SWEEP, each control it glides and each end value (${swept.map((d) => d.id).join(', ')})`);
    const hidden = swept.filter((d) => {
      const ends = Object.values(d.sweeps);
      const insert = visibleParams(d, { sweep: 1, slice: 0.25 }, { section: false });
      const off = visibleParams(d, { sweep: 0, slice: 0.25 }, { section: true });
      const on = visibleParams(d, { sweep: 1, slice: 0.25 }, { section: true });
      return !insert.includes('sweep') && !ends.some((k) => insert.includes(k))
        && off.includes('sweep') && !ends.some((k) => off.includes(k))
        && ends.every((k) => on.includes(k));
    });
    assert(hidden.length === swept.length,
      'on every one: nothing in an insert slot, SWEEP alone on a section, its end values with it on');
    const stutterDef = EFFECTS.find((d) => d.id === 'stutter');
    assert(!visibleParams(stutterDef, { slice: 0, sweep: 1 }, { section: true }).includes('sweep'),
      'a Stutter with SLICE Off grabs nothing, so it has no roll to offer');

    // Read off the schedule: a two-second section, engaged at 0. Half way, every control is
    // half way (in a straight line: none of these is a log-scale control); after a stop at
    // 1.0s with a 0.2s fade it carries on to where it had got to, then is back at its start.
    const page = await freshPage('sweeps');
    const read = await page.evaluate(async () => {
      const out = {};
      const cases = [
        ['shifter', { frequency: 0, wet: 1, sweep: 1, frequencyTo: 300, wetTo: 0.5 }, ['frequency', 'wet']],
        ['delay', { feedback: 0.3, wet: 0.2, sweep: 1, feedbackTo: 0.8, wetTo: 0.6 }, ['feedback', 'wet']],
        ['pingpong', { feedback: 0.3, wet: 0.2, sweep: 1, feedbackTo: 0.8, wetTo: 0.6 }, ['feedback', 'wet']],
        ['widener', { width: 0.5, wet: 1, sweep: 1, widthTo: 0 }, ['width']],
      ];
      for (const [id, params, keys] of cases) {
        const ctx = new OfflineAudioContext(2, 44100 * 3, 44100);
        window.__Tone.setContext(ctx);
        const link = window.__createEffect(id, params, ctx, 120);
        link.engage(0, 0.125, 2.0, 0);
        const insert = window.__createEffect(id, params, ctx, 120);
        const stopped = window.__createEffect(id, params, ctx, 120);
        stopped.engage(0, 0.125, 2.0, 0);
        stopped.disengage(1.0, 0.2);
        out[id] = Object.fromEntries(keys.map((k) => [k, {
          curve: [0.001, 1.0, 1.99].map((t) => link.node[k].getValueAtTime(t)),
          insert: insert.node[k].getValueAtTime(1.0),
          stop: [1.2, 1.4].map((t) => stopped.node[k].getValueAtTime(t)),
        }]));
      }
      return out;
    });
    await page.close();
    const ends = {
      shifter: { frequency: [0, 300], wet: [1, 0.5] },
      delay: { feedback: [0.3, 0.8], wet: [0.2, 0.6] },
      pingpong: { feedback: [0.3, 0.8], wet: [0.2, 0.6] },
      widener: { width: [0.5, 0] },
    };
    const close = (got, want, span) => Math.abs(got - want) <= Math.max(1e-3, Math.abs(span) * 0.01);
    for (const [id, keys] of Object.entries(ends)) {
      for (const [k, [a, b]] of Object.entries(keys)) {
        const r = read[id][k];
        const at = (u) => a + (b - a) * u;
        assert(close(r.curve[0], a, b - a) && close(r.curve[1], at(0.5), b - a) && close(r.curve[2], at(0.995), b - a),
          `${id} ${k} glides ${a} → ${b} across its section (${r.curve.map((v) => v.toFixed(3)).join(' → ')})`);
        assert(close(r.insert, a, b - a) && close(r.stop[0], at(0.6), b - a) && close(r.stop[1], a, b - a),
          `${id} ${k}: still in an insert; a stop mid-sweep carries on (${r.stop[0].toFixed(3)} at 1.2s) and then lets go (${r.stop[1].toFixed(3)})`);
      }
    }

    // The Advanced Delay, heard: a burst every quarter second into a 100ms echo whose MIX
    // sweeps 0.1 → 0.9 over two seconds. Each echo is as loud as MIX is when it comes out.
    const cpage = await freshPage('sweeps:chandelay');
    const echoes = await cpage.evaluate(async () => {
      const SR = 44100;
      const ctx = new OfflineAudioContext(2, SR * 2.2, SR);
      window.__Tone.setContext(ctx);
      const buffer = ctx.createBuffer(1, SR * 2.2, SR);
      const x = buffer.getChannelData(0);
      const len = Math.round(0.006 * SR);
      const bursts = [0, 1, 2, 3, 4, 5, 6].map((k) => 0.05 + 0.25 * k);
      for (const tb of bursts) {
        const at = Math.round(tb * SR);
        for (let i = 0; i < len; i++) x[at + i] = 0.3 * Math.sin(2 * Math.PI * 1000 * i / SR) * Math.sin(Math.PI * i / len);
      }
      const src = ctx.createBufferSource(); src.buffer = buffer;
      const fx = window.__createEffect('chandelay', {
        sync: 0, delayMs: 100, feedback: 0, tone: 16000, pan: 0, mix: 0.1, sweep: 1, feedbackTo: 0, mixTo: 0.9,
      }, ctx, 120);
      src.connect(fx.node.input); fx.node.output.connect(ctx.destination); src.start(0);
      fx.engage(0, 0.125, 2.0, 0);
      const L = (await ctx.startRendering()).getChannelData(0);
      return bursts.map((tb) => {
        let e = 0;
        for (let i = Math.round((tb + 0.1) * SR); i < Math.round((tb + 0.1 + 0.012) * SR); i++) e += L[i] * L[i];
        return { t: tb + 0.1, rms: Math.sqrt(e) };
      });
    });
    await cpage.close();
    // From the second echo: a delay glides to its time from zero when it is built, so the
    // first burst's echo is not where its window looks.
    const mixAt = (t) => 0.1 + 0.8 * (t / 2);
    const heard = echoes.slice(1);
    const ratios = heard.map((e) => (e.rms / heard[0].rms) / (mixAt(e.t) / mixAt(heard[0].t)));
    assert(ratios.every((r) => Math.abs(r - 1) < 0.03),
      `the Advanced Delay's MIX sweeps: each echo is as loud as MIX is when it sounds (${ratios.map((r) => r.toFixed(3)).join(', ')} of expected)`);

    // The Stutter ROLL: 1/4 down to 1/32 over two bars, a step every half bar — each step
    // a fresh grab, repeating at its own slice length.
    const notes = rest(); const lens = rest();
    for (let s = 0; s < 32; s++) { notes[s] = 220 * 2 ** ((s % 12) / 12); lens[s] = 1; }
    const chromatic = { bpm: 120, lead: notes, leadLen: lens, order: [{ s: 0, bars: 2 }] };
    const roll = await render('sweeps:roll', { bank: chromatic, arrangement: { automation: { __master: { fx: [{
      from: [1, 0], to: [3, 0],
      chain: [{ id: 'stutter', params: { slice: 1, retrigger: 0, fade: 0, stop: 0, sweep: 1, sliceTo: 0.125 } }],
    }] } } } });
    const steps = [[0, 1], [8, 0.5], [16, 0.25], [24, 0.125]].map(([at16, beats]) => {
      const grab = at16 * SPB;
      const loop = Math.round(beats * 4 * SPB * SR) / SR;
      const count = Math.floor((8 * SPB) / loop) - 1;
      const reps = Array.from({ length: count }, (_, k) => corr(roll, grab + 0.2 * loop, grab + (k + 1) * loop + 0.2 * loop, 0.6 * loop));
      return { beats, worst: Math.min(...reps), count };
    });
    assert(steps.every((st) => st.count >= 1 && st.worst > 0.999),
      `a roll repeats each step's slice for its share of the section (${steps.map((st) => `${st.beats} beat ×${st.count + 1}: ${st.worst.toFixed(4)}`).join('; ')})`);
    assert(corr(roll, 8 * SPB + 0.05 * SPB, 0.05 * SPB, 0.5 * SPB) < 0.9,
      'and each step grabs the music afresh rather than cutting up the last one');
  }

  // ---- 11. a section that switches in a gap between hits, live ------------------------------
  //
  // A LIVE context, because only a live one does this. Chromium stops rendering a chain whose
  // sources have all gone — a drum lane between hits, once a hit's nodes are disconnected —
  // and a switch that is booked while the lane sounds and falls due after it has gone quiet
  // was thrown away: rhythm's clap played its bar-2 ping-pong on every clap after it (7 Oct
  // 2026). Hits are struck as the drum voices strike them, through nodes disconnected when
  // they end, and everything is booked a little ahead, as the sequencer books it — so no hit
  // is waiting on the lane when the section ends, which is what lets it go quiet.
  {
    const page = await freshPage('live gap');
    const r = await page.evaluate(async () => {
      const ctx = new AudioContext();
      await ctx.resume();
      window.__Tone.setContext(ctx);
      // Silent: everything reaches the speakers through a gain of zero.
      const sink = ctx.createGain(); sink.gain.value = 0; sink.connect(ctx.destination);
      const out = ctx.createGain(); out.connect(sink);
      const musicBus = ctx.createGain(); const echoBus = ctx.createGain();
      const songTrim = ctx.createGain(); const master = ctx.createGain();
      musicBus.connect(songTrim); echoBus.connect(songTrim); songTrim.connect(master);
      const mixer = window.__createMixer(ctx, { musicBus, echoBus, songTrim, master, destination: out, metered: false });
      await mixer.ready;
      const REC = `registerProcessor('rec', class extends AudioWorkletProcessor {
        process(i) { if (i[0][0]) this.port.postMessage([currentFrame, i[0][0].slice()]); return true; } });`;
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC], { type: 'application/javascript' })));
      const rec = new AudioWorkletNode(ctx, 'rec', { numberOfOutputs: 0, channelCount: 1, channelCountMode: 'explicit' });
      const blocks = [];
      rec.port.onmessage = (e) => blocks.push(e.data);
      out.connect(rec);

      const chain = [{ id: 'gain', params: { gain: -12 } }];
      mixer.prepareBarEffects([], 120, { hit: { fx: [{ from: [1, 0], to: [2, 0], chain }] } });
      const strip = mixer.lane('hit');
      const sr = ctx.sampleRate;
      const buf = ctx.createBuffer(1, Math.round(0.03 * sr), sr);
      buf.getChannelData(0).forEach((_, i, d) => { d[i] = 0.2 * Math.sin(2 * Math.PI * 1000 * i / sr); });
      const hit = (at) => {
        const src = ctx.createBufferSource(); src.buffer = buf;
        const g = ctx.createGain();
        src.connect(g); g.connect(strip.dry);
        src.onended = () => { src.disconnect(); g.disconnect(); };
        src.start(at);
      };
      const until = async (t) => { while (ctx.currentTime < t) await new Promise((res) => setTimeout(res, 5)); };
      const t0 = ctx.currentTime + 0.3;
      hit(t0);                                                          // A: before the section
      await until(t0 + 0.1);                                            // A is over: the lane is idle
      mixer.scheduleBarEffects('hit', chain, t0 + 0.3, { fresh: true, sixteenth: 0.125 });
      hit(t0 + 0.4);                                                    // B: inside it
      await until(t0 + 0.41);                                           // B is sounding...
      mixer.scheduleBarEffects('hit', [], t0 + 0.6, { sixteenth: 0.125 }); // ...and gone by the end
      await until(t0 + 0.8);                                            // nothing booked across the end
      hit(t0 + 1.0);                                                    // C: after it
      await until(t0 + 1.2);
      const peak = (t) => {
        let p = 0;
        for (const [frame, x] of blocks) {
          for (let i = 0; i < x.length; i++) {
            const s = (frame + i) / sr;
            if (s >= t + 0.005 && s < t + 0.025) p = Math.max(p, Math.abs(x[i]));
          }
        }
        return p;
      };
      const levels = [peak(t0), peak(t0 + 0.4), peak(t0 + 1.0)];
      await ctx.close();
      return levels;
    });
    await page.close();
    const [a, b, c] = r;
    assert(a > 0 && Math.abs(dB(b / a) + 12) < 0.5 && Math.abs(dB(c / a)) < 0.5,
      `live, a section switched on and off in the gaps between a lane's hits takes only the hit inside it (in ${dB(b / a).toFixed(1)} dB, after ${dB(c / a).toFixed(1)} dB)`);
  }
} finally {
  await browser.close();
}

assert(!errors.length, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
if (failed) process.exit(1);
console.log('\nfx sections: all claims hold');
